import { describe, expect, it } from "vitest";
import { headshotUrl } from "./headshot";

describe("headshotUrl", () => {
  it("builds the ESPN headshot URL from an athlete id", () => {
    expect(headshotUrl("3945274")).toBe(
      "https://a.espncdn.com/i/headshots/nba/players/full/3945274.png",
    );
  });
});
