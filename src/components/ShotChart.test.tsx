import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShotChart, describeHex } from "./ShotChart";
import type { Shot } from "@/lib/shots";

// Hexbins are filled with a color-scale rgb() string while the court lines use
// fill="none", so the presence of fill="rgb is a reliable signal that bins drew.
describe("ShotChart", () => {
  it("draws the court even with no shots, and no hexbins", () => {
    const html = renderToStaticMarkup(<ShotChart shots={[]} />);
    expect(html).toContain("<svg");
    expect(html).not.toContain('fill="rgb');
  });

  it("draws hexbins for a cluster of shots", () => {
    const shots: Shot[] = Array.from({ length: 25 }, () => ({ x: 0, y: 6, made: true, value: 2 }));
    const html = renderToStaticMarkup(<ShotChart shots={shots} />);
    expect(html).toContain('fill="rgb');
  });

  it("drops shots beyond half court", () => {
    const heaves: Shot[] = [{ x: 0, y: 80, made: true, value: 3 }];
    const html = renderToStaticMarkup(<ShotChart shots={heaves} />);
    expect(html).not.toContain('fill="rgb');
  });
});

describe("describeHex", () => {
  it("reports the rounded make percentage with makes and attempts", () => {
    expect(describeHex({ made: 3, count: 6 })).toEqual({ pct: 50, made: 3, attempts: 6 });
  });

  it("rounds to the nearest whole percent", () => {
    expect(describeHex({ made: 1, count: 3 }).pct).toBe(33);
    expect(describeHex({ made: 2, count: 3 }).pct).toBe(67);
  });
});
