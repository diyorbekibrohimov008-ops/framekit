import {
  ArrowUpRight,
  Check,
  Download,
  Eye,
  EyeOff,
  Hash,
  Layers,
  MousePointer,
  Palette,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import type { InteractionMode } from "./CanvasStage";
import type {
  AnnotationItem,
  AspectRatioPreset,
  BrandKit,
  CanvasSettings,
  RedactionBox,
  RedactionCategory,
  RedactionStyle,
  WindowFrameStyle,
} from "../types/studio";

export type InspectorTab = "style" | "privacy" | "annotate" | "brand-kits";

interface InspectorPanelProps {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  settings: CanvasSettings;
  onUpdateSettings: (patch: Partial<CanvasSettings>) => void;
  onAutoMatchBackground: () => void;
  // Privacy
  redactions: RedactionBox[];
  enabledCategories: Set<RedactionCategory>;
  onToggleCategory: (cat: RedactionCategory) => void;
  scanning: boolean;
  scanProgress: number;
  scanStatus: string;
  onRunAutoRedact: () => void;
  onToggleRedactionBox: (id: string) => void;
  onDeleteRedactionBox: (id: string) => void;
  onClearRedactions: () => void;
  // Annotations
  interactionMode: InteractionMode;
  onChangeMode: (mode: InteractionMode) => void;
  activeColor: string;
  onChangeColor: (hex: string) => void;
  annotations: AnnotationItem[];
  onDeleteAnnotation: (id: string) => void;
  onClearAnnotations: () => void;
  // Brand Kits
  brandKits: BrandKit[];
  activeBrandKit: BrandKit | null;
  onApplyBrandKit: (kit: BrandKit) => void;
  onCreateBrandKit: () => void;
  onEditBrandKit: (kit: BrandKit) => void;
  onImportBrandKitJson: (jsonText: string) => void;
  onPullTeamKit: (code: string) => Promise<void>;
}

const PRESET_GRADIENTS = [
  { name: "Aurora", start: "#0d9488", end: "#0284c7", angle: 135, accent: "#2dd4bf" },
  { name: "Obsidian", start: "#134e4a", end: "#090d16", angle: 145, accent: "#14b8a6" },
  { name: "Sunset", start: "#db2777", end: "#f97316", angle: 130, accent: "#fbbf24" },
  { name: "Emerald", start: "#065f46", end: "#0f172a", angle: 140, accent: "#34d399" },
  { name: "Nord", start: "#3b82f6", end: "#1e293b", angle: 135, accent: "#60a5fa" },
  { name: "Rose", start: "#be185d", end: "#881337", angle: 125, accent: "#f472b6" },
];

const ASPECT_RATIOS: { id: AspectRatioPreset; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "16:9", label: "16:9" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "1:1" },
  { id: "4:5", label: "4:5" },
  { id: "9:16", label: "9:16" },
  { id: "2:1", label: "2:1" },
];

const WINDOW_FRAMES: { id: WindowFrameStyle; label: string }[] = [
  { id: "macos-dark", label: "macOS Dark" },
  { id: "macos-light", label: "macOS Light" },
  { id: "windows-11", label: "Windows 11" },
  { id: "browser-glass", label: "Browser Bar" },
  { id: "none", label: "Frameless" },
];

const CATEGORY_INFO: { id: RedactionCategory; label: string }[] = [
  { id: "api_key", label: "API Keys & Tokens" },
  { id: "credit_card", label: "Credit Cards (Luhn)" },
  { id: "email", label: "Email Addresses" },
  { id: "phone", label: "Phone Numbers" },
  { id: "ip_address", label: "IPv4 Addresses" },
];

