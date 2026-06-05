import { z } from "zod";

// We only validate the fields the app actually renders. Unknown keys from the
// API are dropped by zod's default object parsing, which keeps these schemas
// honest about what we depend on.

export const teamSchema = z.object({
  id: z.number(),
  conference: z.string(),
  division: z.string(),
  city: z.string(),
  name: z.string(),
  full_name: z.string(),
  abbreviation: z.string(),
});
export type Team = z.infer<typeof teamSchema>;

export const playerSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  position: z.string(),
  height: z.string(),
  weight: z.string(),
  jersey_number: z.string(),
  team: teamSchema,
});
export type Player = z.infer<typeof playerSchema>;

export const gameSchema = z.object({
  id: z.number(),
  date: z.string(),
  season: z.number(),
  status: z.string(),
  home_team: teamSchema,
  visitor_team: teamSchema,
  home_team_score: z.number(),
  visitor_team_score: z.number(),
});
export type Game = z.infer<typeof gameSchema>;

export function listResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item) });
}

export function itemResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: item });
}
