/**
 * GoalSwap Arena — /games
 *
 * Dedicated page for basketball, NBA, and other non-football sports.
 * Shows live and upcoming games with sport-specific filtering.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { oracleApi, type MatchSummary } from "@/lib/oracle";
import { Sparkles, Crosshair, Target, Swords, Trophy, Diamond, Flame, Snail, Siren, Gamepad2 } from "lucide-react";
import { SPORT_CONFIG } from "@/lib/format";

// Map each sport to a lucide icon
const SPORT_ICONS: Record<string, React.ComponentType<any>> = {
  basketball: Crosshair,
  nba: Swords,
  football: Target,
  afl: Flame,
  baseball: Diamond,
  formula1: Flame,
  handball: Snail,
  hockey: Siren,
  mma: Trophy,
  "american-football": Gamepad2,
  rugby: Gamepad2,
  volleyball: Trophy,
  golf: Target,
};

const SPORT_CARDS = Object.entries(SPORT_CONFIG)
  .filter(([id]) => id !== "football") // football is primary in /matches
  .map(([id, cfg]) => ({
    id,
    name: cfg.label,
    icon: SPORT_ICONS[id] ?? Target,
    description: `${cfg.label} — live scores and odds`,
  }));

type SportId = string;

export default function GamesPage() {
  const [activeSport, setActiveSport] = useState<SportId | "all">("all");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const all = await oracleApi.getMatches("all");
      if (all) setMatches(all);
      setLoading(false);
    }
    load();
  }, []);

  const filtered =
    activeSport === "all"
      ? matches
      : matches.filter((m) => m.sport === activeSport);

  /** Group matches by sport */
  const grouped = new Map<string, MatchSummary[]>();
  for (const match of filtered) {
    const list = grouped.get(match.sport) ?? [];
    list.push(match);
    grouped.set(match.sport, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50"
          >
            <Gamepad2 className="h-5 w-5 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">All Games</h1>
        </div>
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-zinc-500 ml-12"
        >
          Trade outcomes across football, basketball, NBA, and more
        </motion.p>
      </motion.div>

      {/* Sport selector cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        <motion.button
          onClick={() => setActiveSport("all")}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`relative rounded-xl border p-5 text-left transition-all ${
            activeSport === "all"
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <div className="text-3xl mb-2"><Sparkles className="h-8 w-8 text-emerald-400" /></div>
          <h3 className="text-sm font-semibold text-zinc-100">All Sports</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Browse every match across all sports
          </p>
          <span className="mt-2 inline-block text-xs text-emerald-400">
            {matches.length} matches
          </span>
        </motion.button>

        {SPORT_CARDS.map((sport, i) => {
          const SportIcon = sport.icon;
          const sportMatches = matches.filter((m) => m.sport === sport.id);
          const cfg = SPORT_CONFIG[sport.id];
          return (
            <motion.button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative rounded-xl border p-5 text-left transition-all overflow-hidden ${
                activeSport === sport.id
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-30`} />
              <div className="relative">
                <div className="mb-2">
                  <SportIcon className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {sport.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{sport.description}</p>
                <span className="mt-2 inline-block text-xs text-emerald-400">
                  {sportMatches.length > 0
                    ? `${sportMatches.length} matches`
                    : "No matches"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Matches by sport */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800" />
                <div className="h-6 w-16 rounded bg-zinc-800" />
                <div className="h-8 w-8 rounded-full bg-zinc-800" />
              </div>
              <div className="h-3 w-20 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <Gamepad2 className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400">
            {activeSport === "all"
              ? "No matches found across any sport"
              : `No ${SPORT_CONFIG[activeSport]?.label ?? activeSport} matches right now`}
          </h3>
          <p className="mt-2 text-xs text-zinc-600">
            Matches will appear here once data is available from the sports APIs.
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {Array.from(grouped.entries()).map(([sportId, sportMatches]) => {
            const config = SPORT_CARDS.find((s) => s.id === sportId);
            const cfg = SPORT_CONFIG[sportId];
            return (
              <motion.div
                key={sportId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  {config && <config.icon className="h-5 w-5 text-emerald-400" />}
                  <h2 className="text-lg font-semibold text-emerald-400">                      {config?.name ?? sportId}
                  </h2>
                  <span className="text-xs text-zinc-500">
                    {sportMatches.length} match{sportMatches.length !== 1 ? "es" : ""}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sportMatches.map((match) => (
                    <Link key={match.matchId} href={`/match/${match.matchId}`}>
                      <motion.div
                        className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {match.homeTeam}
                          </span>
                          <div className="flex items-center gap-2 px-3">
                            <span className="text-xl font-bold tabular-nums text-zinc-100">
                              {match.homeScore}
                            </span>
                            <span className="text-xs text-zinc-600">vs</span>
                            <span className="text-xl font-bold tabular-nums text-zinc-100">
                              {match.awayScore}
                            </span>
                          </div>
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {match.awayTeam}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                            match.status === "LIV"
                              ? "text-emerald-400"
                              : match.status === "FT"
                                ? "text-zinc-400"
                                : "text-emerald-400"
                          }`}>
                            {match.status === "LIV"
                              ? `LIVE ${match.minute}'`
                              : match.status === "FT"
                                ? "FT"
                                : "UPCOMING"}
                          </span>
                          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                            {SPORT_CONFIG[match.sport]?.label ?? match.sport}
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
