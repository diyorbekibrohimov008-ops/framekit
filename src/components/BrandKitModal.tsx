import { CloudUpload, Copy, Download, RefreshCw, X } from "lucide-react";
import { useState } from "react";
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
          primaryHex: "#6366f1",
          secondaryHex: "#0f172a",
          accentHex: "#22d3ee",
          bgGradientStart: "#312e81",
          bgGradientEnd: "#0f172a",
          bgAngle: 135,
          fontFamily: "Plus Jakarta Sans",
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
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export JSON");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Team Brand Kit Editor"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Team Brand Kit Studio
            </h2>
            <p className="text-xs text-slate-400">
              Lock company logos, hex palettes, fonts & aspect ratios for every team member
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Brand Kit Name
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Team Sync Code
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draft.teamCode ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, teamCode: e.target.value.toUpperCase() })
                  }
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, teamCode: generateTeamCode() })
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 text-slate-300 hover:bg-white/10"
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
                ["bgGradientStart", "Bg Start"],
                ["bgGradientEnd", "Bg End"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-[11px] text-slate-400">
                  {label}
                </label>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 p-1">
                  <input
                    type="color"
                    value={draft[field]}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                    className="h-6 w-6 cursor-pointer rounded bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-slate-300">
                    {draft[field]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Typography
              </label>
              <select
                value={draft.fontFamily}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fontFamily: e.target.value as FontFamilyOption,
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-[#0b0e16] px-2.5 py-2 text-white"
              >
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Inter">Inter</option>
                <option value="Space Grotesk">Space Grotesk</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Preset Aspect Ratio
              </label>
              <select
                value={draft.defaultAspectRatio}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultAspectRatio: e.target.value as AspectRatioPreset,
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-[#0b0e16] px-2.5 py-2 text-white"
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
              <label className="mb-1 block font-medium text-slate-300">
                Default Window
              </label>
              <select
                value={draft.windowFrame}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    windowFrame: e.target.value as WindowFrameStyle,
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-[#0b0e16] px-2.5 py-2 text-white"
              >
                <option value="macos-dark">macOS Dark</option>
                <option value="macos-light">macOS Light</option>
                <option value="windows-11">Windows 11</option>
                <option value="browser-glass">Browser Bar</option>
                <option value="none">Frameless</option>
              </select>
            </div>
          </div>

          {/* Watermark & Logo */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Company Logo & Watermark
              </span>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/15">
                  Upload Logo
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
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            {draft.logoDataUrl && (
              <div className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
                <img
                  src={draft.logoDataUrl}
                  alt="Logo preview"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[11px] text-slate-400">Custom team logo attached</span>
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
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-white"
              />
              <select
                value={draft.watermarkPosition}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    watermarkPosition: e.target.value as WatermarkPosition,
                  })
                }
                className="rounded-lg border border-white/10 bg-[#0b0e16] px-2.5 py-1.5 text-white"
              >
                <option value="bottom-right">Bottom Right Pill</option>
                <option value="bottom-left">Bottom Left Pill</option>
                <option value="top-right">Top Right Pill</option>
                <option value="footer-bar">Branded Footer Bar</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-200">
              {error}
            </div>
          )}
          {syncMessage && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
              <span>{syncMessage}</span>
              <Copy className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" /> Export .json
            </button>
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              {syncing ? "Syncing..." : "Sync Team Cloud"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Save & Apply Kit
          </button>
        </div>
      </div>
    </div>
  );
}
