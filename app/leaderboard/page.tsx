/**
 * GoalSwap Arena — /leaderboard
 *
 * Top traders leaderboard with tabs for volume, PnL, trophies.
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { oracleApi, type LeaderboardEntry } from "@/lib/oracle";

type LeaderboardType = "volume" | "pnl" | "trophies";

const tabs: { key: LeaderboardType; label: string }[] = [
  { key: "volume", label: "Volume" },
  { key: "pnl", label: "PnL" },
  { key: "trophies", label: "Trophies" },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>("volume");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await oracleApi.getLeaderboard(activeTab);
      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, [activeTab]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Top traders on GoalSwap Arena</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="lb-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="h-6 w-6 rounded bg-zinc-800" />
              <div className="h-4 w-32 rounded bg-zinc-800" />
              <div className="ml-auto h-4 w-20 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-sm font-medium text-zinc-400">No entries yet</h3>
          <p className="text-xs text-zinc-600 mt-1">Start trading to appear on the leaderboard</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.address}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700"
            >
              <span className="w-6 text-center text-sm font-bold text-zinc-500">
                {i + 1}
              </span>
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                {entry.address.slice(2, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-100">
                  {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                </span>
                <span className="ml-2 text-[10px] text-zinc-600">
                  {entry.trades} trades
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-zinc-100">
                  {activeTab === "volume"
                    ? `$${(+entry.volume).toLocaleString()}`
                    : activeTab === "pnl"
                      ? `${(+entry.pnl) >= 0 ? "+" : ""}${(+entry.pnl).toFixed(2)} USDC`
                      : `${entry.trophies} 🏆`}
                </div>
                {activeTab !== "trophies" && (
                  <div className="text-[10px] text-zinc-600">{entry.xp} XP</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