export function InspectorPanel({
  activeTab,
  onTabChange,
  settings,
  onUpdateSettings,
  onAutoMatchBackground,
  redactions,
  enabledCategories,
  onToggleCategory,
  scanning,
  scanProgress,
  scanStatus,
  onRunAutoRedact,
  onToggleRedactionBox,
  onDeleteRedactionBox,
  onClearRedactions,
  interactionMode,
  onChangeMode,
  activeColor,
  onChangeColor,
  annotations,
  onDeleteAnnotation,
  onClearAnnotations,
  brandKits,
  activeBrandKit,
  onApplyBrandKit,
  onCreateBrandKit,
  onEditBrandKit,
  onImportBrandKitJson,
  onPullTeamKit,
}: InspectorPanelProps) {
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [pullError, setPullError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  const handlePull = async () => {
    if (!teamCodeInput.trim()) return;
    setPulling(true);
    setPullError(null);
    try {
      await onPullTeamKit(teamCodeInput.trim());
      setTeamCodeInput("");
    } catch (err) {
      setPullError(err instanceof Error ? err.message : "Could not load team kit");
    } finally {
      setPulling(false);
    }
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-white/10 bg-[#0e121b] lg:w-[360px] lg:border-l lg:border-t-0">
      {/* Tab switcher */}
      <div className="grid grid-cols-4 gap-1 border-b border-white/10 p-2">
        {(
          [
            { id: "style", label: "Style", icon: Layers },
            { id: "privacy", label: "Privacy", icon: ShieldCheck },
            { id: "annotate", label: "Annotate", icon: ArrowUpRight },
            { id: "brand-kits", label: "Brand Kits", icon: Palette },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "style" && (
          <div className="space-y-5">
            {/* Aspect Ratio */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Aspect Ratio
                </label>
                <span className="text-[11px] text-slate-500">Auto-balanced</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => onUpdateSettings({ aspectRatio: ar.id })}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${
                      settings.aspectRatio === ar.id
                        ? "bg-teal-600 text-white"
                        : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Background */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Canvas Background
                </label>
                <button
                  type="button"
                  onClick={onAutoMatchBackground}
                  className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-cyan-300 transition hover:bg-white/10"
                >
                  <Wand2 className="h-3 w-3" /> Auto-Match
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_GRADIENTS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        background: {
                          ...settings.background,
                          kind: "mesh",
                          gradientStart: g.start,
                          gradientEnd: g.end,
                          gradientAngle: g.angle,
                          meshAccent: g.accent,
                        },
                      })
                    }
                    title={g.name}
                    style={{
                      background: `linear-gradient(${g.angle}deg, ${g.start}, ${g.end})`,
                    }}
                    className="h-9 rounded-lg border border-white/15 transition hover:scale-105"
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      background: { ...settings.background, kind: "solid", solidColor: "#0f172a" },
                    })
                  }
                  className="h-9 rounded-lg border border-white/15 bg-[#0f172a] text-[10px] font-medium text-slate-300"
                >
                  Solid
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      background: { ...settings.background, kind: "transparent" },
                    })
                  }
                  className="checkerboard-bg h-9 rounded-lg border border-white/15 text-[10px] font-semibold text-white"
                >
                  Alpha
                </button>
              </div>
              {settings.background.kind !== "transparent" && (
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Gradient start color"
                    value={settings.background.gradientStart}
                    onChange={(e) =>
                      onUpdateSettings({
                        background: {
                          ...settings.background,
                          gradientStart: e.target.value,
                        },
                      })
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                  <input
                    type="color"
                    aria-label="Gradient end color"
                    value={settings.background.gradientEnd}
                    onChange={(e) =>
                      onUpdateSettings({
                        background: {
                          ...settings.background,
                          gradientEnd: e.target.value,
                        },
                      })
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={settings.background.gradientAngle}
                    onChange={(e) =>
                      onUpdateSettings({
                        background: {
                          ...settings.background,
                          gradientAngle: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 accent-teal-500"
                  />
                </div>
              )}
            </section>

            {/* Window Frame */}
            <section>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Window Chrome
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {WINDOW_FRAMES.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => onUpdateSettings({ windowFrame: wf.id })}
                    className={`rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      settings.windowFrame === wf.id
                        ? "bg-teal-600 text-white"
                        : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {wf.label}
                  </button>
                ))}
              </div>
              {settings.windowFrame === "browser-glass" && (
                <input
                  type="text"
                  value={settings.browserUrl}
                  onChange={(e) =>
                    onUpdateSettings({ browserUrl: e.target.value })
                  }
                  placeholder="https://app.yourcompany.com"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              )}
              {(settings.windowFrame === "macos-dark" ||
                settings.windowFrame === "macos-light" ||
                settings.windowFrame === "windows-11") && (
                <input
                  type="text"
                  value={settings.windowTitle}
                  onChange={(e) =>
                    onUpdateSettings({ windowTitle: e.target.value })
                  }
                  placeholder="Window title..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
              )}
            </section>

            {/* Spacing & Polish Sliders */}
            <section className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Balanced Padding</span>
                  <span className="font-mono text-slate-400">{settings.padding}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={140}
                  value={settings.padding}
                  onChange={(e) =>
                    onUpdateSettings({ padding: Number(e.target.value) })
                  }
                  className="mt-1 w-full accent-teal-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Corner Radius</span>
                  <span className="font-mono text-slate-400">{settings.borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={36}
                  value={settings.borderRadius}
                  onChange={(e) =>
                    onUpdateSettings({ borderRadius: Number(e.target.value) })
                  }
                  className="mt-1 w-full accent-teal-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Ambient Shadow</span>
                  <span className="font-mono text-slate-400">{settings.shadowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.shadowIntensity}
                  onChange={(e) =>
                    onUpdateSettings({ shadowIntensity: Number(e.target.value) })
                  }
                  className="mt-1 w-full accent-teal-500"
                />
              </div>
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                <span>Marketing Header Caption</span>
                <input
                  type="checkbox"
                  checked={settings.showHeadline}
                  onChange={(e) =>
                    onUpdateSettings({ showHeadline: e.target.checked })
                  }
                  className="accent-teal-500"
                />
              </label>
              {settings.showHeadline && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={settings.headline}
                    onChange={(e) =>
                      onUpdateSettings({ headline: e.target.value })
                    }
                    placeholder="Headline text..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.subheadline}
                    onChange={(e) =>
                      onUpdateSettings({ subheadline: e.target.value })
                    }
                    placeholder="Subheadline text..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300"
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-emerald-200">
                    100% On-Device Privacy Shield
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-200/75">
                    Scans credit cards, emails, phones, and API tokens locally in your browser before exporting or sharing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onRunAutoRedact}
                disabled={scanning}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg transition hover:bg-emerald-400 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {scanning
                  ? `Scanning (${scanProgress}%)...`
                  : "Auto-Redact Secrets (1-Click)"}
              </button>
              {scanStatus && (
                <div className="mt-2 text-center text-[11px] text-emerald-300/90">
                  {scanStatus}
                </div>
              )}
            </div>

            {/* Redaction Style */}
            <section>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Redaction Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "blur", label: "Blur" },
                    { id: "pixelate", label: "Pixelate" },
                    { id: "solid", label: "Solid Bar" },
                  ] as { id: RedactionStyle; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateSettings({ redactionStyle: st.id })}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${
                      settings.redactionStyle === st.id
                        ? "bg-teal-600 text-white"
                        : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              {settings.redactionStyle !== "solid" && (
                <div className="mt-2.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Redaction Strength</span>
                    <span>{settings.redactionIntensity}px</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={28}
                    value={settings.redactionIntensity}
                    onChange={(e) =>
                      onUpdateSettings({
                        redactionIntensity: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full accent-emerald-500"
                  />
                </div>
              )}
            </section>

            {/* Detectors */}
            <section>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sensitive Pattern Detectors
              </label>
              <div className="space-y-1.5">
                {CATEGORY_INFO.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.05]"
                  >
                    <span>{cat.label}</span>
                    <input
                      type="checkbox"
                      checked={enabledCategories.has(cat.id)}
                      onChange={() => onToggleCategory(cat.id)}
                      className="accent-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* Manual Draw Trigger */}
            <button
              type="button"
              onClick={() =>
                onChangeMode(
                  interactionMode === "manual-blur" ? "select" : "manual-blur",
                )
              }
              className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                interactionMode === "manual-blur"
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              {interactionMode === "manual-blur"
                ? "Drawing Manual Blur (Click to Exit)"
                : "Draw Manual Redaction Box"}
            </button>

            {/* Findings List */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Detected Regions ({redactions.length})
                </span>
                {redactions.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRedactions}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {redactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                  Click Auto-Redact Secrets or draw a manual box on the screenshot.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {redactions.map((box) => (
                    <div
                      key={box.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200">
                          {box.label}
                        </div>
                        {box.maskedPreview && (
                          <div className="truncate font-mono text-[11px] text-slate-400">
                            {box.maskedPreview}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleRedactionBox(box.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          title={box.enabled ? "Disable redaction" : "Enable redaction"}
                        >
                          {box.enabled ? (
                            <Eye className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRedactionBox(box.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-400"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "annotate" && (
          <div className="space-y-4">
            <section>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Canvas Tools
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "select", label: "Pointer", icon: MousePointer },
                    { id: "arrow", label: "Arrow", icon: ArrowUpRight },
                    { id: "rect", label: "Highlight", icon: Square },
                    { id: "badge", label: "Step 1·2·3", icon: Hash },
                    { id: "text", label: "Callout Pill", icon: Type },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeMode(id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                      interactionMode === id
                        ? "bg-teal-600 text-white"
                        : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Annotation Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  activeBrandKit?.accentHex ?? "#22d3ee",
                  "#0d9488",
                  "#f43f5e",
                  "#f59e0b",
                  "#10b981",
                  "#ffffff",
                ].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChangeColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      activeColor === hex
                        ? "scale-110 border-white"
                        : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Items ({annotations.length})
                </span>
                {annotations.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAnnotations}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {annotations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                  Select Arrow, Highlight, Step Badge, or Callout Pill and click/drag on the mockup.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {annotations.map((ann, i) => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                    >
                      <span className="capitalize text-slate-200">
                        #{i + 1} {ann.kind}
                        {ann.text ? `: ${ann.text}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnotation(ann.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "brand-kits" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-2.5 text-xs">
              <div>
                <div className="text-[11px] text-teal-300">Active Brand Kit</div>
                <div className="font-semibold text-white">
                  Active: {activeBrandKit ? activeBrandKit.name : "Custom"}
                </div>
              </div>
              <button
                type="button"
                onClick={onCreateBrandKit}
                className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
              >
                <Plus className="h-3.5 w-3.5" /> New Kit
              </button>
            </div>

            {/* Pull by Team Code */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Join Team Brand Kit
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={teamCodeInput}
                  onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Team Code (e.g. NRTH-4040)"
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-xs text-white focus:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                />
                <button
                  type="button"
                  onClick={handlePull}
                  disabled={pulling}
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                >
                  <Download className="h-3.5 w-3.5" />
                  {pulling ? "..." : "Sync"}
                </button>
              </div>
              {pullError && (
                <p className="mt-1.5 text-[11px] text-rose-400">{pullError}</p>
              )}
              <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-1.5 text-[11px] text-slate-300 hover:border-white/30">
                <Upload className="h-3 w-3" /> Import Brand Kit .json
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    onImportBrandKitJson(text);
                  }}
                />
              </label>
            </div>

            {/* Kit Cards */}
            <div className="space-y-2.5">
              {brandKits.map((kit) => {
                const isActive = activeBrandKit?.id === kit.id;
                return (
                  <div
                    key={kit.id}
                    className={`rounded-xl border p-3 transition ${
                      isActive
                        ? "border-teal-500 bg-teal-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 shrink-0 rounded-lg border border-white/20"
                          style={{
                            background: `linear-gradient(${kit.bgAngle}deg, ${kit.bgGradientStart}, ${kit.bgGradientEnd})`,
                          }}
                        />
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {kit.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {kit.defaultAspectRatio} • {kit.fontFamily}
                            {kit.teamCode ? ` • ${kit.teamCode}` : ""}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditBrandKit(kit)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {[kit.primaryHex, kit.secondaryHex, kit.accentHex].map(
                          (c, idx) => (
                            <span
                              key={idx}
                              style={{ backgroundColor: c }}
                              className="h-3.5 w-3.5 rounded-full border border-white/20"
                              title={c}
                            />
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyBrandKit(kit)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          isActive
                            ? "bg-teal-600 text-white"
                            : "bg-white/10 text-slate-200 hover:bg-teal-600 hover:text-white"
                        }`}
                      >
                        {isActive && <Check className="h-3 w-3" />}
                        Apply {kit.name.split(" ")[0]}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
