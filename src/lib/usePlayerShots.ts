"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPlayerShots, type Shot } from "@/lib/shots";

export interface ShotSummary {
  attempts: number;
  made: number;
  pct: number;
}

export interface PlayerShotsState {
  shots: Shot[];
  summary: ShotSummary | null;
  isLoading: boolean;
  failed: boolean;
}

// Loads the shot map for a single player and derives its make summary. Shared by
// the shot-chart explorer (which swaps players via a dropdown) and the player
// detail page (which renders one fixed player), so the load/loading/summary
// logic lives in one place.
export function usePlayerShots(playerId: string): PlayerShotsState {
  const [loaded, setLoaded] = useState<{ id: string; shots: Shot[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let active = true;
    fetchPlayerShots(playerId)
      .then((shots) => active && setLoaded({ id: playerId, shots }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [playerId]);

  // Loading is derived: the loaded shots belong to the current player or they don't.
  const shots = useMemo(
    () => (loaded?.id === playerId ? loaded.shots : []),
    [loaded, playerId],
  );
  const isLoading = !failed && (!playerId || loaded?.id !== playerId);

  const summary = useMemo<ShotSummary | null>(() => {
    if (shots.length === 0) return null;
    const made = shots.filter((shot) => shot.made).length;
    return { attempts: shots.length, made, pct: (made / shots.length) * 100 };
  }, [shots]);

  return { shots, summary, isLoading, failed };
}
