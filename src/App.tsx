import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandKitModal } from "./components/BrandKitModal";
import { CanvasStage, type InteractionMode } from "./components/CanvasStage";
import { CaptureModal } from "./components/CaptureModal";
import { InspectorPanel, type InspectorTab } from "./components/InspectorPanel";
import { ShareViewer } from "./components/ShareViewer";
import { validateBrandKit } from "./lib/brandKits";
import { renderMockupCanvas } from "./lib/canvasRenderer";
import { extractDominantGradient } from "./lib/layoutEngine";
import { scanImageForPrivacy } from "./lib/ocrScanner";
import { getSampleShots, type SampleShot } from "./lib/sampleShots";
import {
  loadSavedBrandKits,
  publishShare,
  pullBrandKitFromCloud,
  saveBrandKits,
  syncBrandKitToCloud,
} from "./lib/storage";
import type {
  AnnotationItem,
  BrandKit,
  CanvasSettings,
  OcrWord,
  RedactionBox,
  RedactionCategory,
} from "./types/studio";

interface EditorSnapshot {
  redactions: RedactionBox[];
  annotations: AnnotationItem[];
}

function detectPlatformLabel(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Windows";
}

function createInitialSettings(kit: BrandKit | null): CanvasSettings {
  return {
    aspectRatio: kit?.defaultAspectRatio ?? "16:9",
    padding: kit?.defaultPadding ?? 64,
    borderRadius: kit?.borderRadius ?? 16,
    shadowIntensity: 72,
    insetBorder: true,
    windowFrame: kit?.windowFrame ?? "macos-dark",
    windowTitle: "Production Billing & API Secrets",
    browserUrl: "https://app.acme-cloud.io/billing",
    background: {
      kind: "mesh",
      gradientStart: kit?.bgGradientStart ?? "#1e1b4b",
      gradientEnd: kit?.bgGradientEnd ?? "#090d16",
      gradientAngle: kit?.bgAngle ?? 135,
      solidColor: "#0f172a",
      meshAccent: kit?.accentHex ?? "#22d3ee",
    },
    redactionStyle: "blur",
    redactionIntensity: 14,
    exportScale: 2,
    headline: "Zero-leak product updates in seconds",
    subheadline: "Auto-redacted & styled with your Team Brand Kit",
    showHeadline: false,
    activeBrandKitId: kit?.id ?? null,
  };
}

export default function App() {
  // Public share route /s/:id
  const shareMatch =
    typeof window !== "undefined"
      ? window.location.pathname.match(/^\/s\/([a-zA-Z0-9_-]{6,40})\/?$/)
      : null;
  if (shareMatch) {
    return <ShareViewer shareId={shareMatch[1]} />;
  }

  return <StudioWorkspace />;
}

