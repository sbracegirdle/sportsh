import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export type FetchTextOptions = {
  ttlMs?: number;
  fresh?: boolean;
};

export async function fetchCachedText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cachePath = cacheFilePath(url);

  if (!options.fresh && await isFresh(cachePath, ttlMs)) {
    return readFile(cachePath, "utf8");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 sportsh/0.1",
      },
    });
  } catch (error) {
    if (await exists(cachePath)) {
      return readFile(cachePath, "utf8");
    }

    throw error;
  }

  if (!response.ok) {
    if (await exists(cachePath)) {
      return readFile(cachePath, "utf8");
    }

    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  await mkdir(cacheRoot(), { recursive: true });
  await writeFile(cachePath, text, "utf8");
  return text;
}

function cacheRoot(): string {
  return process.env.SPORTSH_CACHE_DIR
    ?? (process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "sportsh") : join(homedir(), ".cache", "sportsh"));
}

function cacheFilePath(url: string): string {
  const digest = createHash("sha256").update(url).digest("hex");
  return join(cacheRoot(), `${digest}.html`);
}

async function isFresh(path: string, ttlMs: number): Promise<boolean> {
  try {
    const stats = await stat(path);
    return Date.now() - stats.mtimeMs < ttlMs;
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
