import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), ".hidden-blogs-cache.json");

// In-memory fallback
let memoryCache: Record<string, boolean> = {};

export function getServerHiddenBlogsMap(): Record<string, boolean> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      memoryCache = JSON.parse(raw);
      return memoryCache;
    }
  } catch {}
  return memoryCache;
}

export function setServerBlogHidden(id: string, hidden: boolean): Record<string, boolean> {
  if (!id) return getServerHiddenBlogsMap();
  const current = getServerHiddenBlogsMap();
  if (hidden) {
    current[id] = true;
  } else {
    delete current[id];
  }
  memoryCache = { ...current };

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2), "utf-8");
  } catch {}

  return memoryCache;
}

export function setServerHiddenBlogsMap(map: Record<string, boolean>): Record<string, boolean> {
  memoryCache = { ...map };
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2), "utf-8");
  } catch {}
  return memoryCache;
}
