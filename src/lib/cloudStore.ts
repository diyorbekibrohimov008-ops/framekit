import { BlobNotFoundError, get, put } from "@vercel/blob";

export interface BlobStoreLike {
  get(key: string): Promise<string | null>;
  getWithMetadata?(
    key: string,
  ): Promise<{ data: string; metadata?: Record<string, unknown> } | null>;
  set(
    key: string,
    value: string,
    options?: { metadata?: Record<string, unknown> },
  ): Promise<unknown>;
}

const memoryStores = new Map<string, Map<string, string>>();

function getEnv(): Record<string, string | undefined> {
  const g = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return g.process?.env ?? {};
}

function getMemoryStore(namespace: string): BlobStoreLike {
  let map = memoryStores.get(namespace);
  if (!map) {
    map = new Map<string, string>();
    memoryStores.set(namespace, map);
  }
  return {
    async get(key: string) {
      return map!.get(key) ?? null;
    },
    async getWithMetadata(key: string) {
      const data = map!.get(key);
      return data !== undefined ? { data } : null;
    },
    async set(key: string, value: string) {
      map!.set(key, value);
    },
  };
}

function createVercelBlobStore(namespace: string): BlobStoreLike {
  const toPath = (key: string) => `${namespace}/${key}.json`;

  return {
    async get(key: string): Promise<string | null> {
      try {
        const result = await get(toPath(key), {
          access: "public",
          useCache: false,
        });
        if (!result || result.statusCode !== 200 || !result.stream) {
          return null;
        }
        return await new Response(result.stream).text();
      } catch (err) {
        if (
          err instanceof BlobNotFoundError ||
          (err instanceof Error && err.name === "BlobNotFoundError")
        ) {
          return null;
        }
        console.error("FrameKit Vercel Blob read error:", namespace, err);
        return null;
      }
    },
    async getWithMetadata(key: string) {
      const data = await this.get(key);
      return data !== null ? { data } : null;
    },
    async set(key: string, value: string): Promise<unknown> {
      return await put(toPath(key), value, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
  };
}

function createNetlifyBlobStore(namespace: string): BlobStoreLike {
  let storePromise: Promise<BlobStoreLike> | null = null;
  const loadStore = () => {
    if (!storePromise) {
      storePromise = import("@netlify/blobs").then(
        ({ getStore }) => getStore(namespace) as unknown as BlobStoreLike,
      );
    }
    return storePromise;
  };

  return {
    async get(key: string) {
      return (await loadStore()).get(key);
    },
    async getWithMetadata(key: string) {
      const store = await loadStore();
      return store.getWithMetadata ? store.getWithMetadata(key) : null;
    },
    async set(
      key: string,
      value: string,
      options?: { metadata?: Record<string, unknown> },
    ) {
      return (await loadStore()).set(key, value, options);
    },
  };
}

export function getCloudStore(namespace: string): BlobStoreLike {
  const env = getEnv();
  if (env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID) {
    return createVercelBlobStore(namespace);
  }
  if (env.NETLIFY || env.NETLIFY_BLOBS_CONTEXT) {
    return createNetlifyBlobStore(namespace);
  }
  return getMemoryStore(namespace);
}
