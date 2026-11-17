import { handleBrandKitRequest } from "../src/lib/apiHandlers.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handleBrandKitRequest(request);
    } catch (err) {
      console.error("[FrameKit:/api/brand-kits] Unhandled error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
