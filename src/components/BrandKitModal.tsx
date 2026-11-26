import { CloudUpload, Copy, Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { generateTeamCode, serializeBrandKit, validateBrandKit } from "../lib/brandKits";
import type {
  AspectRatioPreset,
  BrandKit,
  FontFamilyOption,
  WatermarkPosition,
  WindowFrameStyle,
} from "../types/studio";

interface BrandKitModalProps {
  open: boolean;
  initialKit: BrandKit | null;
  onClose: () => void;
  onSave: (kit: BrandKit) => void;
  onSyncToCloud: (kit: BrandKit) => Promise<BrandKit>;
}

export function BrandKitModal({
  open,
  initialKit,
  onClose,
  onSave,
  onSyncToCloud,
}: BrandKitModalProps) {
  const [draft, setDraft] = useState<BrandKit>(() =>
    initialKit
      ? { ...initialKit }
      : {
          id: `kit-${Date.now().toString(36)}`,
          name: "My Team Brand Kit",
          teamCode: generateTeamCode(),
          primaryHex: "#0284c7",
          secondaryHex: "#0f172a",
          accentHex: "#38bdf8",
          bgGradientStart: "#0284c7",
          bgGradientEnd: "#1e3a8a",
          bgAngle: 135,
          fontFamily: "Bricolage Grotesque",
          defaultAspectRatio: "16:9",
          defaultPadding: 64,
          borderRadius: 16,
          windowFrame: "macos-dark",
          watermarkText: "yourteam.io",
          watermarkPosition: "bottom-right",
          watermarkOpacity: 0.85,
          updatedAt: new Date().toISOString(),
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleLogoUpload = (file: File) => {
    if (file.size > 320_000) {
      setError("Logo must be under 320KB (PNG, JPG, WebP, or SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((d) => ({ ...d, logoDataUrl: reader.result as string }));
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    try {
      const valid = validateBrandKit(draft);
      onSave(valid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid Brand Kit");
    }
  };

  const handleCloudSync = async () => {
    setError(null);
    setSyncMessage(null);
    setSyncing(true);
    try {
      const withCode = validateBrandKit({
        ...draft,
        teamCode: draft.teamCode || generateTeamCode(),
      });
      const synced = await onSyncToCloud(withCode);
      setDraft(synced);
      onSave(synced);
      const url = `${window.location.origin}/?kit=${synced.teamCode}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      setSyncMessage(`Synced! Teammate invite link copied: ?kit=${synced.teamCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cloud sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportJson = () => {
    try {
      const json = serializeBrandKit(draft);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.framekit.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export JSON");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Team Brand Kit Editor"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Brand Kit editor
            </h2>
            <p className="text-xs text-zinc-500">
              Save your logo, colors, font, and default layout so every screenshot matches.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close brand kit editor"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700">
                Brand Kit name
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700">
                Team sync code
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draft.teamCode ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, teamCode: e.target.value.toUpperCase() })
                  }
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, teamCode: generateTeamCode() })
                  }
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-zinc-600 hover:bg-zinc-100"
                  title="Generate new Team Code"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ["primaryHex", "Primary"],
                ["secondaryHex", "Secondary"],
                ["accentHex", "Accent"],
                ["bgGradientStart", "Bg start"],
                ["bgGradientEnd", "Bg end"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-[11px] text-zinc-600">
                  {label}
                </label>
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white p-1">
                  <input
                    type="color"
                    value={draft[field]}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                    className="h-6 w-6 cursor-pointer rounded bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-zinc-700">
                    {draft[field]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium text-zinc-700">
                Font
              </label>
              <select
                value={draft.fontFamily}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fontFamily: e.target.value as FontFamilyOption,
                  })
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-zinc-900"
              >
                <option value="Bricolage Grotesque">Bricolage Grotesque</option>
                <option value="Figtree">Figtree</option>
                <option value="DM Mono">DM Mono</option>
                <option value="IBM Plex Sans">IBM Plex Sans</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700">
                Default shape
              </label>
              <select
                value={draft.defaultAspectRatio}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultAspectRatio: e.target.value as AspectRatioPreset,
                  })
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-zinc-900"
              >
                <option value="auto">Auto</option>
                <option value="16:9">16:9 (Deck / Blog)</option>
                <option value="4:3">4:3 (Docs)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (LinkedIn / IG)</option>
                <option value="9:16">9:16 (Stories / Mobile)</option>
                <option value="2:1">2:1 (X / OG Card)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700">
                Default window
              </label>
              <select
                value={draft.windowFrame}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    windowFrame: e.target.value as WindowFrameStyle,
                  })
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-zinc-900"
              >
                <option value="macos-dark">macOS Dark</option>
                <option value="macos-light">macOS Light</option>
                <option value="windows-11">Windows 11</option>
                <option value="browser-glass">Browser Bar</option>
                <option value="none">No frame</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800">
                Logo &amp; watermark
              </span>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100">
                  Upload logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                  />
                </label>
                {draft.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, logoDataUrl: undefined })}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            {draft.logoDataUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                <img
                  src={draft.logoDataUrl}
                  alt="Logo preview"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[11px] text-zinc-500">Custom team logo attached</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={draft.watermarkText}
                onChange={(e) =>
                  setDraft({ ...draft, watermarkText: e.target.value })
                }
                placeholder="Watermark text (e.g. acme.io)"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900"
              />
              <select
                value={draft.watermarkPosition}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    watermarkPosition: e.target.value as WatermarkPosition,
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-900"
              >
                <option value="bottom-right">Bottom right pill</option>
                <option value="bottom-left">Bottom left pill</option>
                <option value="top-right">Top right pill</option>
                <option value="footer-bar">Branded footer bar</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {error}
            </div>
          )}
          {syncMessage && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              <span>{syncMessage}</span>
              <Copy className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Download className="h-3.5 w-3.5" /> Export .json
            </button>
            <button
              type="button"
              onClick={() => void handleCloudSync()}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              {syncing ? "Syncing..." : "Sync Team Cloud"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Save &amp; Apply Kit
          </button>
        </div>
      </div>
    </div>
  );
}
