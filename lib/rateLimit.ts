type RateLimitEntry = {
  count: number;
  firstRequestAt: number;
};

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 3;

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.firstRequestAt > WINDOW_MS) {
    store.set(ip, { count: 1, firstRequestAt: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetInMs: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    const resetInMs = WINDOW_MS - (now - entry.firstRequestAt);
    return { allowed: false, remaining: 0, resetInMs };
  }

  entry.count += 1;
  store.set(ip, entry);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetInMs: WINDOW_MS - (now - entry.firstRequestAt),
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstRequestAt > WINDOW_MS) {
      store.delete(key);
    }
  }
}, WINDOW_MS);
