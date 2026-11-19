import { Maximize2, Redo2, Undo2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LayoutGeometry } from "../lib/layoutEngine";
import { renderMockupCanvas } from "../lib/canvasRenderer";
import type {
  AnnotationItem,
  AnnotationKind,
  BrandKit,
  CanvasSettings,
  RedactionBox,
} from "../types/studio";

export type InteractionMode = "select" | "manual-blur" | AnnotationKind;

interface CanvasStageProps {
  image: HTMLImageElement | null;
  imageWidth: number;
  imageHeight: number;
  settings: CanvasSettings;
  redactions: RedactionBox[];
  annotations: AnnotationItem[];
  brandKit: BrandKit | null;
  logoImage: HTMLImageElement | null;
  interactionMode: InteractionMode;
  activeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddManualRedaction: (box: Omit<RedactionBox, "id">) => void;
  onAddAnnotation: (item: Omit<AnnotationItem, "id">) => void;
  onDropFile: (file: File) => void;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
}

export function CanvasStage({
  image,
  imageWidth,
  imageHeight,
  settings,
  redactions,
  annotations,
  brandKit,
  logoImage,
  interactionMode,
  activeColor,
  strokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddManualRedaction,
  onAddAnnotation,
  onDropFile,
  onCanvasReady,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [geometry, setGeometry] = useState<LayoutGeometry | null>(null);
  const [zoomFit, setZoomFit] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    onCanvasReady(canvas);
    if (!canvas || !image) return;
    const geo = renderMockupCanvas({
      canvas,
      image,
      imageWidth,
      imageHeight,
      settings,
      redactions,
      annotations,
      brandKit,
      logoImage,
      exportScale: 1,
    });
    setGeometry(geo);
  }, [
    image,
    imageWidth,
    imageHeight,
    settings,
    redactions,
    annotations,
    brandKit,
    logoImage,
    onCanvasReady,
  ]);

  const toImageCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !geometry) return null;
    const rect = canvas.getBoundingClientRect();
    const logicalX = ((clientX - rect.left) / rect.width) * geometry.logicalWidth;
    const logicalY = ((clientY - rect.top) / rect.height) * geometry.logicalHeight;

    const relX =
      ((logicalX - geometry.imageRect.x) / geometry.imageRect.width) *
      imageWidth;
    const relY =
      ((logicalY - geometry.imageRect.y) / geometry.imageRect.height) *
      imageHeight;
    return {
      x: Math.max(0, Math.min(imageWidth, Math.round(relX))),
      y: Math.max(0, Math.min(imageHeight, Math.round(relY))),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (interactionMode === "select") return;
    const coords = toImageCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (interactionMode === "badge") {
      const badgeCount =
        annotations.filter((a) => a.kind === "badge").length + 1;
      onAddAnnotation({
        kind: "badge",
        x: coords.x,
        y: coords.y,
        color: activeColor,
        strokeWidth,
        number: badgeCount,
      });
      return;
    }

    if (interactionMode === "text") {
      const label = window.prompt("Callout label text:", "Key highlight");
      if (label && label.trim()) {
        onAddAnnotation({
          kind: "text",
          x: coords.x,
          y: coords.y,
          text: label.trim().slice(0, 48),
          color: activeColor,
          strokeWidth,
        });
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;
    const coords = toImageCoords(e.clientX, e.clientY);
    if (coords) setDragCurrent(coords);
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);

    if (interactionMode === "manual-blur" && width >= 12 && height >= 10) {
      onAddManualRedaction({
        x,
        y,
        width,
        height,
        category: "manual",
        label: "Manual Blur",
        maskedPreview: "Custom region",
        enabled: true,
        source: "manual",
      });
    } else if (interactionMode === "rect" && width >= 12 && height >= 10) {
      onAddAnnotation({
        kind: "rect",
        x,
        y,
        width,
        height,
        color: activeColor,
        strokeWidth,
      });
    } else if (
      interactionMode === "arrow" &&
      Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y) >= 14
    ) {
      onAddAnnotation({
        kind: "arrow",
        x: dragStart.x,
        y: dragStart.y,
        x2: dragCurrent.x,
        y2: dragCurrent.y,
        color: activeColor,
        strokeWidth,
      });
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  // Overlay CSS box for active drag gesture
  const dragOverlayStyle = (() => {
    if (!dragStart || !dragCurrent || !geometry) return null;
    if (interactionMode === "arrow") return null;
    const x1 = Math.min(dragStart.x, dragCurrent.x);
    const y1 = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);
    const leftPct =
      ((geometry.imageRect.x + (x1 / imageWidth) * geometry.imageRect.width) /
        geometry.logicalWidth) *
      100;
    const topPct =
      ((geometry.imageRect.y + (y1 / imageHeight) * geometry.imageRect.height) /
        geometry.logicalHeight) *
      100;
    const widthPct =
      (((w / imageWidth) * geometry.imageRect.width) / geometry.logicalWidth) *
      100;
    const heightPct =
      (((h / imageHeight) * geometry.imageRect.height) /
        geometry.logicalHeight) *
      100;
    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    };
  })();

  const activeRedactionCount = redactions.filter((r) => r.enabled).length;

  return (
    <div
      className={`relative flex flex-1 flex-col items-center justify-center overflow-auto bg-[#07090e] p-4 sm:p-8 ${
        dragOver ? "ring-2 ring-inset ring-teal-500" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          onDropFile(file);
        }
      }}
    >
      {/* Top floating status strip */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-[#121620]/90 px-3.5 py-1.5 text-xs text-slate-300 shadow-lg backdrop-blur">
        <span className="font-mono text-[11px] text-slate-400">
          {geometry
            ? `${geometry.logicalWidth * settings.exportScale} × ${geometry.logicalHeight * settings.exportScale}px (${settings.exportScale}× Retina)`
            : `${imageWidth} × ${imageHeight}px`}
        </span>
        <span className="text-white/15">|</span>
        <span
          className={
            activeRedactionCount > 0 ? "text-emerald-400 font-medium" : "text-slate-400"
          }
        >
          {activeRedactionCount > 0
            ? `${activeRedactionCount} secret${activeRedactionCount > 1 ? "s" : ""} redacted`
            : "No redactions active"}
        </span>
        {interactionMode !== "select" && (
          <>
            <span className="text-white/15">|</span>
            <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300">
              {interactionMode === "manual-blur"
                ? "Drag on screenshot to blur region"
                : `Tool: ${interactionMode} — click or drag`}
            </span>
          </>
        )}
      </div>

      {/* Canvas wrapper */}
      <div
        className={`relative inline-block overflow-hidden rounded-xl border border-white/10 shadow-2xl ${
          settings.background.kind === "transparent" ? "checkerboard-bg" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            maxWidth: zoomFit ? "100%" : "none",
            maxHeight: zoomFit ? "calc(100vh - 220px)" : "none",
            width: zoomFit ? "auto" : undefined,
            height: "auto",
            cursor: interactionMode === "select" ? "default" : "crosshair",
          }}
          className="block select-none"
        />
        {dragOverlayStyle && (
          <div
            style={dragOverlayStyle}
            className="pointer-events-none absolute rounded border-2 border-dashed border-cyan-400 bg-cyan-400/15"
          />
        )}
      </div>

      {/* Bottom quick controls */}
      <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121620]/90 p-1 shadow-lg">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-35"
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-35"
          title="Redo"
        >
          <Redo2 className="h-3.5 w-3.5" />
          Redo
        </button>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => setZoomFit((z) => !z)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
        >
          {zoomFit ? (
            <>
              <ZoomIn className="h-3.5 w-3.5" /> 100%
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" /> Fit View
            </>
          )}
        </button>
      </div>
    </div>
  );
}
