/** Small browser-only request cache. Never shares authenticated data across tokens. */
const completed = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 180;

export function clearRequestCache(prefix: string): void {
  for (const key of completed.keys()) if (key.startsWith(prefix)) completed.delete(key);
  // In-flight requests are detached so older responses cannot overwrite new cache entries.
  for (const key of pending.keys()) if (key.startsWith(prefix)) pending.delete(key);
}

export function cachedRequest<T>(
  key: string,
  ttlMs: number,
  request: () => Promise<T>
): Promise<T> {
  if (typeof window === "undefined") return request();
  const existing = completed.get(key);
  if (existing && existing.expires > Date.now()) return Promise.resolve(existing.value as T);
  completed.delete(key);
  const running = pending.get(key);
  if (running) return running as Promise<T>;

  const promise = request().then((value) => {
    // Do not reinsert a response invalidated while it was in flight.
    if (pending.get(key) === promise) {
      if (completed.size >= MAX_ENTRIES) completed.delete(completed.keys().next().value!);
      completed.set(key, { value, expires: Date.now() + ttlMs });
    }
    return value;
  }).finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
