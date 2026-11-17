export type AspectRatioPreset =
  | "auto"
  | "16:9"
  | "4:3"
  | "1:1"
  | "4:5"
  | "9:16"
  | "2:1";

export type WindowFrameStyle =
  | "none"
  | "macos-dark"
  | "macos-light"
  | "windows-11"
  | "browser-glass";

export type BackgroundKind = "gradient" | "solid" | "transparent" | "mesh";

export interface BackgroundStyle {
  kind: BackgroundKind;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  solidColor: string;
  meshAccent?: string;
}

export type RedactionCategory =
  | "credit_card"
  | "email"
  | "phone"
  | "api_key"
  | "ip_address";

export type RedactionStyle = "blur" | "pixelate" | "solid";

export interface RedactionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: RedactionCategory | "manual";
  label: string;
  maskedPreview?: string;
  enabled: boolean;
  source: "auto" | "manual";
}

export type AnnotationKind = "arrow" | "rect" | "text" | "badge";

export interface AnnotationItem {
  id: string;
  kind: AnnotationKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  number?: number;
}

export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "footer-bar";

export type FontFamilyOption =
  | "Inter"
  | "Plus Jakarta Sans"
  | "JetBrains Mono"
  | "Space Grotesk";

export interface BrandKit {
  id: string;
  name: string;
  teamCode?: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  bgAngle: number;
  fontFamily: FontFamilyOption;
  defaultAspectRatio: AspectRatioPreset;
  defaultPadding: number;
  borderRadius: number;
  windowFrame: WindowFrameStyle;
  logoDataUrl?: string;
  watermarkText: string;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  updatedAt: string;
}

export interface CanvasSettings {
  aspectRatio: AspectRatioPreset;
  padding: number;
  borderRadius: number;
  shadowIntensity: number;
  insetBorder: boolean;
  windowFrame: WindowFrameStyle;
  windowTitle: string;
  browserUrl: string;
  background: BackgroundStyle;
  redactionStyle: RedactionStyle;
  redactionIntensity: number;
  exportScale: 1 | 2 | 3;
  headline: string;
  subheadline: string;
  showHeadline: boolean;
  activeBrandKitId: string | null;
}

export interface OcrWord {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  lineId?: number;
}

export interface ShareRecord {
  id: string;
  title: string;
  width: number;
  height: number;
  brandKitName?: string;
  redactedCount: number;
  createdAt: string;
  imageMime: string;
}
