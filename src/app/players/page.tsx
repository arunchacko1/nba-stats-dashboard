import { ShootingTable } from "@/components/ShootingTable";
import { getShootingStats } from "@/lib/shooting";

export const metadata = {
  title: "Shooting Stats — NBA Shooting Dashboard",
};

export default function PlayersPage() {
  const { season, players } = getShootingStats();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Shooting Stats</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {players.length} players with 200+ field-goal attempts in {season}. Field-goal points only
          — free throws are not in the source data.
        </p>
      </header>
      <ShootingTable players={players} />
    </div>
  );
}
