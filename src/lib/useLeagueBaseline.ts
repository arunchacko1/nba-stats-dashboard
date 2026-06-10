"use client";

import { useEffect, useState } from "react";
import { fetchLeagueBaseline, type LeagueBaseline } from "@/lib/shots";

// Loads the committed league-average shot grid once for the "vs league" coloring.
// It's a single small file, so we fetch it on mount and share it across charts.
export function useLeagueBaseline(): LeagueBaseline | null {
  const [baseline, setBaseline] = useState<LeagueBaseline | null>(null);

  useEffect(() => {
    let active = true;
    fetchLeagueBaseline()
      .then((data) => active && setBaseline(data))
      .catch(() => {
        /* league coloring just stays unavailable if this fails */
      });
    return () => {
      active = false;
    };
  }, []);

  return baseline;
}
