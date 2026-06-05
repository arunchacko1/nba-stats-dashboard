import { apiFetch } from "./client";
import {
  type Game,
  gameSchema,
  itemResponse,
  listResponse,
  type Player,
  playerSchema,
  type Team,
  teamSchema,
} from "./schemas";

const teamListSchema = listResponse(teamSchema);
const teamItemSchema = itemResponse(teamSchema);
const playerListSchema = listResponse(playerSchema);
const gameListSchema = listResponse(gameSchema);

export async function getTeams(): Promise<Team[]> {
  const json = await apiFetch("/teams", { params: { per_page: 100 } });
  // The endpoint occasionally carries legacy/non-NBA entries with a blank
  // conference; keep only the current 30 by requiring a real conference.
  return teamListSchema
    .parse(json)
    .data.filter((team) => team.conference === "East" || team.conference === "West");
}

export async function getTeam(id: number): Promise<Team> {
  const json = await apiFetch(`/teams/${id}`);
  return teamItemSchema.parse(json).data;
}

export async function getTeamRoster(teamId: number): Promise<Player[]> {
  const json = await apiFetch("/players", { params: { team_ids: [teamId], per_page: 100 } });
  return playerListSchema.parse(json).data;
}

export async function searchPlayers(query: string): Promise<Player[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const json = await apiFetch("/players", { params: { search: trimmed, per_page: 25 } });
  return playerListSchema.parse(json).data;
}

export interface GameQuery {
  seasons?: number[];
  teamIds?: number[];
  startDate?: string;
  endDate?: string;
  perPage?: number;
}

export async function getGames(query: GameQuery = {}): Promise<Game[]> {
  const json = await apiFetch("/games", {
    params: {
      seasons: query.seasons,
      team_ids: query.teamIds,
      start_date: query.startDate,
      end_date: query.endDate,
      per_page: query.perPage ?? 25,
    },
  });
  return gameListSchema.parse(json).data;
}
