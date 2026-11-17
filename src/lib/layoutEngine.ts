import type {
  AspectRatioPreset,
  WatermarkPosition,
  WindowFrameStyle,
} from "../types/studio";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutInput {
  imageWidth: number;
  imageHeight: number;
  aspectRatio: AspectRatioPreset;
  padding: number;
  windowFrame: WindowFrameStyle;
  showHeadline: boolean;
  exportScale: 1 | 2 | 3;
  watermarkPosition: WatermarkPosition;
}

export interface LayoutGeometry {
  logicalWidth: number;
  logicalHeight: number;
  outputWidth: number;
  outputHeight: number;
  frameRect: Rect;
  imageRect: Rect;
  chromeHeight: number;
  headlineArea: Rect | null;
  footerBarHeight: number;
}

const ASPECT_RATIOS: Record<Exclude<AspectRatioPreset, "auto">, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "4:5": 4 / 5,
  "9:16": 9 / 16,
  "2:1": 2,
};

export function getWindowChromeHeight(frame: WindowFrameStyle): number {
  switch (frame) {
    case "none":
      return 0;
    case "browser-glass":
      return 46;
    case "macos-dark":
    case "macos-light":
    case "windows-11":
      return 38;
  }
}

export function computeMockupGeometry(input: LayoutInput): LayoutGeometry {
  const safeImageW = Math.max(64, Math.round(input.imageWidth));
  const safeImageH = Math.max(64, Math.round(input.imageHeight));
  const padding = Math.max(0, Math.round(input.padding));
  const chromeHeight = getWindowChromeHeight(input.windowFrame);
  const headlineHeight = input.showHeadline ? 88 : 0;
  const footerBarHeight = input.watermarkPosition === "footer-bar" ? 42 : 0;

  const baseFrameW = safeImageW;
  const baseFrameH = safeImageH + chromeHeight;

  let logicalWidth = baseFrameW + padding * 2;
  let logicalHeight =
    baseFrameH + padding * 2 + headlineHeight + footerBarHeight;

  let frameW = baseFrameW;
  let frameH = baseFrameH;
  let imageW = safeImageW;
  let imageH = safeImageH;
  let scaledChrome = chromeHeight;

  if (input.aspectRatio !== "auto") {
    const targetRatio = ASPECT_RATIOS[input.aspectRatio];
    const minW = baseFrameW + padding * 2;
    const minH = baseFrameH + padding * 2 + headlineHeight + footerBarHeight;

    if (minW / minH > targetRatio) {
      logicalWidth = minW;
      logicalHeight = Math.round(minW / targetRatio);
    } else {
      logicalHeight = minH;
      logicalWidth = Math.round(minH * targetRatio);
    }

    const availW = Math.max(64, logicalWidth - padding * 2);
    const availH = Math.max(
      64,
      logicalHeight - padding * 2 - headlineHeight - footerBarHeight,
    );
    const fitScale = Math.min(availW / baseFrameW, availH / baseFrameH);
    frameW = Math.round(baseFrameW * fitScale);
    frameH = Math.round(baseFrameH * fitScale);
    scaledChrome = Math.round(chromeHeight * fitScale);
    imageW = frameW;
    imageH = frameH - scaledChrome;
  }

  const contentTop = padding + headlineHeight;
  const contentHeight = logicalHeight - contentTop - padding - footerBarHeight;
  const frameX = Math.round((logicalWidth - frameW) / 2);
  const frameY = Math.round(contentTop + (contentHeight - frameH) / 2);

  const headlineArea: Rect | null = input.showHeadline
    ? {
        x: padding,
        y: Math.max(16, Math.round(padding * 0.55)),
        width: logicalWidth - padding * 2,
        height: headlineHeight,
      }
    : null;

  return {
    logicalWidth,
    logicalHeight,
    outputWidth: logicalWidth * input.exportScale,
    outputHeight: logicalHeight * input.exportScale,
    frameRect: {
      x: frameX,
      y: frameY,
      width: frameW,
      height: frameH,
    },
    imageRect: {
      x: frameX,
      y: frameY + scaledChrome,
      width: imageW,
      height: imageH,
    },
    chromeHeight: scaledChrome,
    headlineArea,
    footerBarHeight,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

export function extractDominantGradient(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { start: string; end: string } {
  if (pixels.length < 4 || width <= 0 || height <= 0) {
    return { start: "#6366f1", end: "#06b6d4" };
  }

  let rTop = 0;
  let gTop = 0;
  let bTop = 0;
  let cTop = 0;

  let rBot = 0;
  let gBot = 0;
  let bBot = 0;
  let cBot = 0;

  const totalPixels = Math.min(width * height, Math.floor(pixels.length / 4));
  const split = Math.floor(totalPixels / 2);
  const stride = Math.max(1, Math.floor(totalPixels / 400));

  for (let p = 0; p < totalPixels; p += stride) {
    const idx = p * 4;
    if (pixels[idx + 3] < 32) continue;
    if (p < split) {
      rTop += pixels[idx];
      gTop += pixels[idx + 1];
      bTop += pixels[idx + 2];
      cTop++;
    } else {
      rBot += pixels[idx];
      gBot += pixels[idx + 1];
      bBot += pixels[idx + 2];
      cBot++;
    }
  }

  if (cTop === 0 || cBot === 0) {
    return { start: "#6366f1", end: "#06b6d4" };
  }

  const start = rgbToHex(rTop / cTop, gTop / cTop, bTop / cTop);
  const end = rgbToHex(rBot / cBot, gBot / cBot, bBot / cBot);
  if (start === end) {
    return {
      start,
      end: rgbToHex(
        Math.max(15, (rBot / cBot) * 0.72),
        Math.max(20, (gBot / cBot) * 0.75),
        Math.min(255, (bBot / cBot) * 1.15),
      ),
    };
  }
  return { start, end };
}
