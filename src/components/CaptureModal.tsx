import { Camera, Clipboard, Monitor, Upload, X } from "lucide-react";
import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const shortcut = osLabel === "macOS" ? "⌘V" : "Ctrl+V";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="New Screenshot or Mockup"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Add a screenshot
              </h2>
              <p className="text-xs text-zinc-500">
                Capture your screen, upload a file, or paste from your clipboard — works on Windows, Mac, and Linux.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close capture modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onScreenCapture}
            className="flex flex-col items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-left transition hover:border-sky-400 hover:bg-sky-50"
          >
            <Monitor className="h-5 w-5 text-sky-600" />
            <div className="text-sm font-semibold text-zinc-900">Capture screen</div>
            <div className="text-xs text-zinc-600">
              Pick any window, tab, or monitor right from your browser
            </div>
          </button>

          <label className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100/70">
            <Upload className="h-5 w-5 text-zinc-700" />
            <div className="text-sm font-semibold text-zinc-900">Upload image</div>
            <div className="text-xs text-zinc-600">
              Choose a PNG, JPG, or WebP from your computer
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

          <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <Clipboard className="h-5 w-5 text-emerald-600" />
            <div className="text-sm font-semibold text-zinc-900">
              Paste ({shortcut})
            </div>
            <div className="text-xs text-zinc-600">
              Take any screenshot and press{" "}
              <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-800 ring-1 ring-zinc-200">
                {shortcut}
              </kbd>{" "}
              anywhere on the page
            </div>
          </div>
        </div>

        {captureError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {captureError}
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2.5 text-xs font-semibold text-zinc-700">
            Or try a sample screenshot
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
                className="group overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-left transition hover:border-sky-400"
              >
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-zinc-200">
                  <img
                    src={sample.dataUrl}
                    alt={sample.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-2 text-xs font-semibold text-zinc-900">
                  {sample.name}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
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
