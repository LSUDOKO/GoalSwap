/**
 * GoalSwap Arena — /odds
 *
 * GameWeek odds page. Shows current odds from Sportmonks for major
 * football leagues: Premier League (8), La Liga (12), Serie A (41),
 * Bundesliga (94), Ligue 1 (144), and World Cup qualifiers.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { oracleApi } from "@/lib/oracle";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getLeagueCountryCode, getTeamCountryCode } from "@/lib/countries";

interface OddsFixture {
  id: number;
  name?: string;
  starting_at?: string;
  participants?: Array<{
    id: number;
    name?: string;
    image_path?: string;
    meta?: { location: "home" | "away" };
  }>;
  odds?: Array<{
    id: number;
    name?: string;
    probability?: string;
    odds?: Array<{
      id: number;
      name: string;
      value: string;
      probability?: string;
      bookmaker?: { id: number; name: string };
    }>;
  }>;
}

interface LeagueData {
  leagueId: number;
  leagueName: string;
  round: string | null;
  fixtures: OddsFixture[];
  totalFixtures: number;
  fixturesWithOdds: number;
}

const POPULAR_LEAGUES = [
  { id: 8, name: "Premier League" },
  { id: 12, name: "La Liga" },
  { id: 41, name: "Serie A" },
  { id: 94, name: "Bundesliga" },
  { id: 144, name: "Ligue 1" },
  { id: 1, name: "World Cup" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function OddsBadge({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center rounded-lg border px-3 py-1.5 min-w-[68px] transition-all duration-200 hover:scale-105 ${
        highlight
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-zinc-700 bg-zinc-800/50"
      }`}
    >
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${
        highlight ? "text-emerald-400" : "text-zinc-100"
      }`}>
        {value}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-9 w-52 rounded-lg bg-zinc-800" />
        <div className="h-4 w-72 rounded bg-zinc-800/60" />
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 w-28 shrink-0 rounded-lg bg-zinc-800" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OddsPage() {
  const [leagues, setLeagues] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState<number | null>(null);
  const [activeFixture, setActiveFixture] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const results = await Promise.allSettled(
        POPULAR_LEAGUES.map((league) =>
          oracleApi.getSportmonksOdds(league.id).then(
            (data) =>
              ({
                leagueId: league.id,
                leagueName: league.name,
                round: data?.round ?? null,
                fixtures: data?.fixtures ?? [],
                totalFixtures: data?.totalFixtures ?? 0,
                fixturesWithOdds: data?.fixturesWithOdds ?? 0,
              }) as LeagueData,
          )
        )
      );

      const loaded: LeagueData[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          loaded.push(result.value);
        }
      }
      setLeagues(loaded);
      setLoading(false);
    }
    load();
  }, []);

  const filteredLeagues = activeLeague
    ? leagues.filter((l) => l.leagueId === activeLeague)
    : leagues;

  if (loading) return <LoadingSkeleton />;

  const totalOddsAvailable = leagues.reduce((sum, l) => sum + l.fixturesWithOdds, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
            GameWeek Odds
          </h1>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            1X2
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          Current match result odds from Sportmonks across{" "}
          <span className="text-zinc-300 font-medium">{leagues.length}</span> leagues
          {totalOddsAvailable > 0 && (
            <> — <span className="text-zinc-300 font-medium">{totalOddsAvailable}</span> fixtures with odds</>
          )}
        </p>
      </motion.div>

      {/* League tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1 mb-8 overflow-x-auto scrollbar-none pb-2"
      >
        <button
          onClick={() => setActiveLeague(null)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeLeague === null
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_-4px_rgba(52,211,153,0.15)]"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
          }`}
        >
          All Leagues
          {leagues.length > 0 && (
            <span className="ml-1 text-[10px] text-zinc-500">({leagues.length})</span>
          )}
        </button>
        {POPULAR_LEAGUES.map((league) => {
          const leagueData = leagues.find((l) => l.leagueId === league.id);
          const isActive = activeLeague === league.id;
          return (
            <button
              key={league.id}
              onClick={() => setActiveLeague(league.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_-4px_rgba(52,211,153,0.15)]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <span className="text-xs font-semibold text-zinc-400 uppercase">{league.name}</span>
              {leagueData && leagueData.fixturesWithOdds > 0 && (
                <span className="ml-1 inline-flex items-center rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                  {leagueData.fixturesWithOdds}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Leagues */}
      <AnimatePresence mode="wait">
        {filteredLeagues.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-6 relative">
              <div className="text-6xl font-bold text-zinc-800">?</div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-zinc-800 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">
              No odds data available
            </h3>
            <p className="text-sm text-zinc-600 max-w-md">
              Odds will appear here once Sportmonks rounds data is fetched. This typically updates every 20 seconds.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              <span>⟳</span>
              <span>Refresh</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={activeLeague ?? "all"}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {filteredLeagues.map((league, leagueIdx) => {
              const leagueInfo = POPULAR_LEAGUES.find((l) => l.id === league.leagueId);
              const coverage = league.totalFixtures > 0
                ? Math.round((league.fixturesWithOdds / league.totalFixtures) * 100)
                : 0;

              return (
                <motion.div
                  key={league.leagueId}
                  variants={itemVariants}
                >
                  {/* League header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50 overflow-hidden">
                        {(() => {
                          const cc = getLeagueCountryCode(league.leagueName);
                          return cc ? (
                            <CountryFlag countryCode={cc} size={1.5} />
                          ) : (
                            <span className="text-xs font-bold text-zinc-500 uppercase">{league.leagueName.slice(0, 2)}</span>
                          );
                        })()}
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-zinc-100">
                          {league.leagueName}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          {league.round && (
                            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50">
                              {league.round}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600">
                            {coverage}% coverage
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-zinc-600">
                      <span className="text-zinc-400 font-medium">{league.fixturesWithOdds}</span>
                      {" / "}
                      <span>{league.totalFixtures}</span>
                      {" fixtures"}
                    </div>
                  </div>

                  {/* Fixtures */}
                  {league.fixtures.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center">
                      <p className="text-sm text-zinc-500">
                        No fixtures with odds available for this round.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {league.fixtures.map((fixture) => {
                          const home = fixture.participants?.find(
                            (p) => p.meta?.location === "home"
                          );
                          const away = fixture.participants?.find(
                            (p) => p.meta?.location === "away"
                          );

                          const matchResult = fixture.odds?.find(
                            (o) =>
                              o.name?.toLowerCase().includes("match result") ||
                              o.name?.toLowerCase().includes("1x2") ||
                              o.name?.toLowerCase().includes("match winner")
                          );

                          const homeOdds = matchResult?.odds?.find((o) => o.name === "1");
                          const drawOdds = matchResult?.odds?.find((o) => o.name === "X");
                          const awayOdds = matchResult?.odds?.find((o) => o.name === "2");

                          const date = fixture.starting_at
                            ? new Date(fixture.starting_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : null;

                          const isExpanded = activeFixture === fixture.id;

                          return (
                            <motion.div
                              key={fixture.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              onClick={() => setActiveFixture(isExpanded ? null : fixture.id)}
                              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/60"
                            >
                              <div className="flex items-center justify-between">
                                {/* Teams */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors overflow-hidden">
                                        {(() => {
                                          const n = home?.name;
                                          if (n) {
                                            const cc = getTeamCountryCode(n);
                                            if (cc) return <CountryFlag countryCode={cc} size={0.7} rounded />;
                                          }
                                          return <span className="text-[9px] font-bold text-zinc-400">{n?.slice(0, 2).toUpperCase() ?? "H"}</span>;
                                        })()}
                                      </div>
                                      <span className="text-xs font-medium text-zinc-200 truncate max-w-[80px] leading-tight text-center">
                                        {home?.name?.split(" ").pop() ?? "Home"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-zinc-600 font-medium">vs</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors overflow-hidden">
                                        {(() => {
                                          const n = away?.name;
                                          if (n) {
                                            const cc = getTeamCountryCode(n);
                                            if (cc) return <CountryFlag countryCode={cc} size={0.7} rounded />;
                                          }
                                          return <span className="text-[9px] font-bold text-zinc-400">{n?.slice(0, 2).toUpperCase() ?? "A"}</span>;
                                        })()}
                                      </div>
                                      <span className="text-xs font-medium text-zinc-200 truncate max-w-[80px] leading-tight text-center">
                                        {away?.name?.split(" ").pop() ?? "Away"}
                                      </span>
                                    </div>
                                  </div>
                                  {date && (
                                    <div className="text-[10px] text-zinc-600 mt-1.5 ml-0.5">
                                      {date}
                                    </div>
                                  )}
                                </div>

                                {/* Odds */}
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <OddsBadge
                                    value={homeOdds?.value ?? "—"}
                                    label="1"
                                    highlight={homeOdds?.value !== undefined && parseFloat(homeOdds.value) < 2}
                                  />
                                  <OddsBadge
                                    value={drawOdds?.value ?? "—"}
                                    label="X"
                                  />
                                  <OddsBadge
                                    value={awayOdds?.value ?? "—"}
                                    label="2"
                                    highlight={awayOdds?.value !== undefined && parseFloat(awayOdds.value) < 2}
                                  />
                                </div>
                              </div>

                              {/* Expanded details */}
                              <AnimatePresence>
                                {isExpanded && matchResult?.odds?.[0]?.bookmaker?.name && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                                      <span className="text-[10px] text-zinc-600">
                                        Odds by:{" "}
                                        <span className="text-zinc-400 font-medium">
                                          {matchResult.odds[0].bookmaker.name}
                                        </span>
                                      </span>
                                      <Link
                                        href={`/match/${fixture.id}`}
                                        className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors"
                                      >
                                        Trade this match →
                                      </Link>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Click hint */}
                              {!isExpanded && matchResult?.odds?.[0]?.bookmaker?.name && (
                                <div className="mt-1 text-[10px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click for details
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-center"
      >
        <p className="text-xs text-zinc-500">
          Odds data powered by{" "}
          <a
            href="https://www.sportmonks.com/football-api/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Sportmonks Football API
          </a>
          . Refreshes every 20 seconds.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-600">
          <Link href="/matches" className="hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Matches</span>
          </Link>
          <Link href="/tokens" className="hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Fan Tokens</span>
          </Link>
          <Link href="/leaderboard" className="hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Leaderboard</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
