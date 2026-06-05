import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShotChart } from "./ShotChart";
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
    const shots: Shot[] = Array.from({ length: 25 }, () => ({ x: 0, y: 6, made: true }));
    const html = renderToStaticMarkup(<ShotChart shots={shots} />);
    expect(html).toContain('fill="rgb');
  });

  it("drops shots beyond half court", () => {
    const heaves: Shot[] = [{ x: 0, y: 80, made: true }];
    const html = renderToStaticMarkup(<ShotChart shots={heaves} />);
    expect(html).not.toContain('fill="rgb');
  });
});
