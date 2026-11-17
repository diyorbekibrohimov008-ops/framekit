import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  handleBrandKitRequest,
  handleShareRequest,
  type BlobStoreLike,
} from "./src/lib/apiHandlers.ts";

function createDevBlobStore(): BlobStoreLike {
  const store = new Map<string, { data: string; metadata?: Record<string, unknown> }>();
  return {
    async get(key) {
      return store.get(key)?.data ?? null;
    },
    async getWithMetadata(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      store.set(key, { data: value, metadata: options?.metadata });
    },
  };
}

function framekitDevApiPlugin(): Plugin {
  const shareStore = createDevBlobStore();
  const kitStore = createDevBlobStore();

  return {
    name: "framekit-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/share") && !url.startsWith("/api/brand-kits")) {
          return next();
        }

        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
          const fullUrl = `http://localhost${url}`;
          const webReq = new Request(fullUrl, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body:
              req.method && ["GET", "HEAD"].includes(req.method) ? undefined : body,
          });

          let webRes: Response;
          const pathname = new URL(fullUrl).pathname;
          if (pathname.startsWith("/api/share")) {
            const id = pathname.replace(/^\/api\/share\/?/, "");
            webRes = await handleShareRequest(
              webReq,
              id ? { id } : {},
              shareStore,
            );
          } else {
            const code = pathname.replace(/^\/api\/brand-kits\/?/, "");
            webRes = await handleBrandKitRequest(
              webReq,
              code ? { code } : {},
              kitStore,
            );
          }

          res.statusCode = webRes.status;
          webRes.headers.forEach((v, k) => res.setHeader(k, v));
          const buf = Buffer.from(await webRes.arrayBuffer());
          res.end(buf);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), framekitDevApiPlugin()],
});
