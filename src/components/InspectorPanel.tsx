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
  interactionMode: InteractionMode;
  onChangeMode: (mode: InteractionMode) => void;
  activeColor: string;
  onChangeColor: (hex: string) => void;
  annotations: AnnotationItem[];
  onDeleteAnnotation: (id: string) => void;
  onClearAnnotations: () => void;
  brandKits: BrandKit[];
  activeBrandKit: BrandKit | null;
  onApplyBrandKit: (kit: BrandKit) => void;
  onCreateBrandKit: () => void;
  onEditBrandKit: (kit: BrandKit) => void;
  onImportBrandKitJson: (jsonText: string) => void;
  onPullTeamKit: (code: string) => Promise<void>;
}

const PRESET_GRADIENTS = [
  { name: "Sky", start: "#0284c7", end: "#1e3a8a", angle: 135, accent: "#38bdf8" },
  { name: "Slate", start: "#334155", end: "#0f172a", angle: 145, accent: "#94a3b8" },
  { name: "Sunset", start: "#db2777", end: "#f97316", angle: 130, accent: "#fbbf24" },
  { name: "Forest", start: "#059669", end: "#064e3b", angle: 140, accent: "#34d399" },
  { name: "Indigo", start: "#4f46e5", end: "#1e1b4b", angle: 135, accent: "#818cf8" },
  { name: "Sand", start: "#d97706", end: "#78350f", angle: 125, accent: "#fcd34d" },
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
  { id: "none", label: "No frame" },
];

