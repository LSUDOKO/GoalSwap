/**
 * GoalSwap Arena — NewsFeed
 *
 * Real-time activity feed showing recent match events,
 * goal alerts, system updates, and platform milestones.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

import { formatTimeAgo, SPORT_CONFIG, sportEmoji } from "@/lib/format";

const ACTIVITY_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function NewsFeed() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItems, setNewItems] = useState<Set<string>>(new Set());
  const prevRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${ACTIVITY_BASE_URL}/api/activity`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json: ActivityData = await res.json();
        setData(json);

        // Detect new items
        const ids = new Set(json.activities.map((a) => a.id));
        if (prevRef.current.size > 0) {
          const diff = new Set(
            [...ids].filter((id) => !prevRef.current.has(id)),
          );
          if (diff.size > 0) {
            setNewItems(diff);
            setTimeout(() => setNewItems(new Set()), 3000);
          }
        }
        prevRef.current = ids;
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

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-36 rounded bg-zinc-800" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-zinc-800/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.activities?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm">
            📋
          </span>
          <span>No recent activity. Check back when matches are live.</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-sm">
            📰
          </span>
          <h3 className="text-sm font-semibold text-zinc-100">
            Live Activity Feed
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500">
          {data.count} events
        </span>
      </div>

      {/* Feed */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {data.activities.slice(0, 15).map((item, i) => {
            const isNew = newItems.has(item.id);
            const emoji = sportEmoji(item.sport);
            const colorClass = SPORT_CONFIG[item.sport]?.color ?? SPORT_CONFIG.football.color;

            return (
              <motion.div
                key={`${item.id}-${i}`}
                layout
                initial={isNew ? { opacity: 0, x: -20, backgroundColor: "rgba(52, 211, 153, 0.05)" } : { opacity: 0.6 }}
                animate={isNew ? { opacity: 1, x: 0, backgroundColor: "rgba(52, 211, 153, 0.02)" } : { opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-zinc-800/30 ${
                  isNew ? "ring-1 ring-emerald-500/10" : ""
                }`}
              >
                {/* Sport icon */}
                <span className="shrink-0 text-base">{emoji}</span>

                {/* Match info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-zinc-100 truncate">
                      {item.homeTeam}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-zinc-300">
                      {item.homeScore}
                    </span>
                    <span className="text-[10px] text-zinc-600">vs</span>
                    <span className="text-xs font-bold tabular-nums text-zinc-300">
                      {item.awayScore}
                    </span>
                    <span className="text-xs font-medium text-zinc-100 truncate">
                      {item.awayTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${colorClass}`}
                    >
                      {SPORT_CONFIG[item.sport]?.label ?? item.sport}
                    </span>
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
                        ? "LIVE"
                        : item.status === "FT"
                          ? "FT"
                          : "NS"}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 text-center">
          Feed updates every 15s · Pulled from oracle match state
        </p>
      </div>
    </motion.div>
  );
}