function StudioWorkspace() {
  const osLabel = useMemo(() => detectPlatformLabel(), []);
  const samples = useMemo(() => getSampleShots(), []);

  const [brandKits, setBrandKits] = useState<BrandKit[]>(() =>
    loadSavedBrandKits(),
  );
  const [settings, setSettings] = useState<CanvasSettings>(() =>
    createInitialSettings(loadSavedBrandKits()[0] ?? null),
  );

  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const [imageDims, setImageDims] = useState({ width: 960, height: 600 });
  const [sourceDataUrl, setSourceDataUrl] = useState<string>(
    samples[0]?.dataUrl ?? "",
  );
  const [sampleWords, setSampleWords] = useState<OcrWord[] | undefined>(
    samples[0]?.ocrWords,
  );
  const [shotTitle, setShotTitle] = useState<string>(
    samples[0]?.name ?? "Product Mockup",
  );

  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);

  const [enabledCategories, setEnabledCategories] = useState<
    Set<RedactionCategory>
  >(
    () =>
      new Set<RedactionCategory>([
        "api_key",
        "credit_card",
        "email",
        "phone",
        "ip_address",
      ]),
  );

  const [activeTab, setActiveTab] = useState<InspectorTab>("style");
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("select");
  const [activeColor, setActiveColor] = useState<string>("#22d3ee");

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [copiedPng, setCopiedPng] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  const activeBrandKit = useMemo(
    () => brandKits.find((k) => k.id === settings.activeBrandKitId) ?? null,
    [brandKits, settings.activeBrandKitId],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3200);
  }, []);

  // Load image element whenever sourceDataUrl changes
  useEffect(() => {
    if (!sourceDataUrl) return;
    const img = new Image();
    img.onload = () => {
      setActiveImage(img);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = sourceDataUrl;
  }, [sourceDataUrl]);

  // Preload active Brand Kit logo
  useEffect(() => {
    if (!activeBrandKit?.logoDataUrl) {
      setLogoImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = activeBrandKit.logoDataUrl;
  }, [activeBrandKit?.logoDataUrl]);

  // Auto-load ?kit=TEAM-CODE from shared team invite URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kitCode = params.get("kit");
    if (!kitCode) return;
    pullBrandKitFromCloud(kitCode)
      .then((kit) => {
        setBrandKits((prev) => {
          const next = [kit, ...prev.filter((k) => k.teamCode !== kit.teamCode)];
          saveBrandKits(next);
          return next;
        });
        applyBrandKit(kit);
        showToast(`Loaded Team Brand Kit "${kit.name}" (${kit.teamCode})`);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushSnapshot = useCallback(
    (nextRedactions: RedactionBox[], nextAnnotations: AnnotationItem[]) => {
      setHistory((h) => [
        ...h.slice(-24),
        { redactions, annotations },
      ]);
      setRedoStack([]);
      setRedactions(nextRedactions);
      setAnnotations(nextAnnotations);
    },
    [redactions, annotations],
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [...r, { redactions, annotations }]);
      setRedactions(prev.redactions);
      setAnnotations(prev.annotations);
      return h.slice(0, -1);
    });
  }, [redactions, annotations]);

  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setHistory((h) => [...h, { redactions, annotations }]);
      setRedactions(next.redactions);
      setAnnotations(next.annotations);
      return r.slice(0, -1);
    });
  }, [redactions, annotations]);

  const loadCustomImageDataUrl = useCallback(
    (dataUrl: string, title: string, preWords?: OcrWord[]) => {
      setSourceDataUrl(dataUrl);
      setSampleWords(preWords);
      setShotTitle(title);
      setRedactions([]);
      setAnnotations([]);
      setHistory([]);
      setRedoStack([]);
      setLastShareUrl(null);
      setScanStatus("");
    },
    [],
  );

  const handleFileInput = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          loadCustomImageDataUrl(reader.result, file.name.replace(/\.[^.]+$/, ""));
          setCaptureOpen(false);
          showToast(`Loaded ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    },
    [loadCustomImageDataUrl, showToast],
  );

  // Global clipboard paste + keyboard undo/redo
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileInput(file);
            return;
          }
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleFileInput, handleUndo, handleRedo]);

  const handleScreenCapture = async () => {
    setCaptureError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setCaptureError("Screen Capture API is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "window" } as MediaTrackConstraints,
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 180));

      const capCanvas = document.createElement("canvas");
      capCanvas.width = video.videoWidth || 1280;
      capCanvas.height = video.videoHeight || 720;
      const ctx = capCanvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, capCanvas.width, capCanvas.height);

      stream.getTracks().forEach((t) => t.stop());
      const dataUrl = capCanvas.toDataURL("image/png");
      loadCustomImageDataUrl(dataUrl, `Screen Capture (${osLabel})`);
      setCaptureOpen(false);
      showToast("Screen frame captured!");
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Screen capture was cancelled.",
      );
    }
  };

  const applyBrandKit = (kit: BrandKit) => {
    setActiveColor(kit.accentHex);
    setSettings((prev) => ({
      ...prev,
      activeBrandKitId: kit.id,
      aspectRatio: kit.defaultAspectRatio,
      padding: kit.defaultPadding,
      borderRadius: kit.borderRadius,
      windowFrame: kit.windowFrame,
      background: {
        ...prev.background,
        kind: "mesh",
        gradientStart: kit.bgGradientStart,
        gradientEnd: kit.bgGradientEnd,
        gradientAngle: kit.bgAngle,
        meshAccent: kit.accentHex,
      },
    }));
  };

  const handleAutoMatchBackground = () => {
    if (!activeImage) return;
    const tmp = document.createElement("canvas");
    tmp.width = 48;
    tmp.height = 48;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(activeImage, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    const { start, end } = extractDominantGradient(data, 48, 48);
    setSettings((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        kind: "mesh",
        gradientStart: start,
        gradientEnd: end,
      },
    }));
    showToast("Matched canvas gradient to screenshot colors");
  };

  const handleRunAutoRedact = async () => {
    setScanning(true);
    setScanProgress(5);
    setScanStatus("Initializing privacy scan...");
    try {
      const { boxes, usedFallback } = await scanImageForPrivacy({
        imageSource: sourceDataUrl,
        precomputedWords: sampleWords,
        enabledCategories,
        onProgress: (p, s) => {
          setScanProgress(p);
          setScanStatus(s);
        },
      });
      const manualBoxes = redactions.filter((b) => b.source === "manual");
      pushSnapshot([...boxes, ...manualBoxes], annotations);
      if (boxes.length > 0) {
        setScanStatus(`Redacted ${boxes.length} sensitive item(s) locally`);
        showToast(`Protected ${boxes.length} sensitive item(s)`);
      } else if (!usedFallback) {
        setScanStatus("No sensitive patterns found in scan");
      }
    } finally {
      setScanning(false);
    }
  };

  const renderHighResExportCanvas = (): HTMLCanvasElement | null => {
    if (!activeImage) return null;
    const out = document.createElement("canvas");
    renderMockupCanvas({
      canvas: out,
      image: activeImage,
      imageWidth: imageDims.width,
      imageHeight: imageDims.height,
      settings,
      redactions,
      annotations,
      brandKit: activeBrandKit,
      logoImage,
      exportScale: settings.exportScale,
    });
    return out;
  };

  const handleExport = (format: "png" | "webp") => {
    const out = renderHighResExportCanvas();
    if (!out) return;
    const mime = format === "webp" ? "image/webp" : "image/png";
    const url = out.toDataURL(mime, 0.96);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${shotTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${settings.exportScale}x.${format}`;
    a.click();
    showToast(`Exported ${settings.exportScale}× Retina ${format.toUpperCase()}`);
  };

  const handleCopyPng = async () => {
    const out = renderHighResExportCanvas();
    if (!out) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((b) => resolve(b), "image/png"),
      );
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedPng(true);
        setTimeout(() => setCopiedPng(false), 1800);
        showToast("Copied Retina PNG to clipboard");
        return;
      }
    } catch {
      // Fallback below
    }
    handleExport("png");
  };

  const handleCloudShare = async () => {
    const out = renderHighResExportCanvas();
    if (!out) return;
    setSharing(true);
    try {
      // Prefer WebP or 1x/2x PNG within 5MB payload cap
      let dataUrl = out.toDataURL("image/png");
      if (dataUrl.length > 4_800_000) {
        dataUrl = out.toDataURL("image/webp", 0.92);
      }
      const res = await publishShare({
        title: shotTitle,
        width: out.width,
        height: out.height,
        brandKitName: activeBrandKit?.name,
        redactedCount: redactions.filter((r) => r.enabled).length,
        imageDataUrl: dataUrl,
      });
      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      setLastShareUrl(fullUrl);
      await navigator.clipboard?.writeText(fullUrl).catch(() => {});
      showToast("Cloud share link created & copied!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-slate-100">
      {/* Top Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0e121b] px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="FrameKit" className="h-7 w-7 rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  FrameKit
                </span>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  {osLabel} Parity
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCaptureOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            New Capture
          </button>

          <select
            aria-label="Sample screenshot"
            value={samples.find((s) => s.dataUrl === sourceDataUrl)?.id ?? ""}
            onChange={(e) => {
              const found = samples.find((s) => s.id === e.target.value);
              if (found) {
                loadCustomImageDataUrl(found.dataUrl, found.name, found.ocrWords);
              }
            }}
            className="hidden rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-slate-300 md:block"
          >
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                Sample: {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Action Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("privacy");
              handleRunAutoRedact();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {redactions.some((r) => r.enabled) ? "Re-Scan Privacy" : "Auto-Redact"}
          </button>

          <select
            aria-label="Retina export scale"
            value={settings.exportScale}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                exportScale: Number(e.target.value) as 1 | 2 | 3,
              }))
            }
            className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-slate-200"
          >
            <option value={1}>1× Standard</option>
            <option value={2}>2× Retina</option>
            <option value={3}>3× Ultra</option>
          </select>

          <button
            type="button"
            onClick={handleCopyPng}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            {copiedPng ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy
          </button>

          <button
            type="button"
            onClick={() => handleExport("png")}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Export PNG
          </button>

          <button
            type="button"
            onClick={handleCloudShare}
            disabled={sharing}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-60"
          >
            <Share2 className="h-3.5 w-3.5" />
            {sharing ? "Sharing..." : "Share Link"}
          </button>
        </div>
      </header>

      {/* Share Link Banner */}
      {lastShareUrl && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/30 bg-indigo-500/15 px-5 py-2 text-xs text-indigo-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>Live Cloud Share URL ready (copied to clipboard):</span>
            <a
              href={lastShareUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline hover:text-white"
            >
              {lastShareUrl}
            </a>
          </div>
          <a
            href={lastShareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-semibold text-cyan-300 hover:underline"
          >
            Open Share Page <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Main Studio Body */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <CanvasStage
          image={activeImage}
          imageWidth={imageDims.width}
          imageHeight={imageDims.height}
          settings={settings}
          redactions={redactions}
          annotations={annotations}
          brandKit={activeBrandKit}
          logoImage={logoImage}
          interactionMode={interactionMode}
          activeColor={activeColor}
          strokeWidth={3}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddManualRedaction={(box) => {
            const created: RedactionBox = {
              ...box,
              id: `manual-${Date.now().toString(36)}`,
            };
            pushSnapshot([...redactions, created], annotations);
            setInteractionMode("select");
          }}
          onAddAnnotation={(item) => {
            const created: AnnotationItem = {
              ...item,
              id: `ann-${Date.now().toString(36)}`,
            };
            pushSnapshot(redactions, [...annotations, created]);
          }}
          onDropFile={handleFileInput}
          onCanvasReady={(c) => {
            previewCanvasRef.current = c;
          }}
        />

        <InspectorPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          settings={settings}
          onUpdateSettings={(patch) =>
            setSettings((prev) => ({ ...prev, ...patch }))
          }
          onAutoMatchBackground={handleAutoMatchBackground}
          redactions={redactions}
          enabledCategories={enabledCategories}
          onToggleCategory={(cat) =>
            setEnabledCategories((prev) => {
              const next = new Set(prev);
              if (next.has(cat)) next.delete(cat);
              else next.add(cat);
              return next;
            })
          }
          scanning={scanning}
          scanProgress={scanProgress}
          scanStatus={scanStatus}
          onRunAutoRedact={handleRunAutoRedact}
          onToggleRedactionBox={(id) =>
            pushSnapshot(
              redactions.map((b) =>
                b.id === id ? { ...b, enabled: !b.enabled } : b,
              ),
              annotations,
            )
          }
          onDeleteRedactionBox={(id) =>
            pushSnapshot(
              redactions.filter((b) => b.id !== id),
              annotations,
            )
          }
          onClearRedactions={() => pushSnapshot([], annotations)}
          interactionMode={interactionMode}
          onChangeMode={setInteractionMode}
          activeColor={activeColor}
          onChangeColor={setActiveColor}
          annotations={annotations}
          onDeleteAnnotation={(id) =>
            pushSnapshot(
              redactions,
              annotations.filter((a) => a.id !== id),
            )
          }
          onClearAnnotations={() => pushSnapshot(redactions, [])}
          brandKits={brandKits}
          activeBrandKit={activeBrandKit}
          onApplyBrandKit={(kit) => {
            applyBrandKit(kit);
            showToast(`Applied Brand Kit "${kit.name}"`);
          }}
          onCreateBrandKit={() => {
            setEditingKit(null);
            setKitModalOpen(true);
          }}
          onEditBrandKit={(kit) => {
            setEditingKit(kit);
            setKitModalOpen(true);
          }}
          onImportBrandKitJson={(jsonText) => {
            try {
              const parsed = validateBrandKit(JSON.parse(jsonText));
              setBrandKits((prev) => {
                const next = [parsed, ...prev.filter((k) => k.id !== parsed.id)];
                saveBrandKits(next);
                return next;
              });
              applyBrandKit(parsed);
              showToast(`Imported Brand Kit "${parsed.name}"`);
            } catch (err) {
              showToast(
                err instanceof Error ? err.message : "Invalid Brand Kit JSON",
              );
            }
          }}
          onPullTeamKit={async (code) => {
            const kit = await pullBrandKitFromCloud(code);
            setBrandKits((prev) => {
              const next = [
                kit,
                ...prev.filter((k) => k.teamCode !== kit.teamCode),
              ];
              saveBrandKits(next);
              return next;
            });
            applyBrandKit(kit);
            showToast(`Synced Team Brand Kit "${kit.name}"`);
          }}
        />
      </div>

      {/* Modals */}
      <CaptureModal
        open={captureOpen}
        samples={samples}
        osLabel={osLabel}
        onClose={() => setCaptureOpen(false)}
        onSelectSample={(sample: SampleShot) =>
          loadCustomImageDataUrl(sample.dataUrl, sample.name, sample.ocrWords)
        }
        onUploadFile={handleFileInput}
        onScreenCapture={handleScreenCapture}
        captureError={captureError}
      />

      {kitModalOpen && (
        <BrandKitModal
          open={kitModalOpen}
          initialKit={editingKit}
          onClose={() => setKitModalOpen(false)}
          onSave={(saved) => {
            setBrandKits((prev) => {
              const exists = prev.some((k) => k.id === saved.id);
              const next = exists
                ? prev.map((k) => (k.id === saved.id ? saved : k))
                : [saved, ...prev];
              saveBrandKits(next);
              return next;
            });
            applyBrandKit(saved);
            showToast(`Saved Brand Kit "${saved.name}"`);
          }}
          onSyncToCloud={syncBrandKitToCloud}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-[#181e2c] px-4 py-2 text-xs font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