const CATEGORY_INFO: { id: RedactionCategory; label: string }[] = [
  { id: "api_key", label: "API keys & passwords" },
  { id: "credit_card", label: "Credit card numbers" },
  { id: "email", label: "Email addresses" },
  { id: "phone", label: "Phone numbers" },
  { id: "ip_address", label: "IP addresses" },
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
    <aside className="flex w-full shrink-0 flex-col border-t border-zinc-200/90 bg-white lg:w-[356px] lg:border-l lg:border-t-0">
      {/* Tab switcher */}
      <div className="grid grid-cols-4 gap-1 border-b border-zinc-200/90 bg-zinc-50/70 p-2">
        {(
          [
            { id: "style", label: "Style", icon: Layers },
            { id: "privacy", label: "Privacy", icon: ShieldCheck },
            { id: "annotate", label: "Markup", icon: ArrowUpRight },
            { id: "brand-kits", label: "Brand Kits", icon: Palette },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                active
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
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
                <label className="text-xs font-semibold text-zinc-800">
                  Canvas shape
                </label>
                <span className="text-[11px] text-zinc-400">Auto-centered</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => onUpdateSettings({ aspectRatio: ar.id })}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${
                      settings.aspectRatio === ar.id
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
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
                <label className="text-xs font-semibold text-zinc-800">
                  Background color
                </label>
                <button
                  type="button"
                  onClick={onAutoMatchBackground}
                  className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition hover:bg-sky-100"
                >
                  <Wand2 className="h-3 w-3" /> Auto-match
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
                    className="h-9 rounded-lg border border-black/10 transition hover:scale-[1.03]"
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      background: { ...settings.background, kind: "solid", solidColor: "#0f172a" },
                    })
                  }
                  className="h-9 rounded-lg border border-zinc-300 bg-[#0f172a] text-[10px] font-semibold text-white"
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
                  className="checkerboard-bg h-9 rounded-lg border border-zinc-300 text-[10px] font-semibold text-zinc-800"
                >
                  None
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
                    className="h-8 w-10 cursor-pointer rounded border border-zinc-300 bg-white"
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
                    className="h-8 w-10 cursor-pointer rounded border border-zinc-300 bg-white"
                  />
                  <input
                    type="range"
                    aria-label="Gradient angle"
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
                    className="flex-1 accent-sky-600"
                  />
                </div>
              )}
            </section>

            {/* Window Frame */}
            <section>
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                Window frame
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {WINDOW_FRAMES.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => onUpdateSettings({ windowFrame: wf.id })}
                    className={`rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      settings.windowFrame === wf.id
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
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
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900"
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
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900"
                />
              )}
            </section>

            {/* Collapsible fine-tuning sliders */}
            <details className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-zinc-700 hover:text-zinc-900">
                Fine-tune spacing, corners &amp; caption
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-zinc-700">
                    <span>Outer padding</span>
                    <span className="font-mono text-zinc-500 tabular-nums">{settings.padding}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={140}
                    value={settings.padding}
                    onChange={(e) =>
                      onUpdateSettings({ padding: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-sky-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-700">
                    <span>Corner roundness</span>
                    <span className="font-mono text-zinc-500 tabular-nums">{settings.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={36}
                    value={settings.borderRadius}
                    onChange={(e) =>
                      onUpdateSettings({ borderRadius: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-sky-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-700">
                    <span>Drop shadow</span>
                    <span className="font-mono text-zinc-500 tabular-nums">{settings.shadowIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.shadowIntensity}
                    onChange={(e) =>
                      onUpdateSettings({ shadowIntensity: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-sky-600"
                  />
                </div>
                <label className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
                  <span>Show header caption</span>
                  <input
                    type="checkbox"
                    checked={settings.showHeadline}
                    onChange={(e) =>
                      onUpdateSettings({ showHeadline: e.target.checked })
                    }
                    className="accent-sky-600"
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
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900"
                    />
                    <input
                      type="text"
                      value={settings.subheadline}
                      onChange={(e) =>
                        onUpdateSettings({ subheadline: e.target.value })
                      }
                      placeholder="Subtitle text..."
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700"
                    />
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <div className="text-xs font-semibold text-emerald-950">
                    Runs 100% on your computer
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-900/80">
                    Finds credit cards, emails, phone numbers, and API keys locally before you save or share.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onRunAutoRedact}
                disabled={scanning}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {scanning
                  ? `Scanning (${scanProgress}%)...`
                  : "Auto-Redact Secrets"}
              </button>
              {scanStatus && (
                <div className="mt-2 text-center text-[11px] font-medium text-emerald-800">
                  {scanStatus}
                </div>
              )}
            </div>

            {/* Redaction Style */}
            <section>
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                Hide style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "blur", label: "Blur" },
                    { id: "pixelate", label: "Pixelate" },
                    { id: "solid", label: "Solid bar" },
                  ] as { id: RedactionStyle; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateSettings({ redactionStyle: st.id })}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${
                      settings.redactionStyle === st.id
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              {settings.redactionStyle !== "solid" && (
                <div className="mt-2.5">
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>Blur strength</span>
                    <span className="font-mono tabular-nums">{settings.redactionIntensity}px</span>
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
                    className="mt-1 w-full accent-emerald-700"
                  />
                </div>
              )}
            </section>

            {/* Detectors */}
            <section>
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                What to detect automatically
              </label>
              <div className="space-y-1.5">
                {CATEGORY_INFO.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    <span>{cat.label}</span>
                    <input
                      type="checkbox"
                      checked={enabledCategories.has(cat.id)}
                      onChange={() => onToggleCategory(cat.id)}
                      className="accent-emerald-700"
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
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                interactionMode === "manual-blur"
                  ? "border-sky-500 bg-sky-50 text-sky-800"
                  : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              {interactionMode === "manual-blur"
                ? "Drawing blur box (click to stop)"
                : "Draw a manual blur box"}
            </button>

            {/* Findings List */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">
                  Hidden areas ({redactions.length})
                </span>
                {redactions.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRedactions}
                    className="text-[11px] font-medium text-rose-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {redactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500">
                  Click Auto-Redact Secrets or draw a blur box over any area.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {redactions.map((box) => (
                    <div
                      key={box.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-800">
                          {box.label}
                        </div>
                        {box.maskedPreview && (
                          <div className="truncate font-mono text-[11px] text-zinc-500">
                            {box.maskedPreview}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleRedactionBox(box.id)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
                          title={box.enabled ? "Show original" : "Hide again"}
                        >
                          {box.enabled ? (
                            <Eye className="h-3.5 w-3.5 text-emerald-700" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRedactionBox(box.id)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
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
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                Drawing tools
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "select", label: "Pointer", icon: MousePointer },
                    { id: "arrow", label: "Arrow", icon: ArrowUpRight },
                    { id: "rect", label: "Highlight box", icon: Square },
                    { id: "badge", label: "Step 1·2·3", icon: Hash },
                    { id: "text", label: "Text label", icon: Type },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeMode(id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      interactionMode === id
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                Markup color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  activeBrandKit?.accentHex ?? "#0284c7",
                  "#0f172a",
                  "#e11d48",
                  "#d97706",
                  "#059669",
                  "#7c3aed",
                ].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Color ${hex}`}
                    onClick={() => onChangeColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      activeColor === hex
                        ? "scale-110 border-zinc-900 ring-2 ring-zinc-300"
                        : "border-white shadow-sm"
                    }`}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">
                  Added items ({annotations.length})
                </span>
                {annotations.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAnnotations}
                    className="text-[11px] font-medium text-rose-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {annotations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500">
                  Pick a tool above, then click or drag directly on the screenshot.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {annotations.map((ann, i) => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs"
                    >
                      <span className="capitalize text-zinc-800">
                        #{i + 1} {ann.kind}
                        {ann.text ? `: ${ann.text}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnotation(ann.id)}
                        className="rounded p-1 text-zinc-400 hover:text-rose-600"
                        aria-label={`Remove ${ann.kind}`}
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
            <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 text-xs">
              <div>
                <div className="text-[11px] text-sky-700">Saved style preset</div>
                <div className="font-semibold text-zinc-900">
                  Active: {activeBrandKit ? activeBrandKit.name : "Custom"}
                </div>
              </div>
              <button
                type="button"
                onClick={onCreateBrandKit}
                className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" /> New Kit
              </button>
            </div>

            {/* Pull by Team Code */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="text-xs font-semibold text-zinc-800">
                Load a shared team preset
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={teamCodeInput}
                  onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                  placeholder="Team code (e.g. NRTH-4040)"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => void handlePull()}
                  disabled={pulling}
                  className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  {pulling ? "..." : "Sync"}
                </button>
              </div>
              {pullError && (
                <p className="mt-1.5 text-[11px] text-rose-600">{pullError}</p>
              )}
              <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white py-1.5 text-[11px] font-medium text-zinc-600 hover:border-zinc-400">
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
                        ? "border-sky-400 bg-sky-50/50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                          style={{
                            background: `linear-gradient(${kit.bgAngle}deg, ${kit.bgGradientStart}, ${kit.bgGradientEnd})`,
                          }}
                        />
                        <div>
                          <div className="text-xs font-semibold text-zinc-900">
                            {kit.name}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {kit.defaultAspectRatio} • {kit.fontFamily}
                            {kit.teamCode ? ` • ${kit.teamCode}` : ""}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditBrandKit(kit)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100"
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
                              className="h-3.5 w-3.5 rounded-full border border-black/15"
                              title={c}
                            />
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyBrandKit(kit)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "bg-zinc-900 text-white"
                            : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-900 hover:text-white"
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
