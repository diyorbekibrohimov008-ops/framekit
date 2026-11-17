import type {
  AspectRatioPreset,
  BrandKit,
  FontFamilyOption,
  WatermarkPosition,
  WindowFrameStyle,
} from "../types/studio";

export const CURATED_BRAND_KITS: BrandKit[] = [
  {
    id: "kit-framekit-obsidian",
    name: "FrameKit Studio",
    teamCode: "FRMK-2026",
    primaryHex: "#6366f1",
    secondaryHex: "#0f172a",
    accentHex: "#22d3ee",
    bgGradientStart: "#1e1b4b",
    bgGradientEnd: "#090d16",
    bgAngle: 135,
    fontFamily: "Plus Jakarta Sans",
    defaultAspectRatio: "16:9",
    defaultPadding: 64,
    borderRadius: 16,
    windowFrame: "macos-dark",
    watermarkText: "framekit.app",
    watermarkPosition: "bottom-right",
    watermarkOpacity: 0.78,
    updatedAt: "2026-11-11T00:00:00.000Z",
  },
  {
    id: "kit-acme-saas",
    name: "Acme SaaS Marketing",
    teamCode: "ACME-4040",
    primaryHex: "#4f46e5",
    secondaryHex: "#f8fafc",
    accentHex: "#06b6d4",
    bgGradientStart: "#312e81",
    bgGradientEnd: "#0ea5e9",
    bgAngle: 128,
    fontFamily: "Plus Jakarta Sans",
    defaultAspectRatio: "16:9",
    defaultPadding: 72,
    borderRadius: 18,
    windowFrame: "browser-glass",
    watermarkText: "acme.io • Product Update",
    watermarkPosition: "footer-bar",
    watermarkOpacity: 0.9,
    updatedAt: "2026-11-11T00:00:00.000Z",
  },
  {
    id: "kit-dev-docs",
    name: "DevTools Docs",
    teamCode: "DEVS-8080",
    primaryHex: "#10b981",
    secondaryHex: "#111827",
    accentHex: "#34d399",
    bgGradientStart: "#064e3b",
    bgGradientEnd: "#0f172a",
    bgAngle: 150,
    fontFamily: "JetBrains Mono",
    defaultAspectRatio: "4:3",
    defaultPadding: 56,
    borderRadius: 12,
    windowFrame: "windows-11",
    watermarkText: "docs.devstack.dev",
    watermarkPosition: "bottom-left",
    watermarkOpacity: 0.8,
    updatedAt: "2026-11-11T00:00:00.000Z",
  },
  {
    id: "kit-launch-social",
    name: "Launch Social 4:5",
    teamCode: "LNCH-9090",
    primaryHex: "#ec4899",
    secondaryHex: "#18181b",
    accentHex: "#f59e0b",
    bgGradientStart: "#701a75",
    bgGradientEnd: "#ea580c",
    bgAngle: 140,
    fontFamily: "Space Grotesk",
    defaultAspectRatio: "4:5",
    defaultPadding: 56,
    borderRadius: 20,
    windowFrame: "macos-light",
    watermarkText: "@launchhq",
    watermarkPosition: "top-right",
    watermarkOpacity: 0.85,
    updatedAt: "2026-11-11T00:00:00.000Z",
  },
];

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_DATA_IMAGE_REGEX =
  /^data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;
const VALID_FONTS = new Set<FontFamilyOption>([
  "Inter",
  "Plus Jakarta Sans",
  "JetBrains Mono",
  "Space Grotesk",
]);
const VALID_ASPECTS = new Set<AspectRatioPreset>([
  "auto",
  "16:9",
  "4:3",
  "1:1",
  "4:5",
  "9:16",
  "2:1",
]);
const VALID_FRAMES = new Set<WindowFrameStyle>([
  "none",
  "macos-dark",
  "macos-light",
  "windows-11",
  "browser-glass",
]);
const VALID_POSITIONS = new Set<WatermarkPosition>([
  "bottom-right",
  "bottom-left",
  "top-right",
  "footer-bar",
]);

