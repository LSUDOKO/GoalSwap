/**
 * GoalSwap Arena — /activity
 *
 * Full-page activity feed showing all recent match events,
 * goal alerts, and system updates across all sports.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { NewsFeed } from "@/components/NewsFeed";
import { IntegrationsStatus } from "@/components/IntegrationsStatus";
import { formatTimeAgo, sportEmoji, sportLabel } from "@/lib/format";

interface ActivityItem {
  id: string;
  type: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  timestamp: string;
}

interface ActivityData {
  activities: ActivityItem[];
  count: number;
}

const ACTIVITY_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${ACTIVITY_BASE_URL}/api/activity`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json: ActivityData = await res.json();
        setData(json);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  const filtered =
    sportFilter === "all"
      ? data?.activities ?? []
      : (data?.activities ?? []).filter((a) => a.sport === sportFilter);

  const sportCounts: Record<string, number> = {};
  if (data) {
    for (const a of data.activities) {
      sportCounts[a.sport] = (sportCounts[a.sport] ?? 0) + 1;
    }
  }

  const sportTabs = [
    { key: "all", label: "All Sports", icon: "🏆", count: data?.count ?? 0 },
    ...Object.entries(sportCounts).map(([key, count]) => ({
      key,
      label: sportLabel(key),
      icon: sportEmoji(key),
      count,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-zinc-100 sm:text-3xl"
        >
          Activity
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-sm text-zinc-500"
        >
          Live feed of match events, goal alerts, and system updates
        </motion.p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main feed */}
        <div className="lg:col-span-2">
          {/* Sport filter tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
            {sportTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSportFilter(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sportFilter === tab.key
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="ml-0.5 text-[10px] text-zinc-500">({tab.count})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="h-4 w-3/4 rounded bg-zinc-800" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 text-4xl">📭</div>
              <h3 className="text-sm font-medium text-zinc-400">
                No activity found
              </h3>
              <p className="mt-2 text-xs text-zinc-600">
                {sportFilter !== "all"
                  ? "No events for this sport yet."
                  : "No match activity recorded yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, i) => {
                  const emoji = sportEmoji(item.sport);
                  return (
                    <Link key={`${item.id}-${i}`} href={`/match/${item.id}`}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className="group flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
                      >
                        <span className="text-xl">{emoji}</span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-100 truncate">
                              {item.homeTeam}
                            </span>
                            <span className="text-lg font-bold tabular-nums text-zinc-100">
                              {item.homeScore}
                            </span>
                            <span className="text-xs text-zinc-600">vs</span>
                            <span className="text-lg font-bold tabular-nums text-zinc-100">
                              {item.awayScore}
                            </span>
                            <span className="text-sm font-medium text-zinc-100 truncate">
                              {item.awayTeam}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-medium ${
                                item.status === "LIV"
                                  ? "text-emerald-400"
                                  : item.status === "FT"
                                    ? "text-zinc-500"
                                    : "text-blue-400"
                              }`}
                            >
                              {item.status === "LIV"
                                ? "● LIVE"
                                : item.status === "FT"
                                  ? "FT"
                                  : "Upcoming"}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {sportLabel(item.sport)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[10px] text-zinc-600 tabular-nums">
                            {formatTimeAgo(item.timestamp)}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <NewsFeed />
          <IntegrationsStatus />
        </div>
      </div>
    </div>
  );
}


