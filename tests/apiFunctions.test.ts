import { describe, expect, it } from "vitest";
import { handleBrandKitRequest } from "../netlify/functions/brand-kits.mts";
import { handleShareRequest } from "../netlify/functions/share.mts";
import vercelShareHandler from "../api/share.ts";
import vercelBrandKitHandler from "../api/brand-kits.ts";

function createMemoryBlobStore() {
  const map = new Map<string, { value: string; metadata?: Record<string, unknown> }>();
  return {
    async get(key: string) {
      return map.get(key)?.value ?? null;
    },
    async getWithMetadata(key: string) {
      const hit = map.get(key);
      if (!hit) return null;
      return { data: hit.value, metadata: hit.metadata ?? {} };
    },
    async set(key: string, value: string, opts?: { metadata?: Record<string, unknown> }) {
      map.set(key, { value, metadata: opts?.metadata });
    },
    async setJSON(key: string, value: unknown, opts?: { metadata?: Record<string, unknown> }) {
      map.set(key, { value: JSON.stringify(value), metadata: opts?.metadata });
    },
  };
}

describe("Netlify share & brand-kit API handlers", () => {
  it("stores and retrieves a shared mockup via POST /api/share and GET /api/share/:id", async () => {
    const store = createMemoryBlobStore();
    const fakePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const createReq = new Request("https://example.com/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Billing Dashboard",
        width: 1280,
        height: 800,
        brandKitName: "Acme SaaS",
        redactedCount: 3,
        imageDataUrl: `data:image/png;base64,${fakePngBase64}`,
      }),
    });

    const createRes = await handleShareRequest(createReq, {}, store);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; shareUrl: string };
    expect(created.id).toMatch(/^[a-zA-Z0-9_-]{6,}$/);

    const metaRes = await handleShareRequest(
      new Request(`https://example.com/api/share/${created.id}`),
      { id: created.id },
      store,
    );
    expect(metaRes.status).toBe(200);
    const meta = (await metaRes.json()) as { title: string; redactedCount: number; imageDataUrl: string };
    expect(meta.title).toBe("Billing Dashboard");
    expect(meta.redactedCount).toBe(3);
    expect(meta.imageDataUrl).toContain(fakePngBase64);
  });

  it("rejects invalid payloads and missing share IDs cleanly", async () => {
    const store = createMemoryBlobStore();
    const badReq = new Request("https://example.com/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl: "javascript:alert(1)" }),
    });
    const badRes = await handleShareRequest(badReq, {}, store);
    expect(badRes.status).toBe(400);

    const missingRes = await handleShareRequest(
      new Request("https://example.com/api/share/unknown99"),
      { id: "unknown99" },
      store,
    );
    expect(missingRes.status).toBe(404);
  });

  it("saves and syncs a Team Brand Kit via PUT and GET /api/brand-kits/:code", async () => {
    const store = createMemoryBlobStore();
    const putReq = new Request("https://example.com/api/brand-kits/ACME-2026", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "kit-acme",
        name: "Acme Design System",
        teamCode: "ACME-2026",
        primaryHex: "#6366f1",
        secondaryHex: "#0f172a",
        accentHex: "#22d3ee",
        bgGradientStart: "#1e1b4b",
        bgGradientEnd: "#0f172a",
        bgAngle: 135,
        fontFamily: "Plus Jakarta Sans",
        defaultAspectRatio: "16:9",
        defaultPadding: 64,
        borderRadius: 16,
        windowFrame: "macos-dark",
        watermarkText: "acme.io",
        watermarkPosition: "bottom-right",
        watermarkOpacity: 0.85,
        updatedAt: "2026-11-11T15:00:00.000Z",
      }),
    });

    const putRes = await handleBrandKitRequest(putReq, { code: "ACME-2026" }, store);
    expect(putRes.status).toBe(200);

    const getRes = await handleBrandKitRequest(
      new Request("https://example.com/api/brand-kits/ACME-2026"),
      { code: "ACME-2026" },
      store,
    );
    expect(getRes.status).toBe(200);
    const synced = (await getRes.json()) as { name: string; teamCode: string };
    expect(synced.name).toBe("Acme Design System");
    expect(synced.teamCode).toBe("ACME-2026");

    const vercelRewrittenGet = await handleBrandKitRequest(
      new Request("https://example.com/api/brand-kits?code=acme-2026"),
      {},
      store,
    );
    expect(vercelRewrittenGet.status).toBe(200);
  });

  it("handles Vercel rewritten requests through api/share.ts and api/brand-kits.ts entrypoints", async () => {
    const fakePngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const postRes = await vercelShareHandler.fetch(
      new Request("https://framekit.vercel.app/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Vercel Entry Test",
          imageDataUrl: `data:image/png;base64,${fakePngBase64}`,
        }),
      }),
    );
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()) as { id: string };

    const getRes = await vercelShareHandler.fetch(
      new Request(`https://framekit.vercel.app/api/share?id=${created.id}`),
    );
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as { title: string };
    expect(fetched.title).toBe("Vercel Entry Test");

    const kitPut = await vercelBrandKitHandler.fetch(
      new Request("https://framekit.vercel.app/api/brand-kits?code=VRCK-2026", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "kit-vrck",
          name: "Vercel Parity Kit",
          primaryHex: "#6366f1",
          secondaryHex: "#0f172a",
          accentHex: "#22d3ee",
          bgGradientStart: "#1e1b4b",
          bgGradientEnd: "#090d16",
          bgAngle: 135,
          fontFamily: "Space Grotesk",
          defaultAspectRatio: "4:5",
          defaultPadding: 72,
          borderRadius: 18,
          windowFrame: "browser-glass",
          watermarkText: "vrck.app",
          watermarkPosition: "footer-bar",
          watermarkOpacity: 0.9,
        }),
      }),
    );
    expect(kitPut.status).toBe(200);
    const savedKit = (await kitPut.json()) as {
      defaultAspectRatio: string;
      windowFrame: string;
      watermarkPosition: string;
    };
    expect(savedKit.defaultAspectRatio).toBe("4:5");
    expect(savedKit.windowFrame).toBe("browser-glass");
    expect(savedKit.watermarkPosition).toBe("footer-bar");
  });
});
