import Link from "next/link";

const links = [
  { href: "/", label: "Standings" },
  { href: "/players", label: "Shooting Stats" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/shot-chart", label: "Shot Charts" },
  { href: "/compare", label: "Compare" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          NBA Shooting Dashboard
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-zinc-400">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
