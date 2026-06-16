import Link from "next/link";
import { ScoreGrid } from "@/components/ScoreGrid";
import { getSeasonData } from "@/lib/seasonData";
import { SEASON_LABEL } from "@/lib/season";

// Re-pull the live scores hourly to keep the recent-scores teaser current; the
// snapshot fallback covers the page if the live fetch is unavailable.
export const revalidate = 3600;

const features = [
  {
    href: "/standings",
    title: "Standings",
    blurb: "Conference standings and recent scores, updated live.",
  },
  {
    href: "/players",
    title: "Shooting Stats",
    blurb: "Full-season shooting splits for every qualified player, sortable.",
  },
  {
    href: "/leaderboards",
    title: "Leaderboards",
    blurb: "League leaders by category with official qualification minimums.",
  },
  {
    href: "/shot-chart",
    title: "Shot Charts",
    blurb: "D3 shot maps with make rates relative to the league average.",
  },
  {
    href: "/compare",
    title: "Compare",
    blurb: "Two players side by side on splits and shot charts.",
  },
];

export default async function HomePage() {
  const { games, live, capturedAt } = await getSeasonData();
  const recent = games
    .filter((game) => game.status === "Final")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const captured = new Date(capturedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">NBA Stats Dashboard</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Standings, scores, shooting analytics, shot charts, and player comparison for the{" "}
          {SEASON_LABEL} season.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {live
            ? "Standings and scores updated live from balldontlie."
            : `Showing the committed snapshot captured ${captured}.`}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{feature.title}</h2>
              <span className="text-zinc-500 transition-colors group-hover:text-white">→</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{feature.blurb}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Scores</h2>
          <Link href="/standings" className="text-sm text-zinc-400 hover:text-white">
            Standings &amp; scores →
          </Link>
        </div>
        <ScoreGrid games={recent} />
      </section>
    </div>
  );
}
