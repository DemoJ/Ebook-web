import { booksApi } from "../api/books";

const CACHE_NAME = "leafread-epub-v1";
const LOCATIONS_PREFIX = "/__leafread/locations/";

function fileCacheUrl(bookId: string) {
  return `/__leafread/epub/${bookId}`;
}

function locationsCacheUrl(bookId: string) {
  return `${LOCATIONS_PREFIX}${bookId}`;
}

async function openCache() {
  if (!("caches" in globalThis)) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function loadEpubBuffer(bookId: string): Promise<ArrayBuffer> {
  const cache = await openCache();
  const cacheUrl = fileCacheUrl(bookId);

  if (cache) {
    const hit = await cache.match(cacheUrl);
    if (hit) return hit.arrayBuffer();
  }

  const response = await fetch(booksApi.fileUrl(bookId), { credentials: "include" });
  if (!response.ok) throw new Error(`无法加载书籍文件（${response.status}）`);

  const buffer = await response.arrayBuffer();

  if (cache) {
    try {
      await cache.put(
        cacheUrl,
        new Response(buffer.slice(0), {
          headers: { "Content-Type": "application/epub+zip" },
        }),
      );
    } catch {
      // quota / private mode — ignore
    }
  }

  return buffer;
}

export async function loadCachedLocations(bookId: string): Promise<string | null> {
  const cache = await openCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(locationsCacheUrl(bookId));
    if (!hit) return null;
    return hit.text();
  } catch {
    return null;
  }
}

export async function saveCachedLocations(bookId: string, locations: string): Promise<void> {
  const cache = await openCache();
  if (!cache || !locations) return;
  try {
    await cache.put(
      locationsCacheUrl(bookId),
      new Response(locations, {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch {
    // ignore cache write failures
  }
}
