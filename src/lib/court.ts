// NBA half-court geometry in feet. The shot dataset places the rim at (0, 5.25)
// with x running -25..25 across the baseline, so these line up with the data and
// drive both the coordinate transform and the SVG court drawing.
export const COURT = {
  width: 50,
  length: 47,
  rimX: 0,
  rimY: 5.25,
  rimRadius: 0.75,
  backboardY: 4,
  backboardWidth: 6,
  laneWidth: 16,
  freeThrowLineY: 19,
  freeThrowRadius: 6,
  threeRadius: 23.75,
  cornerThreeX: 22,
  cornerThreeSideY: 14,
  restrictedRadius: 4,
} as const;

// Pixels per foot. The viewBox is sized so one SVG unit maps to 0.1 ft.
export const SCALE = 10;
export const SVG_WIDTH = COURT.width * SCALE;
export const SVG_LENGTH = COURT.length * SCALE;

export interface Point {
  x: number;
  y: number;
}

// Map a shot in court feet to SVG space, with the rim near the top of the frame
// and shots fanning downward toward half court.
export function toSvg(point: Point): Point {
  return {
    x: (point.x + COURT.width / 2) * SCALE,
    y: point.y * SCALE,
  };
}

// Inverse of toSvg: recover court feet from an SVG coordinate. Used to look up a
// hexbin's location in the league-average grid.
export function fromSvg(point: Point): Point {
  return {
    x: point.x / SCALE - COURT.width / 2,
    y: point.y / SCALE,
  };
}

// Shots past half court are almost always desperation heaves; keeping them would
// stretch the chart and skew the density bins.
export function isWithinHalfCourt(point: Point): boolean {
  return point.y >= 0 && point.y <= COURT.length && Math.abs(point.x) <= COURT.width / 2;
}
