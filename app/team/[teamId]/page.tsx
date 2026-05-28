/**
 * GoalSwap Arena — /team/[teamId]
 *
 * Team detail page using Sportmonks API. Shows squad roster grouped by
 * position, upcoming fixtures, and player details with stats.
 */

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { oracleApi } from "@/lib/oracle";
import { SPORT_CONFIG } from "@/lib/format";

interface Player {
  id: number;
  player?: {
    id: number;
    name: string;
    image_path?: string;
    nationality?: { id: number; name: string; image_path?: string };
    position?: { id: number; name: string };
    statistics?: Array<{
      details?: Array<{
        type?: { id: number; name: string };
        value?: string | number;
      }>;
    }>;
  };
  position?: { id: number; name: string };
}

interface UpcomingFixture {
  id: number;
  name?: string;
  starting_at?: string;
  participants?: Array<{
    id: number;
    name?: string;
    meta?: { location: "home" | "away" };
  }>;
  league?: { id: number; name: string; image_path?: string };
}

const POSITION_GROUPS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"];

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const teamIdNum = parseInt(teamId, 10);

  const [team, setTeam] = useState<any>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePosition, setActivePosition] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (isNaN(teamIdNum)) {
        setError("Invalid team ID");
        setLoading(false);
        return;
      }

      const [teamData, squadData] = await Promise.all([
        oracleApi.getSportmonksTeam(teamIdNum),
        oracleApi.getSportmonksSquad(teamIdNum),
      ]);

      if (!teamData) {
        setError("Team not found");
        setLoading(false);
        return;
      }

      setTeam(teamData);
      setSquad(squadData ?? []);
      setLoading(false);
    }
    load();
  }, [teamIdNum]);

  // Group squad by position
  const groupedSquad = squad.reduce<Record<string, Player[]>>((acc, member) => {
    const posName = member.player?.position?.name ?? member.position?.name ?? "Other";
    const group = POSITION_GROUPS.find((g) =>
      g.toLowerCase().includes(posName.toLowerCase().includes("goal") ? "goalkeepers" :
        posName.toLowerCase().includes("def") ? "defenders" :
        posName.toLowerCase().includes("mid") ? "midfielders" : "forwards")
    ) ?? "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(member);
    return acc;
  }, {});

  const upcomingFixtures: UpcomingFixture[] = team?.upcoming ?? [];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-zinc-800" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-zinc-800/60" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-zinc-800/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Team not found</h2>
        <p className="text-sm text-zinc-500 mb-6">{error ?? `Team "${teamId}" not found.`}</p>
        <Link
          href="/matches"
          className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
        >
          ← Back to Matches
        </Link>
      </div>
    );
  }

  const totalPlayers = squad.length;
  const groupedKeys = Object.keys(groupedSquad);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/matches"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to Matches
        </Link>
      </div>

      {/* Team Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />

          <div className="relative flex items-center gap-6">
            {/* Team icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800 text-2xl font-bold text-zinc-400 border border-zinc-700">
              {team.name?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
                {team.name ?? "Unknown Team"}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <span>👥</span>
                  <span>{totalPlayers} players</span>
                </span>
                {team.short_code && (
                  <span className="flex items-center gap-1">
                    <span>🏷️</span>
                    <span>{team.short_code}</span>
                  </span>
                )}
                {upcomingFixtures.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span>📅</span>
                    <span>{upcomingFixtures.length} upcoming fixtures</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Squad Roster */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Squad Roster</h2>

          {/* Position tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
            {groupedKeys.map((group) => {
              const isActive = activePosition === null || activePosition === group;
              const count = groupedSquad[group].length;
              return (
                <button
                  key={group}
                  onClick={() => setActivePosition(activePosition === group ? null : group)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive && activePosition !== null
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : activePosition === null
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
                  }`}
                >
                  <span>{count}</span>
                  <span>{group}</span>
                </button>
              );
            })}
            {activePosition !== null && (
              <button
                onClick={() => setActivePosition(null)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Squad list */}
          <div className="space-y-1">
            {(activePosition ? [activePosition] : groupedKeys).map((group) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4 first:mt-0">
                  {group} ({groupedSquad[group].length})
                </h3>
                <div className="space-y-1">                    {groupedSquad[group].map((member) => {
                    // player details can be at member.player or member itself
                    const pd =
                      ("player" in member ? member.player : member) ?? member;
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
                      >
                        {/* Player icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400">
                          {(pd as any).name?.slice(0, 2).toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-100 truncate">
                            {(pd as any).name ?? "Unknown Player"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            {(pd as any).position?.name && (
                              <span>{(pd as any).position.name}</span>
                            )}
                            {(pd as any).nationality?.name && (
                              <span className="flex items-center gap-1">
                                <span>🌍</span>
                                <span>{(pd as any).nationality.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {squad.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-3xl mb-3">👥</div>
              <p className="text-sm text-zinc-500">No squad data available.</p>
            </div>
          )}
        </div>

        {/* Right: Upcoming Fixtures */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Upcoming Fixtures
          </h2>

          {upcomingFixtures.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-sm text-zinc-500">No upcoming fixtures.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingFixtures.map((fixture) => {
                const home = fixture.participants?.find(
                  (p) => p.meta?.location === "home"
                );
                const away = fixture.participants?.find(
                  (p) => p.meta?.location === "away"
                );
                const date = fixture.starting_at
                  ? new Date(fixture.starting_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "TBD";

                return (
                  <motion.div
                    key={fixture.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-all hover:border-zinc-700"
                  >
                    <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      {date}
                    </div>
                    <div className="text-sm font-medium text-zinc-100">
                      {home?.name ?? "Home"} vs {away?.name ?? "Away"}
                    </div>
                    {fixture.league?.name && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {fixture.league.name}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Quick Info Card */}
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Team Info
            </h3>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <p>
                Sportmonks team ID:{" "}
                <code className="text-emerald-400">{teamIdNum}</code>
              </p>
              <p>
                Status:{" "}
                <span className="text-emerald-400">Data synced</span>
              </p>
              <p>
                Squad fetched:{" "}
                <span className="text-zinc-300">{totalPlayers} players</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
