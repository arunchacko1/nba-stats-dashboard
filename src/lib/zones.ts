import { COURT, type Point } from "@/lib/court";
import type { Shot } from "@/lib/shots";

// Court zones for breaking a shot map into the buckets analysts actually talk
// about. Derived purely from each shot's coordinates and point value — no extra
// data source — so it's reused by the player page and the assistant alike.
export type Zone = "restricted" | "paint" | "midrange" | "corner3" | "aboveBreak3";

export const ZONES: Zone[] = ["restricted", "paint", "midrange", "corner3", "aboveBreak3"];

export const ZONE_LABELS: Record<Zone, string> = {
  restricted: "Restricted area",
  paint: "Paint (non-RA)",
  midrange: "Mid-range",
  corner3: "Corner 3",
  aboveBreak3: "Above-the-break 3",
};

function distanceFromRim(point: Point): number {
  return Math.hypot(point.x - COURT.rimX, point.y - COURT.rimY);
}

// A three at a low y can only have come from a corner; everything else above the
// arc is an above-the-break three. Twos split into at-rim, paint, and mid-range.
export function classifyZone(shot: Pick<Shot, "x" | "y" | "value">): Zone {
  if (shot.value === 3) {
    return shot.y <= COURT.cornerThreeSideY ? "corner3" : "aboveBreak3";
  }
  if (distanceFromRim(shot) <= COURT.restrictedRadius) return "restricted";
  const inLane = Math.abs(shot.x) <= COURT.laneWidth / 2 && shot.y <= COURT.freeThrowLineY;
  return inLane ? "paint" : "midrange";
}

export interface ZoneSplit {
  zone: Zone;
  label: string;
  attempts: number;
  makes: number;
  pct: number; // FG% within the zone (0 when no attempts)
  share: number; // share of the player's total attempts
}

// Per-zone makes/attempts/percentage for a player's shots, always in ZONES order
// (zones with no attempts are included so the breakdown is stable).
export function zoneSplits(shots: Pick<Shot, "x" | "y" | "value" | "made">[]): ZoneSplit[] {
  const tally = new Map<Zone, { attempts: number; makes: number }>(
    ZONES.map((zone) => [zone, { attempts: 0, makes: 0 }]),
  );
  for (const shot of shots) {
    const cell = tally.get(classifyZone(shot))!;
    cell.attempts += 1;
    if (shot.made) cell.makes += 1;
  }
  const total = shots.length;
  return ZONES.map((zone) => {
    const { attempts, makes } = tally.get(zone)!;
    return {
      zone,
      label: ZONE_LABELS[zone],
      attempts,
      makes,
      pct: attempts ? (makes / attempts) * 100 : 0,
      share: total ? (attempts / total) * 100 : 0,
    };
  });
}
