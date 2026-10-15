interface Window {
  adsbygoogle?: Array<Record<string, unknown>>;
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    ASSETS: Fetcher;
  }
}
