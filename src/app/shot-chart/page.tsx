import { ShotExplorer } from "@/components/ShotExplorer";
import { SHOOTING_SEASON_LABEL } from "@/lib/season";

export const metadata = {
  title: "Shot Charts — NBA Stats Dashboard",
};

export default function ShotChartPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Shot Charts</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Every {SHOOTING_SEASON_LABEL} field-goal attempt, binned into a hexagonal density map. Size
          shows shot frequency; color shows how often it went in.
        </p>
      </header>
      <ShotExplorer />
    </div>
  );
}
