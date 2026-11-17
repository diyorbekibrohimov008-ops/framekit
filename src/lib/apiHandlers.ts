import { validateBrandKit } from "./brandKits.ts";
import { getCloudStore, type BlobStoreLike } from "./cloudStore.ts";

export type { BlobStoreLike };

const VALID_DATA_IMAGE_URL =
  /^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{6,40}$/;
const TEAM_CODE_REGEX = /^[A-Z0-9-]{4,24}$/i;
const MAX_PAYLOAD_BYTES = 5_200_000;

function randomId(length = 10): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function extractShareIdFromRequest(
  req: Request,
  explicitId?: string,
): string {
  if (explicitId && explicitId.trim()) {
    return explicitId.trim();
  }
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get("id");
    if (queryId && queryId.trim()) {
      return queryId.trim();
    }
    const match = url.pathname.match(/\/api\/share\/([^/?#]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  } catch {
    // ignore malformed URL
  }
  return "";
}

export function extractBrandKitCodeFromRequest(
  req: Request,
  explicitCode?: string,
): string {
  if (explicitCode && explicitCode.trim()) {
    return explicitCode.trim().toUpperCase();
  }
  try {
    const url = new URL(req.url);
    const queryCode = url.searchParams.get("code");
    if (queryCode && queryCode.trim()) {
      return queryCode.trim().toUpperCase();
    }
    const match = url.pathname.match(/\/api\/brand-kits\/([^/?#]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim().toUpperCase();
    }
  } catch {
    // ignore malformed URL
  }
  return "";
}

export async function handleShareRequest(
  req: Request,
  params: { id?: string } = {},
  storeOverride?: BlobStoreLike,
): Promise<Response> {
  const store = storeOverride ?? getCloudStore("framekit-shares");

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const imageDataUrl = body.imageDataUrl;
    if (
      typeof imageDataUrl !== "string" ||
      !VALID_DATA_IMAGE_URL.test(imageDataUrl) ||
      imageDataUrl.length > MAX_PAYLOAD_BYTES
    ) {
      return Response.json(
        { error: "Invalid or oversized imageDataUrl (PNG/WebP/JPEG max 5MB)" },
        { status: 400 },
      );
    }

    const id = randomId(10);
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : "Untitled Mockup";
    const width =
      typeof body.width === "number" && body.width > 0
        ? Math.round(body.width)
        : 1200;
    const height =
      typeof body.height === "number" && body.height > 0
        ? Math.round(body.height)
        : 800;
    const brandKitName =
      typeof body.brandKitName === "string" && body.brandKitName.trim()
        ? body.brandKitName.trim().slice(0, 80)
        : undefined;
    const redactedCount =
      typeof body.redactedCount === "number" && body.redactedCount >= 0
        ? Math.round(body.redactedCount)
        : 0;

    const record = {
      id,
      title,
      width,
      height,
      brandKitName,
      redactedCount,
      createdAt: new Date().toISOString(),
      imageDataUrl,
    };

    await store.set(id, JSON.stringify(record), {
      metadata: { title, createdAt: record.createdAt },
    });

    return Response.json(
      {
        id,
        shareUrl: `/s/${id}`,
        createdAt: record.createdAt,
      },
      { status: 201 },
    );
  }

  if (req.method === "GET") {
    const id = extractShareIdFromRequest(req, params.id);
    if (!SAFE_ID_REGEX.test(id)) {
      return Response.json({ error: "Invalid share ID" }, { status: 400 });
    }

    const raw = await store.get(id);
    if (raw === null) {
      return Response.json({ error: "Shared mockup not found" }, { status: 404 });
    }

    return new Response(raw, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export async function handleBrandKitRequest(
  req: Request,
  params: { code?: string } = {},
  storeOverride?: BlobStoreLike,
): Promise<Response> {
  const code = extractBrandKitCodeFromRequest(req, params.code);
  if (!TEAM_CODE_REGEX.test(code)) {
    return Response.json({ error: "Invalid team kit code" }, { status: 400 });
  }

  const store = storeOverride ?? getCloudStore("framekit-brand-kits");

  if (req.method === "PUT" || req.method === "POST") {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    try {
      const validated = validateBrandKit({
        ...(payload as Record<string, unknown>),
        teamCode: code,
        updatedAt: new Date().toISOString(),
      });
      await store.set(code, JSON.stringify(validated), {
        metadata: { name: validated.name, updatedAt: validated.updatedAt },
      });
      return Response.json(validated, { status: 200 });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Invalid Brand Kit" },
        { status: 400 },
      );
    }
  }

  if (req.method === "GET") {
    const raw = await store.get(code);
    if (raw === null) {
      return Response.json({ error: "Team Brand Kit not found" }, { status: 404 });
    }
    return new Response(raw, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-cache",
      },
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
