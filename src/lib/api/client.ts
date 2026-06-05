const BASE_URL = "https://api.balldontlie.io/v1";

// balldontlie's free tier caps out around a handful of requests per minute and
// answers with 429 + Retry-After (observed up to ~60s) when you cross it. A
// multi-page sweep — e.g. reconstructing standings from a full season — trips
// this repeatedly, so we honor the header through several throttles rather than
// failing the whole render. Bounded so a misbehaving endpoint can't hang a build.
const MAX_RETRY_DELAY_MS = 60_000;
const MAX_ATTEMPTS = 6;
const DEFAULT_REVALIDATE_SECONDS = 3600;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | Array<string | number>;

export interface RequestOptions {
  params?: Record<string, QueryValue | undefined>;
  revalidate?: number;
}

export function buildUrl(path: string, params: RequestOptions["params"]): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      // balldontlie expects repeated array params, e.g. player_ids[]=1&player_ids[]=2
      for (const item of value) url.searchParams.append(`${key}[]`, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    throw new ApiError("BALLDONTLIE_API_KEY is not set", 0);
  }

  const url = buildUrl(path, options.params);
  const init: RequestInit & { next: { revalidate: number } } = {
    headers: { Authorization: apiKey },
    next: { revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS },
  };

  let response = await fetch(url, init);

  // Retry through repeated throttling for as long as the server keeps telling us
  // how long to wait, up to a bounded number of attempts. A 429 without a usable
  // Retry-After is treated as terminal — we have nothing to back off on.
  for (let attempt = 1; response.status === 429 && attempt < MAX_ATTEMPTS; attempt += 1) {
    const delayMs = parseRetryAfter(response.headers.get("retry-after"));
    if (delayMs === null) break;
    await sleep(delayMs);
    response = await fetch(url, init);
  }

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
