import { describe, expect, it } from "vitest";
import {
  computeMockupGeometry,
  extractDominantGradient,
  getWindowChromeHeight,
} from "../src/lib/layoutEngine";

describe("layoutEngine", () => {
  it("computes auto-centered geometry with balanced padding and retina scale", () => {
    const geo = computeMockupGeometry({
      imageWidth: 1000,
      imageHeight: 600,
      aspectRatio: "auto",
      padding: 64,
      windowFrame: "macos-dark",
      showHeadline: false,
      exportScale: 2,
      watermarkPosition: "bottom-right",
    });

    const chromeH = getWindowChromeHeight("macos-dark");
    expect(chromeH).toBeGreaterThan(0);
    expect(geo.logicalWidth).toBe(1000 + 128);
    expect(geo.logicalHeight).toBe(600 + chromeH + 128);
    expect(geo.outputWidth).toBe(geo.logicalWidth * 2);
    expect(geo.outputHeight).toBe(geo.logicalHeight * 2);
    // Horizontal centering check
    const leftMargin = geo.frameRect.x;
    const rightMargin = geo.logicalWidth - (geo.frameRect.x + geo.frameRect.width);
    expect(leftMargin).toBe(rightMargin);
  });

  it("fits screenshot proportionally inside fixed 16:9 and 1:1 aspect ratios while keeping minimum padding", () => {
    const geo16x9 = computeMockupGeometry({
      imageWidth: 800,
      imageHeight: 800,
      aspectRatio: "16:9",
      padding: 48,
      windowFrame: "none",
      showHeadline: false,
      exportScale: 1,
      watermarkPosition: "bottom-right",
    });

    expect(geo16x9.logicalWidth / geo16x9.logicalHeight).toBeCloseTo(16 / 9, 2);
    expect(geo16x9.frameRect.x).toBeGreaterThanOrEqual(48);
    expect(geo16x9.frameRect.y).toBeGreaterThanOrEqual(48);

    const geoSquare = computeMockupGeometry({
      imageWidth: 1200,
      imageHeight: 600,
      aspectRatio: "1:1",
      padding: 40,
      windowFrame: "browser-glass",
      showHeadline: true,
      exportScale: 1,
      watermarkPosition: "footer-bar",
    });

    expect(geoSquare.logicalWidth).toBe(geoSquare.logicalHeight);
    expect(geoSquare.headlineArea).not.toBeNull();
    expect(geoSquare.imageRect.y).toBeGreaterThan(geoSquare.frameRect.y);
  });

  it("extracts valid hex gradient colors from RGBA pixel buffer", () => {
    const pixels = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      const topHalf = i < pixels.length / 2;
      pixels[i] = topHalf ? 99 : 16;
      pixels[i + 1] = topHalf ? 102 : 185;
      pixels[i + 2] = topHalf ? 241 : 129;
      pixels[i + 3] = 255;
    }

    const result = extractDominantGradient(pixels, 16, 16);
    expect(result.start).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.end).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.start).not.toBe(result.end);
  });
});
