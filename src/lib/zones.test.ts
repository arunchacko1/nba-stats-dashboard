import { describe, expect, it } from "vitest";
import { classifyZone, zoneSplits } from "./zones";

describe("classifyZone", () => {
  it("calls a shot at the rim the restricted area", () => {
    expect(classifyZone({ x: 0, y: 5.25, value: 2 })).toBe("restricted");
  });

  it("separates the non-restricted paint from mid-range", () => {
    // In the lane, past the restricted arc.
    expect(classifyZone({ x: 0, y: 12, value: 2 })).toBe("paint");
    // A long two from the wing, outside the lane.
    expect(classifyZone({ x: 18, y: 18, value: 2 })).toBe("midrange");
  });

  it("splits threes into corner and above-the-break", () => {
    expect(classifyZone({ x: 23, y: 8, value: 3 })).toBe("corner3");
    expect(classifyZone({ x: 0, y: 28, value: 3 })).toBe("aboveBreak3");
  });
});

describe("zoneSplits", () => {
  const shots = [
    { x: 0, y: 5.25, value: 2 as const, made: true }, // restricted make
    { x: 0, y: 5.25, value: 2 as const, made: false }, // restricted miss
    { x: 23, y: 8, value: 3 as const, made: true }, // corner 3 make
    { x: 0, y: 28, value: 3 as const, made: false }, // above-break 3 miss
  ];

  it("tallies makes and attempts per zone", () => {
    const splits = zoneSplits(shots);
    const restricted = splits.find((s) => s.zone === "restricted")!;
    expect(restricted.attempts).toBe(2);
    expect(restricted.makes).toBe(1);
    expect(restricted.pct).toBe(50);
  });

  it("returns every zone and attempts that sum to the input", () => {
    const splits = zoneSplits(shots);
    expect(splits).toHaveLength(5);
    expect(splits.reduce((sum, s) => sum + s.attempts, 0)).toBe(shots.length);
  });

  it("reports share of total attempts", () => {
    const corner = zoneSplits(shots).find((s) => s.zone === "corner3")!;
    expect(corner.share).toBe(25);
  });

  it("handles an empty shot list without dividing by zero", () => {
    expect(zoneSplits([]).every((s) => s.attempts === 0 && s.pct === 0 && s.share === 0)).toBe(true);
  });
});
