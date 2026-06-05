import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, buildUrl } from "./client";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("buildUrl", () => {
  it("serializes array params as repeated key[] entries", () => {
    const url = buildUrl("/players", { player_ids: [3, 15], per_page: 25 });
    expect(url).toContain("player_ids%5B%5D=3");
    expect(url).toContain("player_ids%5B%5D=15");
    expect(url).toContain("per_page=25");
  });

  it("omits undefined params", () => {
    const url = buildUrl("/players", { search: undefined, per_page: 10 });
    expect(url).not.toContain("search");
    expect(url).toContain("per_page=10");
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("throws when the API key is missing", async () => {
    vi.stubEnv("BALLDONTLIE_API_KEY", "");
    await expect(apiFetch("/teams")).rejects.toThrow(ApiError);
  });

  it("sends the API key and returns parsed JSON", async () => {
    vi.stubEnv("BALLDONTLIE_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ data: Array<{ id: number }> }>("/teams");

    expect(result.data[0].id).toBe(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("secret-key");
  });

  it("retries once after a 429 and honors Retry-After", async () => {
    vi.stubEnv("BALLDONTLIE_API_KEY", "secret-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/standings");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 429 without a Retry-After header", async () => {
    vi.stubEnv("BALLDONTLIE_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/standings")).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws an ApiError carrying the HTTP status on failure", async () => {
    vi.stubEnv("BALLDONTLIE_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(apiFetch("/players/999999")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });
});
