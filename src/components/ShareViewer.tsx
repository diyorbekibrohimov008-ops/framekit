import { ArrowLeft, Check, Copy, Download, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchShareById } from "../lib/storage";

interface ShareViewerProps {
  shareId: string;
}

export function ShareViewer({ shareId }: ShareViewerProps) {
  const [data, setData] = useState<{
    id: string;
    title: string;
    width: number;
    height: number;
    brandKitName?: string;
    redactedCount: number;
    createdAt: string;
    imageDataUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchShareById(shareId)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load shared mockup"),
      );
  }, [shareId]);

  const handleCopyUrl = async () => {
    await navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0e121b] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Open FrameKit Studio
          </a>
          <div className="text-sm font-semibold text-white">
            {data ? data.title : "Shared Mockup"}
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            {data.redactedCount > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {data.redactedCount} secret{data.redactedCount > 1 ? "s" : ""} redacted
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
            <a
              href={data.imageDataUrl}
              download={`framekit-${data.id}.png`}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center p-6 sm:p-10">
        {error ? (
          <div className="mt-16 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
            {error}
          </div>
        ) : !data ? (
          <div className="mt-20 text-sm text-slate-400">Loading shared mockup...</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e121b] p-2 shadow-2xl">
              <img
                src={data.imageDataUrl}
                alt={data.title}
                className="max-h-[78vh] w-auto rounded-xl object-contain"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-mono">{data.width} × {data.height}px</span>
              {data.brandKitName && (
                <>
                  <span>•</span>
                  <span>Brand Kit: {data.brandKitName}</span>
                </>
              )}
              <span>•</span>
              <span>Shared {new Date(data.createdAt).toLocaleString()}</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
