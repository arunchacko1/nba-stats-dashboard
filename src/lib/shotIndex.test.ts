import { describe, expect, it } from "vitest";
import { getShootingStats } from "./shooting";
import { getShotPlayerIds, hasShotMap } from "./shotIndex";

// Guards the link between the two data sources: every player with a committed
// shot map must also appear in the shooting dataset, so the detail page can
// always render stats alongside a chart.
describe("shot index", () => {
  const ids = getShotPlayerIds();

  it("exposes the featured set of shot-map players", () => {
    expect(ids.size).toBeGreaterThan(0);
  });

  it("reports membership through hasShotMap", () => {
    const [first] = ids;
    expect(hasShotMap(first)).toBe(true);
    expect(hasShotMap("not-a-real-id")).toBe(false);
  });

  it("only references players that exist in the shooting dataset", () => {
    const statIds = new Set(getShootingStats().players.map((player) => player.id));
    for (const id of ids) {
      expect(statIds.has(id)).toBe(true);
    }
  });
});
