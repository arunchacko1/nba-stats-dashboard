"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { efgPct, filterPlayers, teamOptions, tsPct, type ShootingStat } from "@/lib/shooting";

const columnHelper = createColumnHelper<ShootingStat>();

const columns = [
  columnHelper.accessor("name", {
    header: "Player",
    enableSorting: true,
    cell: (c) => (
      <Link
        href={`/players/${c.row.original.id}`}
        className="font-medium text-zinc-100 underline-offset-2 hover:text-white hover:underline"
      >
        {c.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("team", { header: "Team", enableSorting: true }),
  columnHelper.accessor("games", { header: "GP" }),
  columnHelper.accessor("pointsPerGame", { header: "PPG" }),
  columnHelper.accessor("fgaPerGame", { header: "FGA/G" }),
  columnHelper.accessor("fgPct", { header: "FG%", cell: (c) => c.getValue().toFixed(1) }),
  columnHelper.accessor("fg3m", { header: "3PM" }),
  columnHelper.accessor("fg3a", { header: "3PA" }),
  columnHelper.accessor("fg3Pct", { header: "3P%", cell: (c) => c.getValue().toFixed(1) }),
  columnHelper.accessor("ftPct", { header: "FT%", cell: (c) => c.getValue().toFixed(1) }),
  columnHelper.accessor((row) => efgPct(row), {
    id: "efgPct",
    header: "eFG%",
    cell: (c) => c.getValue<number>().toFixed(1),
  }),
  columnHelper.accessor((row) => tsPct(row), {
    id: "tsPct",
    header: "TS%",
    cell: (c) => c.getValue<number>().toFixed(1),
  }),
];

const numericColumns = new Set([
  "games",
  "pointsPerGame",
  "fgaPerGame",
  "fgPct",
  "fg3m",
  "fg3a",
  "fg3Pct",
  "ftPct",
  "efgPct",
  "tsPct",
]);

export function ShootingTable({ players }: { players: ShootingStat[] }) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "pointsPerGame", desc: true }]);

  const teams = useMemo(() => teamOptions(players), [players]);
  const data = useMemo(() => filterPlayers(players, { query, team }), [players, query, team]);

  // TanStack's useReactTable manages its own memoization, which the React Compiler
  // lint rule doesn't recognize. This is the documented way to opt it out.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by player or team"
          className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={team}
          onChange={(event) => setTeam(event.target.value)}
          aria-label="Filter by team"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All teams</option>
          {teams.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-3 py-3 font-semibold select-none ${
                        numericColumns.has(header.column.id) ? "text-right" : "text-left"
                      } ${header.column.getCanSort() ? "cursor-pointer hover:text-white" : ""}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-3 py-2 ${
                      numericColumns.has(cell.column.id)
                        ? "text-right tabular-nums text-zinc-300"
                        : "text-zinc-100"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">No players match your filters.</p>
      )}
    </div>
  );
}
