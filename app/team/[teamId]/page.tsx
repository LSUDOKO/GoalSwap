/**
 * GoalSwap Arena — /team/[teamId]
 *
 * Team detail page using Sportmonks API. Shows squad roster grouped by
 * position, upcoming fixtures, and player details with stats.
 */

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { oracleApi } from "@/lib/oracle";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getCountryCode, getTeamCountryCode } from "@/lib/countries";

interface PlayerInfo {
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
}

interface SquadMember {
  id: number;
  player?: PlayerInfo;
  position?: { id: number; name: string };
}

interface Participant {
  id: number;
  name?: string;
  meta?: { location: "home" | "away" };
}

interface UpcomingFixture {
  id: number;
  name?: string;
  starting_at?: string;
  participants?: Participant[];
  league?: { id: number; name: string; image_path?: string };
}

interface TeamData {
  name?: string;
  short_code?: string;
  image_path?: string;
  upcoming?: UpcomingFixture[];
}

const POSITION_GROUPS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"];

function getPositionGroup(posName: string): string {
  const lower = posName.toLowerCase();
  if (lower.includes("goal")) return "Goalkeepers";
  if (lower.includes("def") || lower.includes("back")) return "Defenders";
  if (lower.includes("mid")) return "Midfielders";
  if (lower.includes("forward") || lower.includes("striker") || lower.includes("wing")) return "Forwards";
  return "Other";
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.25 },
  }),
};

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const teamIdNum = parseInt(teamId, 10);

  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamLogoFailed, setTeamLogoFailed] = useState(false);
  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePosition, setActivePosition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const groupedSquad = squad.reduce<Record<string, SquadMember[]>>((acc, member) => {
    const playerInfo = member.player;
    const posName = playerInfo?.position?.name ?? member.position?.name ?? "Other";
    const group = getPositionGroup(posName);
    if (!acc[group]) acc[group] = [];
    acc[group].push(member);
    return acc;
  }, {});

  // Filter by position and search
  const filteredGroupKeys = Object.keys(groupedSquad).filter((group) => {
    if (activePosition && activePosition !== group) return false;
    if (!searchQuery) return true;
    return groupedSquad[group].some((member) => {
      const name = member.player?.name ?? "";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  const upcomingFixtures: UpcomingFixture[] = team?.upcoming ?? [];
  const totalPlayers = squad.length;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-zinc-800" />
          <div className="h-32 rounded-2xl bg-zinc-800/60" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-zinc-800/50" />
              ))}
            </div>
            <div className="h-48 rounded-xl bg-zinc-800/50" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700 mx-auto mb-5">
            <span className="text-xl font-bold text-zinc-500">?</span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Team not found</h2>
          <p className="text-sm text-zinc-500 mb-8">
            {error ?? `Team "${teamId}" not found or unavailable.`}
          </p>
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all hover:shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)]"
          >
            <span>Back to Matches</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>Back to Matches</span>
        </Link>
      </motion.div>

      {/* Team Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-emerald-500/8 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />

          <div className="relative flex items-center gap-6">
            {/* Team icon */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 shadow-lg overflow-hidden">
                {(() => {
                  const cc = team.name ? getTeamCountryCode(team.name) : null;
                  if (team.image_path && !teamLogoFailed) {
                    return (
                      <img
                        src={team.image_path}
                        alt={team.name ?? "Team"}
                        className="h-full w-full object-contain p-2"
                        onError={() => setTeamLogoFailed(true)}
                      />
                    );
                  }
                  return cc ? (
                    <CountryFlag countryCode={cc} size={5} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-zinc-300">
                      {team.name?.slice(0, 2).toUpperCase() ?? "?"}
                    </span>
                  );
                })()}
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-[6px] font-bold text-emerald-400">OK</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl tracking-tight">
                {team.name ?? "Unknown Team"}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs border border-zinc-700/50">
                  <span className="font-medium text-zinc-400">{totalPlayers}</span>
                  <span>players</span>
                </span>
                {team.short_code && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs border border-zinc-700/50">
                    <span className="font-medium text-zinc-400">{team.short_code}</span>
                  </span>
                )}
                {upcomingFixtures.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs border border-zinc-700/50">
                    <span className="font-medium text-zinc-400">{upcomingFixtures.length}</span>
                    <span>upcoming</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Squad Roster</h2>
            <span className="text-xs text-zinc-500 tabular-nums">{totalPlayers} players</span>
          </div>

          {/* Position tabs + Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex gap-1 overflow-x-auto scrollbar-none flex-1">
              <button
                onClick={() => setActivePosition(null)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activePosition === null
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                All
                <span className="ml-0.5 text-[10px] text-zinc-500">({totalPlayers})</span>
              </button>
              {Object.entries(groupedSquad).map(([group, members]) => {
                const isActive = activePosition === group;
                return (
                  <button
                    key={group}
                    onClick={() => setActivePosition(isActive ? null : group)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
                    }`}
                  >
                    {group}
                    <span className="text-[10px] text-zinc-500">({members.length})</span>
                  </button>
                );
              })}
            </div>
            <div className="relative shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full sm:w-44 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 pl-8 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
          </div>

          {/* Squad list */}
          <div className="space-y-1">
            {filteredGroupKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700 mx-auto mb-3">
                  <span className="text-lg font-bold text-zinc-500">?</span>
                </div>
                <p className="text-sm text-zinc-500">
                  {searchQuery ? "No players match your search" : "No squad data available."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {filteredGroupKeys.map((group) => {
                  const filteredMembers = searchQuery
                    ? groupedSquad[group].filter((member) =>
                        member.player?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : groupedSquad[group];

                  if (filteredMembers.length === 0) return null;

                  return (
                    <motion.div
                      key={group}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-5 first:mt-0 flex items-center gap-2">
                        <span>{group}</span>
                        <span className="h-px flex-1 bg-zinc-800/50" />
                        <span className="text-[10px] font-normal text-zinc-600">{filteredMembers.length}</span>
                      </h3>
                      <div className="space-y-1">
                        {filteredMembers.map((member, idx) => {
                          const playerInfo = member.player;
                          const displayName = playerInfo?.name ?? "Unknown Player";
                          const initials = playerInfo?.name?.slice(0, 2).toUpperCase() ?? "?";
                          return (
                            <motion.div
                              key={member.id}
                              custom={idx}
                              variants={fadeUp}
                              initial="hidden"
                              animate="visible"
                              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-[0_0_12px_-4px_rgba(255,255,255,0.03)] group"
                            >
                              {/* Player avatar */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs font-bold text-zinc-400 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-100 truncate group-hover:text-zinc-50 transition-colors">
                                  {displayName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                  {playerInfo?.position?.name && (
                                    <span className="text-zinc-500">{playerInfo.position.name}</span>
                                  )}
                                  {playerInfo?.nationality?.name && (() => {
                                    const cc = getCountryCode(playerInfo.nationality!.name);
                                    return (
                                      <>
                                        <span className="text-zinc-700">·</span>
                                        <span className="flex items-center gap-1.5">
                                          {cc && <CountryFlag countryCode={cc} size={0.65} rounded />}
                                          <span>{playerInfo!.nationality!.name}</span>
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
                                <span>#{member.id}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {squad.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700 mx-auto mb-4">
                <span className="text-xl font-bold text-zinc-500">?</span>
              </div>
              <p className="text-sm text-zinc-500 font-medium">No squad data available</p>
              <p className="text-xs text-zinc-600 mt-1">Squad information will appear once fetched from Sportmonks.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
          {/* Upcoming Fixtures */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Upcoming Fixtures
            </h2>

            {upcomingFixtures.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/60 mx-auto mb-3">
                  <span className="text-xs font-bold text-zinc-500">!</span>
                </div>
                <p className="text-sm text-zinc-500">No upcoming fixtures.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {upcomingFixtures.map((fixture, idx) => {
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
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/60 group"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                            <span className="truncate max-w-[90px]">{home?.name ?? "Home"}</span>
                            <span className="text-[10px] text-zinc-600 shrink-0">vs</span>
                            <span className="truncate max-w-[90px]">{away?.name ?? "Away"}</span>
                          </div>
                          <Link
                            href={`/match/${fixture.id}`}
                            className="shrink-0 text-[10px] text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Trade
                          </Link>
                        </div>
                        {fixture.league?.name && (
                          <div className="text-[10px] text-zinc-600 mt-1.5 flex items-center gap-1">
                            {fixture.league.image_path && (
                              <img src={fixture.league.image_path} alt="" className="h-3 w-3 rounded" />
                            )}
                            <span>{fixture.league.name}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Team Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Team Info
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                <span className="text-zinc-500">Sportmonks ID</span>
                <code className="text-emerald-400 font-mono">{teamIdNum}</code>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                <span className="text-zinc-500">Status</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                <span className="text-zinc-500">Squad size</span>
                <span className="text-zinc-200 font-medium tabular-nums">{totalPlayers}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                <span className="text-zinc-500">Positions</span>
                <span className="text-zinc-200 font-medium tabular-nums">{Object.keys(groupedSquad).length}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/50">
              <Link
                href="/matches"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                <span>View all matches</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
