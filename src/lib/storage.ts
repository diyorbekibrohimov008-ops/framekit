import { CURATED_BRAND_KITS, validateBrandKit } from "./brandKits";
import type { BrandKit } from "../types/studio";

const KITS_STORAGE_KEY = "framekit.brandKits.v1";

export function loadSavedBrandKits(): BrandKit[] {
  try {
    const raw = localStorage.getItem(KITS_STORAGE_KEY);
    if (!raw) return CURATED_BRAND_KITS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return CURATED_BRAND_KITS;
    const valid = parsed
      .map((item) => {
        try {
          return validateBrandKit(item);
        } catch {
          return null;
        }
      })
      .filter((k): k is BrandKit => k !== null);
    return valid.length > 0 ? valid : CURATED_BRAND_KITS;
  } catch {
    return CURATED_BRAND_KITS;
  }
}

export function saveBrandKits(kits: BrandKit[]): void {
  try {
    localStorage.setItem(KITS_STORAGE_KEY, JSON.stringify(kits));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export interface PublishSharePayload {
  title: string;
  width: number;
  height: number;
  brandKitName?: string;
  redactedCount: number;
  imageDataUrl: string;
}

export interface PublishShareResult {
  id: string;
  shareUrl: string;
  createdAt: string;
}

export async function publishShare(
  payload: PublishSharePayload,
): Promise<PublishShareResult> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Share failed (${res.status})`);
  }
  return (await res.json()) as PublishShareResult;
}

export async function fetchShareById(id: string): Promise<{
  id: string;
  title: string;
  width: number;
  height: number;
  brandKitName?: string;
  redactedCount: number;
  createdAt: string;
  imageDataUrl: string;
}> {
  const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Share not found (${res.status})`);
  }
  return res.json();
}

export async function syncBrandKitToCloud(kit: BrandKit): Promise<BrandKit> {
  if (!kit.teamCode) {
    throw new Error("Generate or enter a Team Code before syncing");
  }
  const res = await fetch(
    `/api/brand-kits/${encodeURIComponent(kit.teamCode)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kit),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Sync failed (${res.status})`);
  }
  return validateBrandKit(await res.json());
}

export async function pullBrandKitFromCloud(code: string): Promise<BrandKit> {
  const clean = code.trim().toUpperCase();
  const res = await fetch(`/api/brand-kits/${encodeURIComponent(clean)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Team Kit "${clean}" not found`);
  }
  return validateBrandKit(await res.json());
}
