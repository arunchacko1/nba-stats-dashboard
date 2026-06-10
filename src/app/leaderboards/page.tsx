import { Leaderboards } from "@/components/Leaderboards";
import { getShootingStats } from "@/lib/shooting";

export const metadata = {
  title: "Leaderboards — NBA Shooting Dashboard",
};

export default function LeaderboardsPage() {
  const { season, players } = getShootingStats();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboards</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Top 10 by category among the {players.length} players with 200+ field-goal attempts in{" "}
          {season}. Rate stats apply a minimum-volume filter.
        </p>
      </header>
      <Leaderboards players={players} />
    </div>
  );
}
