import type { Config, Context } from "@netlify/functions";
import {
  extractShareIdFromRequest,
  handleShareRequest,
  type BlobStoreLike,
} from "../../src/lib/apiHandlers.ts";

export { extractShareIdFromRequest, handleShareRequest, type BlobStoreLike };

export default async (req: Request, context: Context) => {
  return handleShareRequest(req, { id: context.params?.id });
};

export const config: Config = {
  path: ["/api/share", "/api/share/:id"],
  method: ["GET", "POST"],
};
