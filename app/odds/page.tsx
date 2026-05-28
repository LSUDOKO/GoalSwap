/**
 * GoalSwap Arena — /odds
 *
 * GameWeek odds page. Shows current odds from Sportmonks for major
 * football leagues: Premier League (8), La Liga (12), Serie A (41),
 * Bundesliga (94), Ligue 1 (144), and World Cup qualifiers.
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { oracleApi } from "@/lib/oracle";

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
  { id: 8, name: "Premier League", icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 12, name: "La Liga", icon: "🇪🇸" },
  { id: 41, name: "Serie A", icon: "🇮🇹" },
  { id: 94, name: "Bundesliga", icon: "🇩🇪" },
  { id: 144, name: "Ligue 1", icon: "🇫🇷" },
  { id: 1, name: "World Cup", icon: "🏆" },
];

export default function OddsPage() {
  const [leagues, setLeagues] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState<number | null>(null);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-zinc-800" />
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-28 rounded-lg bg-zinc-800" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
          GameWeek Odds
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Current odds from Sportmonks for major football leagues
        </p>
      </div>

      {/* League tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveLeague(null)}
          className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeLeague === null
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
          }`}
        >
          All Leagues
        </button>
        {POPULAR_LEAGUES.map((league) => {
          const leagueData = leagues.find((l) => l.leagueId === league.id);
          const isActive = activeLeague === league.id;
          return (
            <button
              key={league.id}
              onClick={() => setActiveLeague(league.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <span>{league.icon}</span>
              <span>{league.name}</span>
              {leagueData && leagueData.fixturesWithOdds > 0 && (
                <span className="ml-1 text-[10px] text-zinc-500">
                  ({leagueData.fixturesWithOdds})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View label */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
          1X2
        </span>
        <span className="text-xs text-zinc-500">Match Result odds from Sportmonks</span>
      </div>

      {/* Leagues */}
      {filteredLeagues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-sm font-medium text-zinc-400">
            No odds data available
          </h3>
          <p className="mt-2 text-xs text-zinc-500">
            Odds will appear once Sportmonks rounds data is fetched.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredLeagues.map((league) => (
            <motion.div
              key={league.leagueId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* League header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {POPULAR_LEAGUES.find((l) => l.id === league.leagueId)?.icon ?? "⚽"}
                  </span>
                  <h2 className="text-base font-semibold text-zinc-100">
                    {league.leagueName}
                  </h2>
                  {league.round && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      {league.round}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {league.fixturesWithOdds} / {league.totalFixtures} fixtures with odds
                </span>
              </div>

              {/* Fixtures */}
              {league.fixtures.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
                  <p className="text-sm text-zinc-500">
                    No fixtures with odds available for this round.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {league.fixtures.map((fixture) => {
                    const home = fixture.participants?.find(
                      (p) => p.meta?.location === "home"
                    );
                    const away = fixture.participants?.find(
                      (p) => p.meta?.location === "away"
                    );

                    // Find 1X2 market odds
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

                    return (
                      <motion.div
                        key={fixture.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between">
                          {/* Teams */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-zinc-100">
                                {home?.name ?? "Home"}
                              </span>
                              <span className="text-xs text-zinc-600">vs</span>
                              <span className="text-sm font-medium text-zinc-100">
                                {away?.name ?? "Away"}
                              </span>
                            </div>
                            {date && (
                              <div className="text-[10px] text-zinc-500 mt-1">
                                {date}
                              </div>
                            )}
                          </div>

                          {/* Odds */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 min-w-[60px]">
                              <span className="text-[10px] text-zinc-500 uppercase">1</span>
                              <span className="text-sm font-semibold text-zinc-100">
                                {homeOdds?.value ?? "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 min-w-[60px]">
                              <span className="text-[10px] text-zinc-500 uppercase">X</span>
                              <span className="text-sm font-semibold text-zinc-100">
                                {drawOdds?.value ?? "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 min-w-[60px]">
                              <span className="text-[10px] text-zinc-500 uppercase">2</span>
                              <span className="text-sm font-semibold text-zinc-100">
                                {awayOdds?.value ?? "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bookmaker */}
                        {matchResult?.odds?.[0]?.bookmaker?.name && (
                          <div className="mt-2 text-[10px] text-zinc-600">
                            Odds by: {matchResult.odds[0].bookmaker.name}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
        <p className="text-xs text-zinc-500">
          Odds data powered by{" "}
          <a
            href="https://www.sportmonks.com/football-api/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Sportmonks Football API
          </a>
          . Odds refresh every 20 seconds.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-600">
          <Link href="/matches" className="hover:text-zinc-400 transition-colors">
            ⚽ View Matches
          </Link>
          <Link href="/tokens" className="hover:text-zinc-400 transition-colors">
            🪙 Fan Tokens
          </Link>
          <Link href="/leaderboard" className="hover:text-zinc-400 transition-colors">
            🏆 Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
