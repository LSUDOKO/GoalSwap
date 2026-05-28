/**
 * GoalSwap Arena — /matches
 *
 * Match listing page with tabs for Live, Upcoming, and Finished matches.
 * Fetches match data from the oracle REST API with WebSocket live updates.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { oracleApi, type MatchSummary } from "@/lib/oracle";
import { socketManager, type WsMatchUpdate } from "@/lib/socket";
import { useMatchStore } from "@/stores/matchStore";
import { MatchCard } from "@/components/MatchCard";

type StatusTab = "live" | "upcoming" | "finished";
type SportTab = "all" | string;

import { SPORT_CONFIG } from "@/lib/format";

const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
];

const sportTabs: { key: string; label: string; icon: string }[] = [
  { key: "all", label: "All Sports", icon: "🏆" },
  ...Object.entries(SPORT_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    icon: cfg.icon,
  })),
];

export default function MatchesPage() {
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>("live");
  const [activeSportTab, setActiveSportTab] = useState<SportTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const allMatches = useMatchStore((s) => s.allMatches);
  const setAllMatches = useMatchStore((s) => s.setAllMatches);

  // Fetch matches on mount
  useEffect(() => {
    async function load() {
      setInitialLoading(true);
      const matches = await oracleApi.getMatches("all");
      if (matches) {
        setAllMatches(matches);
      }
      setInitialLoading(false);
    }
    load();
  }, [setAllMatches]);

  // Subscribe to live updates via WebSocket
  useEffect(() => {
    socketManager.connect();
    socketManager.subscribeLive();

    const unsub = socketManager.on("match:update", (update: WsMatchUpdate) => {
      useMatchStore.getState().updateMatchState(update);
    });

    return () => {
      unsub();
      socketManager.unsubscribeLive();
    };
  }, []);

  // Filter matches by status tab, sport tab, and search query
  const filtered = allMatches.filter((m) => {
    const matchesStatus =
      activeStatusTab === "live"
        ? m.status === "LIV"
        : activeStatusTab === "finished"
          ? m.status === "FT"
          : m.status === "NS";

    const matchesSport = activeSportTab === "all" || m.sport === activeSportTab;

    if (!searchQuery) return matchesStatus && matchesSport;

    const q = searchQuery.toLowerCase();
    return (
      matchesStatus &&
      matchesSport &&
      (m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.matchId.toLowerCase().includes(q))
    );
  });

  const liveCount = allMatches.filter((m) => m.status === "LIV").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Matches</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Trade outcomes for football, basketball, NBA, and more
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by team or match ID..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 pl-10 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      {/* Sport Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        {sportTabs.map((tab) => {
          const isActive = activeSportTab === tab.key;
          const count = allMatches.filter((m) => tab.key === "all" || m.sport === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSportTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-0.5 text-[10px] text-zinc-500">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatusTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeStatusTab === tab.key
                ? "text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.key === "live" && liveCount > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                {liveCount}
              </span>
            )}
            {activeStatusTab === tab.key && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Match Grid */}
      {initialLoading ? (
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-4xl">
            {activeStatusTab === "live" ? "📡" : activeStatusTab === "finished" ? "🏁" : "📅"}
          </div>
          <h3 className="text-sm font-medium text-zinc-400">
            {searchQuery
              ? 'No matches match your search'
              : activeStatusTab === 'live'
                ? 'No live matches right now'
                : activeStatusTab === 'finished'
                  ? 'No finished matches yet'
                  : 'No upcoming matches scheduled'}
          </h3>

          {/* Smart hint — nudge user to check Finished tab if matches exist */}
          {activeStatusTab === 'live' && !searchQuery && allMatches.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-500">
                There are {allMatches.filter((m) => m.status === 'FT').length} finished matches ready to view
              </p>
              <button
                onClick={() => setActiveStatusTab('finished')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <span>🏁</span>
                <span>View Finished Matches</span>
              </button>
            </div>
          )}

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((match) => (
              <motion.div
                key={match.matchId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MatchCard match={match} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