function assertHex(val: unknown, field: string): string {
  if (typeof val !== "string" || !HEX_REGEX.test(val)) {
    throw new Error(`Invalid hex color for ${field}`);
  }
  return val;
}

function assertSafeLogo(val: unknown): string | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val !== "string") {
    throw new Error("Invalid logo data URL");
  }
  if (val.length > 500_000) {
    throw new Error("Logo file is too large (max ~350KB)");
  }
  if (SAFE_DATA_IMAGE_REGEX.test(val) || val.startsWith("https://")) {
    return val;
  }
  throw new Error("Unsafe logo URL protocol; use PNG, JPG, WebP, SVG, or HTTPS");
}

export function validateBrandKit(raw: unknown): BrandKit {
  if (!raw || typeof raw !== "object") {
    throw new Error("Brand Kit must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name || name.length > 80) {
    throw new Error("Brand Kit name must be 1-80 characters");
  }

  const fontFamily = VALID_FONTS.has(obj.fontFamily as FontFamilyOption)
    ? (obj.fontFamily as FontFamilyOption)
    : "Inter";
  const defaultAspectRatio = VALID_ASPECTS.has(
    obj.defaultAspectRatio as AspectRatioPreset,
  )
    ? (obj.defaultAspectRatio as AspectRatioPreset)
    : "16:9";
  const windowFrame = VALID_FRAMES.has(obj.windowFrame as WindowFrameStyle)
    ? (obj.windowFrame as WindowFrameStyle)
    : "macos-dark";
  const watermarkPosition = VALID_POSITIONS.has(
    obj.watermarkPosition as WatermarkPosition,
  )
    ? (obj.watermarkPosition as WatermarkPosition)
    : "bottom-right";

  const padding =
    typeof obj.defaultPadding === "number" && Number.isFinite(obj.defaultPadding)
      ? Math.max(0, Math.min(180, Math.round(obj.defaultPadding)))
      : 64;
  const borderRadius =
    typeof obj.borderRadius === "number" && Number.isFinite(obj.borderRadius)
      ? Math.max(0, Math.min(48, Math.round(obj.borderRadius)))
      : 16;
  const bgAngle =
    typeof obj.bgAngle === "number" && Number.isFinite(obj.bgAngle)
      ? Math.round(obj.bgAngle) % 360
      : 135;
  const watermarkOpacity =
    typeof obj.watermarkOpacity === "number" &&
    Number.isFinite(obj.watermarkOpacity)
      ? Math.max(0.1, Math.min(1, obj.watermarkOpacity))
      : 0.8;

  const teamCode =
    typeof obj.teamCode === "string" &&
    /^[A-Z0-9-]{4,24}$/i.test(obj.teamCode.trim())
      ? obj.teamCode.trim().toUpperCase()
      : undefined;

  return {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim().slice(0, 64)
        : `kit-${Date.now().toString(36)}`,
    name,
    teamCode,
    primaryHex: assertHex(obj.primaryHex, "primaryHex"),
    secondaryHex: assertHex(obj.secondaryHex, "secondaryHex"),
    accentHex: assertHex(obj.accentHex, "accentHex"),
    bgGradientStart: assertHex(obj.bgGradientStart, "bgGradientStart"),
    bgGradientEnd: assertHex(obj.bgGradientEnd, "bgGradientEnd"),
    bgAngle,
    fontFamily,
    defaultAspectRatio,
    defaultPadding: padding,
    borderRadius,
    windowFrame,
    logoDataUrl: assertSafeLogo(obj.logoDataUrl),
    watermarkText:
      typeof obj.watermarkText === "string"
        ? obj.watermarkText.slice(0, 80)
        : "",
    watermarkPosition,
    watermarkOpacity,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

export function serializeBrandKit(kit: BrandKit): string {
  return JSON.stringify(validateBrandKit(kit), null, 2);
}

export function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `${part(4)}-${part(4)}`;
}
