import { Camera, Clipboard, Monitor, Upload, X } from "lucide-react";
import type { SampleShot } from "../lib/sampleShots";

interface CaptureModalProps {
  open: boolean;
  samples: SampleShot[];
  osLabel: string;
  onClose: () => void;
  onSelectSample: (sample: SampleShot) => void;
  onUploadFile: (file: File) => void;
  onScreenCapture: () => void;
  captureError: string | null;
}

export function CaptureModal({
  open,
  samples,
  osLabel,
  onClose,
  onSelectSample,
  onUploadFile,
  onScreenCapture,
  captureError,
}: CaptureModalProps) {
  if (!open) return null;

  const shortcut = osLabel === "macOS" ? "⌘V" : "Ctrl+V";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New Screenshot or Mockup"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Capture or Import Screenshot
              </h2>
              <p className="text-xs text-slate-400">
                Cross-platform input for Windows, macOS & Linux — zero install required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close capture modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onScreenCapture}
            className="flex flex-col items-start gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            <Monitor className="h-5 w-5 text-indigo-400" />
            <div className="text-sm font-semibold text-white">Screen / Window</div>
            <div className="text-xs text-slate-400">
              Native browser capture of any monitor, window, or tab
            </div>
          </button>

          <label className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.06]">
            <Upload className="h-5 w-5 text-cyan-400" />
            <div className="text-sm font-semibold text-white">Upload / Drop</div>
            <div className="text-xs text-slate-400">
              PNG, JPG, or WebP from disk or drag straight onto canvas
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadFile(file);
              }}
            />
          </label>

          <div className="flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Clipboard className="h-5 w-5 text-emerald-400" />
            <div className="text-sm font-semibold text-white">
              Clipboard ({shortcut})
            </div>
            <div className="text-xs text-slate-400">
              Take any OS snip and press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-200">{shortcut}</kbd> anywhere
            </div>
          </div>
        </div>

        {captureError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {captureError}
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Or test with built-in sample shots
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                className="group overflow-hidden rounded-xl border border-white/10 bg-[#0b0e16] p-2.5 text-left transition hover:border-indigo-400/60"
              >
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
                  <img
                    src={sample.dataUrl}
                    alt={sample.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-100">
                  {sample.name}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
                  {sample.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
