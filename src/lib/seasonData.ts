import { z } from "zod";
import snapshot from "@/data/season-snapshot.json";
import { getAllGames, getTeams } from "@/lib/api/balldontlie";
import { type Game, gameSchema, type Team, teamSchema } from "@/lib/api/schemas";
import { SEASON } from "@/lib/season";

// The dashboard prefers live balldontlie data, but the free tier is heavily rate
// limited and may be unreachable from a datacenter IP. So every live read falls
// back to a committed snapshot of the same season, produced by
// scripts/build-live-data.ts. The snapshot guarantees the deployed app always
// renders current-season standings even when the live fetch is throttled or
// blocked — the same committed-data safety net the shooting stats use.
const snapshotSchema = z.object({
  season: z.number(),
  seasonLabel: z.string(),
  capturedAt: z.string(),
  teams: z.array(teamSchema),
  games: z.array(gameSchema),
});
export type SeasonSnapshot = z.infer<typeof snapshotSchema>;

let cached: SeasonSnapshot | null = null;

function loadSnapshot(): SeasonSnapshot {
  if (!cached) cached = snapshotSchema.parse(snapshot);
  return cached;
}

export function getSnapshotGames(): Game[] {
  return loadSnapshot().games;
}

export function getSnapshotTeams(): Team[] {
  return loadSnapshot().teams;
}

export function getCapturedAt(): string {
  return loadSnapshot().capturedAt;
}

// Team identity (name, conference, division) is stable across a season, so it's
// safe to resolve from the snapshot for routing and metadata without a live call.
export function getTeamById(id: number): Team | undefined {
  return loadSnapshot().teams.find((team) => team.id === id);
}

export interface SeasonData {
  teams: Team[];
  games: Game[];
  // True when both teams and games came back from the live API; false when any
  // part fell back to the snapshot. Drives the "live vs. snapshot" UI label.
  live: boolean;
  // Snapshot capture time, shown only when live is false.
  capturedAt: string;
}

// Fetches the season's teams and full game log live from balldontlie, with the
// committed snapshot as a per-source fallback. apiFetch sets Next's revalidate
// window, so the expensive multi-page game sweep is cached and shared across
// pages (ISR) rather than run on every request.
export async function getSeasonData(): Promise<SeasonData> {
  const [teams, games] = await Promise.all([fetchTeams(), fetchGames()]);
  return {
    teams: teams.data,
    games: games.data,
    live: teams.live && games.live,
    capturedAt: loadSnapshot().capturedAt,
  };
}

interface SourceResult<T> {
  data: T;
  live: boolean;
}

async function fetchTeams(): Promise<SourceResult<Team[]>> {
  try {
    const teams = await getTeams();
    if (teams.length > 0) return { data: teams, live: true };
  } catch {
    // fall through to the snapshot
  }
  return { data: getSnapshotTeams(), live: false };
}

async function fetchGames(): Promise<SourceResult<Game[]>> {
  try {
    const games = await getAllGames(SEASON);
    if (games.length > 0) return { data: games, live: true };
  } catch {
    // fall through to the snapshot
  }
  return { data: getSnapshotGames(), live: false };
}
