import type { Config, Context } from "@netlify/functions";
import {
  extractBrandKitCodeFromRequest,
  handleBrandKitRequest,
} from "../../src/lib/apiHandlers.ts";

export { extractBrandKitCodeFromRequest, handleBrandKitRequest };

export default async (req: Request, context: Context) => {
  return handleBrandKitRequest(req, { code: context.params?.code });
};

export const config: Config = {
  path: "/api/brand-kits/:code",
  method: ["GET", "PUT", "POST"],
};
