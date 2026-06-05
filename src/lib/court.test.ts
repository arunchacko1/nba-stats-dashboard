import { describe, expect, it } from "vitest";
import { COURT, SVG_WIDTH, isWithinHalfCourt, toSvg } from "./court";

describe("toSvg", () => {
  it("places the baseline center at the top middle of the frame", () => {
    expect(toSvg({ x: 0, y: 0 })).toEqual({ x: SVG_WIDTH / 2, y: 0 });
  });

  it("maps the left and right corners to the frame edges", () => {
    expect(toSvg({ x: -COURT.width / 2, y: 0 }).x).toBe(0);
    expect(toSvg({ x: COURT.width / 2, y: 0 }).x).toBe(SVG_WIDTH);
  });

  it("pushes shots farther from the rim toward larger y", () => {
    const close = toSvg({ x: 0, y: COURT.rimY });
    const deep = toSvg({ x: 0, y: 25 });
    expect(deep.y).toBeGreaterThan(close.y);
  });
});

describe("isWithinHalfCourt", () => {
  it("accepts a normal jump shot", () => {
    expect(isWithinHalfCourt({ x: 18, y: 22 })).toBe(true);
  });

  it("rejects a half-court heave", () => {
    expect(isWithinHalfCourt({ x: 0, y: 60 })).toBe(false);
  });

  it("rejects an out-of-bounds x", () => {
    expect(isWithinHalfCourt({ x: 30, y: 10 })).toBe(false);
  });
});
