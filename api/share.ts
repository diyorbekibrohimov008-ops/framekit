import { handleShareRequest } from "../src/lib/apiHandlers.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handleShareRequest(request);
    } catch (err) {
      console.error("[FrameKit:/api/share] Unhandled error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
