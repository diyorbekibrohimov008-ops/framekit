import { ArrowLeft, Check, Copy, Download, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchShareById(shareId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load shared mockup");
        }
      });
    return () => {
      cancelled = true;
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, [shareId]);

  const handleCopyUrl = async () => {
    await navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#eef0f4] text-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3.5">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Open FrameKit Studio
          </a>
          <div className="text-sm font-semibold text-zinc-900">
            {data ? data.title : "Shared Mockup"}
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-2">
            {data.redactedCount > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {data.redactedCount} secret{data.redactedCount > 1 ? "s" : ""} hidden
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleCopyUrl()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={data.imageDataUrl}
              download={`framekit-${data.id}.png`}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center p-6 sm:p-10">
        {error ? (
          <div className="mt-16 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : !data ? (
          <div className="mt-20 text-sm text-zinc-500">Loading shared screenshot...</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
              <img
                src={data.imageDataUrl}
                alt={data.title}
                className="max-h-[78vh] w-auto rounded-xl object-contain"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="font-mono tabular-nums">{data.width} × {data.height}px</span>
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
