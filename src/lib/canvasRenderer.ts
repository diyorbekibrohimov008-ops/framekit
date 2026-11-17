import { computeMockupGeometry, type LayoutGeometry } from "./layoutEngine";
import type {
  AnnotationItem,
  BrandKit,
  CanvasSettings,
  RedactionBox,
} from "../types/studio";

export interface RenderMockupParams {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement | HTMLCanvasElement;
  imageWidth: number;
  imageHeight: number;
  settings: CanvasSettings;
  redactions: RedactionBox[];
  annotations: AnnotationItem[];
  brandKit: BrandKit | null;
  logoImage?: HTMLImageElement | null;
  exportScale?: 1 | 2 | 3;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: CanvasSettings,
) {
  const { background } = settings;
  if (background.kind === "transparent") return;

  if (background.kind === "solid") {
    ctx.fillStyle = background.solidColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const rad = ((background.gradientAngle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.hypot(width, height) / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(rad) * r,
    cy - Math.sin(rad) * r,
    cx + Math.cos(rad) * r,
    cy + Math.sin(rad) * r,
  );
  grad.addColorStop(0, background.gradientStart);
  grad.addColorStop(1, background.gradientEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (background.kind === "mesh") {
    const orb1 = ctx.createRadialGradient(
      width * 0.18,
      height * 0.2,
      0,
      width * 0.18,
      height * 0.2,
      width * 0.6,
    );
    orb1.addColorStop(0, (background.meshAccent ?? "#22d3ee") + "44");
    orb1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, width, height);

    const orb2 = ctx.createRadialGradient(
      width * 0.85,
      height * 0.85,
      0,
      width * 0.85,
      height * 0.85,
      width * 0.55,
    );
    orb2.addColorStop(0, "#ffffff1a");
    orb2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawWindowChrome(
  ctx: CanvasRenderingContext2D,
  geo: LayoutGeometry,
  settings: CanvasSettings,
  fontFamily: string,
) {
  if (settings.windowFrame === "none" || geo.chromeHeight <= 0) return;

  const { x, y, width } = geo.frameRect;
  const h = geo.chromeHeight;
  const isLight =
    settings.windowFrame === "macos-light" ||
    settings.windowFrame === "browser-glass";

  ctx.fillStyle =
    settings.windowFrame === "macos-dark"
      ? "#151924"
      : settings.windowFrame === "windows-11"
        ? "#181d28"
        : settings.windowFrame === "browser-glass"
          ? "rgba(255, 255, 255, 0.92)"
          : "#f1f5f9";
  ctx.fillRect(x, y, width, h);

  // Subtle divider
  ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(x, y + h - 1, width, 1);

  if (settings.windowFrame === "windows-11") {
    // Title on left, Win11 controls on right
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `500 12.5px "${fontFamily}", Inter, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(settings.windowTitle || "FrameKit Capture", x + 16, y + h / 2);

    const cy = y + h / 2;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.4;
    // Minimize
    ctx.beginPath();
    ctx.moveTo(x + width - 92, cy);
    ctx.lineTo(x + width - 82, cy);
    ctx.stroke();
    // Maximize
    ctx.strokeRect(x + width - 62, cy - 5, 10, 10);
    // Close
    ctx.beginPath();
    ctx.moveTo(x + width - 30, cy - 5);
    ctx.lineTo(x + width - 20, cy + 5);
    ctx.moveTo(x + width - 20, cy - 5);
    ctx.lineTo(x + width - 30, cy + 5);
    ctx.stroke();
    return;
  }

  // macOS traffic lights
  const dots = ["#ff5f57", "#febc2e", "#28c840"];
  dots.forEach((color, idx) => {
    ctx.beginPath();
    ctx.arc(x + 20 + idx * 18, y + h / 2, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  if (settings.windowFrame === "browser-glass") {
    const pillW = Math.min(380, Math.max(160, width * 0.45));
    const pillH = Math.max(22, h - 18);
    const pillX = x + (width - pillW) / 2;
    const pillY = y + (h - pillH) / 2;
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 7);
    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.font = `500 12px "${fontFamily}", Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      settings.browserUrl || "https://app.framekit.io",
      x + width / 2,
      y + h / 2,
    );
    ctx.textAlign = "left";
    return;
  }

  if (settings.windowTitle) {
    ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
    ctx.font = `500 12.5px "${fontFamily}", Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(settings.windowTitle, x + width / 2, y + h / 2);
    ctx.textAlign = "left";
  }
}

function drawRedactionBoxes(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  imageWidth: number,
  imageHeight: number,
  geo: LayoutGeometry,
  redactions: RedactionBox[],
  settings: CanvasSettings,
) {
  const activeBoxes = redactions.filter((b) => b.enabled);
  if (activeBoxes.length === 0) return;

  const scaleX = geo.imageRect.width / imageWidth;
  const scaleY = geo.imageRect.height / imageHeight;

  for (const box of activeBoxes) {
    const sx = Math.max(0, Math.min(imageWidth - 1, box.x));
    const sy = Math.max(0, Math.min(imageHeight - 1, box.y));
    const sw = Math.max(4, Math.min(imageWidth - sx, box.width));
    const sh = Math.max(4, Math.min(imageHeight - sy, box.height));

    const dx = geo.imageRect.x + sx * scaleX;
    const dy = geo.imageRect.y + sy * scaleY;
    const dw = sw * scaleX;
    const dh = sh * scaleY;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, 5);
    ctx.clip();

    if (settings.redactionStyle === "solid") {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
      if (dw > 54 && dh > 16) {
        ctx.fillStyle = "#a5b4fc";
        ctx.font = "600 9.5px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("REDACTED", dx + dw / 2, dy + dh / 2);
        ctx.textAlign = "left";
      }
    } else {
      // Pixelate & Blur both use an offscreen downsample so privacy NEVER leaks
      // even if a browser ignores ctx.filter.
      const factor =
        settings.redactionStyle === "pixelate"
          ? Math.max(4, Math.round(settings.redactionIntensity * 1.1))
          : Math.max(6, Math.round(settings.redactionIntensity * 0.9));

      const tmp = document.createElement("canvas");
      tmp.width = Math.max(2, Math.round(dw / factor));
      tmp.height = Math.max(2, Math.round(dh / factor));
      const tctx = tmp.getContext("2d");

      if (tctx) {
        tctx.drawImage(image, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
        ctx.imageSmoothingEnabled = settings.redactionStyle === "blur";
        if (settings.redactionStyle === "blur" && "filter" in ctx) {
          ctx.filter = `blur(${Math.max(4, settings.redactionIntensity)}px)`;
        }
        ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, dx, dy, dw, dh);
        ctx.filter = "none";
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(dx, dy, dw, dh);
      }
    }

    ctx.restore();
  }
}

function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  geo: LayoutGeometry,
  annotations: AnnotationItem[],
  fontFamily: string,
) {
  if (annotations.length === 0) return;
  const scaleX = geo.imageRect.width / imageWidth;
  const scaleY = geo.imageRect.height / imageHeight;

  for (const item of annotations) {
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const x = geo.imageRect.x + item.x * scaleX;
    const y = geo.imageRect.y + item.y * scaleY;

    if (item.kind === "rect") {
      const w = (item.width ?? 120) * scaleX;
      const h = (item.height ?? 48) * scaleY;
      ctx.fillStyle = item.color + "1c";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
    } else if (item.kind === "arrow") {
      const x2 = geo.imageRect.x + (item.x2 ?? item.x + 80) * scaleX;
      const y2 = geo.imageRect.y + (item.y2 ?? item.y + 40) * scaleY;
      const angle = Math.atan2(y2 - y, x2 - x);
      const headLen = Math.max(12, item.strokeWidth * 3.8);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === "badge") {
      const radius = 14;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 13px "${fontFamily}", Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(item.number ?? 1), x, y + 0.5);
    } else if (item.kind === "text" && item.text) {
      ctx.font = `600 14px "${fontFamily}", Inter, sans-serif`;
      const metrics = ctx.measureText(item.text);
      const padX = 12;
      const boxW = metrics.width + padX * 2;
      const boxH = 30;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 8);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(item.text, x + padX, y + boxH / 2);
    }
    ctx.restore();
  }
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  geo: LayoutGeometry,
  brandKit: BrandKit | null,
  logoImage?: HTMLImageElement | null,
) {
  if (!brandKit) return;
  const hasText = Boolean(brandKit.watermarkText.trim());
  const hasLogo = Boolean(logoImage && logoImage.naturalWidth > 0);
  if (!hasText && !hasLogo) return;

  ctx.save();
  ctx.globalAlpha = brandKit.watermarkOpacity;

  if (brandKit.watermarkPosition === "footer-bar") {
    const barY = geo.logicalHeight - geo.footerBarHeight;
    ctx.fillStyle = "rgba(9, 13, 22, 0.55)";
    ctx.fillRect(0, barY, geo.logicalWidth, geo.footerBarHeight);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, barY, geo.logicalWidth, 1);

    let cursorX = 24;
    if (hasLogo && logoImage) {
      const lh = 22;
      const lw = Math.round((logoImage.naturalWidth / logoImage.naturalHeight) * lh);
      ctx.drawImage(logoImage, cursorX, barY + 10, lw, lh);
      cursorX += lw + 10;
    }
    ctx.fillStyle = "#f8fafc";
    ctx.font = `600 13px "${brandKit.fontFamily}", Inter, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(brandKit.watermarkText || brandKit.name, cursorX, barY + 21);

    ctx.fillStyle = brandKit.accentHex;
    ctx.textAlign = "right";
    ctx.font = `600 11.5px "${brandKit.fontFamily}", Inter, sans-serif`;
    ctx.fillText(brandKit.name, geo.logicalWidth - 24, barY + 21);
    ctx.restore();
    return;
  }

  ctx.font = `600 13px "${brandKit.fontFamily}", Inter, sans-serif`;
  const textW = hasText ? ctx.measureText(brandKit.watermarkText).width : 0;
  const logoH = 20;
  const logoW =
    hasLogo && logoImage
      ? Math.round((logoImage.naturalWidth / logoImage.naturalHeight) * logoH)
      : 0;
  const gap = hasLogo && hasText ? 8 : 0;
  const pillW = logoW + gap + textW + 24;
  const pillH = 32;
  const margin = 18;

  let px = geo.logicalWidth - pillW - margin;
  let py = geo.logicalHeight - pillH - margin;
  if (brandKit.watermarkPosition === "bottom-left") {
    px = margin;
    py = geo.logicalHeight - pillH - margin;
  } else if (brandKit.watermarkPosition === "top-right") {
    px = geo.logicalWidth - pillW - margin;
    py = margin;
  }

  ctx.fillStyle = "rgba(9, 13, 22, 0.58)";
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 999);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();

  let contentX = px + 12;
  if (hasLogo && logoImage) {
    ctx.drawImage(logoImage, contentX, py + 6, logoW, logoH);
    contentX += logoW + gap;
  }
  if (hasText) {
    ctx.fillStyle = "#f8fafc";
    ctx.textBaseline = "middle";
    ctx.fillText(brandKit.watermarkText, contentX, py + pillH / 2);
  }
  ctx.restore();
}

export function renderMockupCanvas(params: RenderMockupParams): LayoutGeometry {
  const {
    canvas,
    image,
    imageWidth,
    imageHeight,
    settings,
    redactions,
    annotations,
    brandKit,
    logoImage,
    exportScale = settings.exportScale,
  } = params;

  const watermarkPosition = brandKit?.watermarkPosition ?? "bottom-right";
  const fontFamily = brandKit?.fontFamily ?? "Plus Jakarta Sans";

  const geo = computeMockupGeometry({
    imageWidth,
    imageHeight,
    aspectRatio: settings.aspectRatio,
    padding: settings.padding,
    windowFrame: settings.windowFrame,
    showHeadline: settings.showHeadline,
    exportScale,
    watermarkPosition,
  });

  canvas.width = geo.outputWidth;
  canvas.height = geo.outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return geo;

  ctx.save();
  ctx.scale(exportScale, exportScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawBackground(ctx, geo.logicalWidth, geo.logicalHeight, settings);

  // Optional marketing headline
  if (settings.showHeadline && geo.headlineArea) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 28px "${fontFamily}", Inter, sans-serif`;
    ctx.fillText(
      settings.headline || "Ship crisp, privacy-safe product visuals",
      geo.logicalWidth / 2,
      geo.headlineArea.y + 34,
    );
    if (settings.subheadline) {
      ctx.fillStyle = "rgba(241, 245, 249, 0.78)";
      ctx.font = `500 15px "${fontFamily}", Inter, sans-serif`;
      ctx.fillText(
        settings.subheadline,
        geo.logicalWidth / 2,
        geo.headlineArea.y + 62,
      );
    }
    ctx.restore();
  }

  // Drop shadow behind frame
  if (settings.shadowIntensity > 0) {
    ctx.save();
    const alpha = Math.min(0.65, (settings.shadowIntensity / 100) * 0.58);
    ctx.shadowColor = `rgba(2, 6, 23, ${alpha})`;
    ctx.shadowBlur = Math.round(20 + settings.shadowIntensity * 0.6);
    ctx.shadowOffsetY = Math.round(12 + settings.shadowIntensity * 0.25);
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(
      geo.frameRect.x,
      geo.frameRect.y,
      geo.frameRect.width,
      geo.frameRect.height,
      settings.borderRadius,
    );
    ctx.fill();
    ctx.restore();
  }

  // Clip window frame + screenshot
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    geo.frameRect.x,
    geo.frameRect.y,
    geo.frameRect.width,
    geo.frameRect.height,
    settings.borderRadius,
  );
  ctx.clip();

  drawWindowChrome(ctx, geo, settings, fontFamily);

  ctx.drawImage(
    image,
    geo.imageRect.x,
    geo.imageRect.y,
    geo.imageRect.width,
    geo.imageRect.height,
  );

  drawRedactionBoxes(ctx, image, imageWidth, imageHeight, geo, redactions, settings);
  drawAnnotations(ctx, imageWidth, imageHeight, geo, annotations, fontFamily);

  ctx.restore();

  // Crisp subtle 1px highlight border
  if (settings.insetBorder) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(
      geo.frameRect.x + 0.5,
      geo.frameRect.y + 0.5,
      geo.frameRect.width - 1,
      geo.frameRect.height - 1,
      settings.borderRadius,
    );
    ctx.stroke();
    ctx.restore();
  }

  drawWatermark(ctx, geo, brandKit, logoImage);
  ctx.restore();

  return geo;
}
