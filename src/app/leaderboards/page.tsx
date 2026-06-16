import { Leaderboards } from "@/components/Leaderboards";
import { getLeaderboardStats } from "@/lib/leaderboardData";

export const metadata = {
  title: "Leaderboards — NBA Stats Dashboard",
};

export default function LeaderboardsPage() {
  const { season, players } = getLeaderboardStats();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboards</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Top 10 by category across all {players.length} NBA players in {season}. Per-game and
          percentage boards apply the league&apos;s own qualification minimums, so a small hot streak
          can&apos;t top the chart.
        </p>
      </header>
      <Leaderboards players={players} />
    </div>
  );
}
