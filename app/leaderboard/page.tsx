"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { oracleApi, type LeaderboardEntry } from "@/lib/oracle";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Award,
  Flame,
  Medal,
  ChevronRight,
  Users,
  BarChart3,
} from "lucide-react";

type LeaderboardType = "volume" | "pnl" | "trophies" | "streak";

const tabs: { key: LeaderboardType; label: string; icon: typeof Trophy }[] = [
  { key: "volume", label: "Volume", icon: TrendingUp },
  { key: "pnl", label: "PnL", icon: DollarSign },
  { key: "trophies", label: "Trophies", icon: Trophy },
  { key: "streak", label: "Streak", icon: Flame },
];

const rankMeta = [
  { bg: "bg-amber-500/15 border border-amber-500/30 text-amber-400", border: "border-amber-500/30", icon: Medal },
  { bg: "bg-zinc-300/10 border border-zinc-400/30 text-zinc-300", border: "border-zinc-400/30", icon: Medal },
  { bg: "bg-amber-700/15 border border-amber-700/30 text-amber-600", border: "border-amber-700/30", icon: Medal },
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Leaderboard</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-11">
          Top traders ranked by volume, PnL, trophies, and win streaks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="lb-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="h-6 w-6 rounded bg-zinc-800" />
              <div className="h-8 w-8 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-800" />
              </div>
              <div className="h-4 w-20 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Users className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-sm font-medium text-zinc-400">No traders yet</h3>
          <p className="text-xs text-zinc-600 mt-1">Start trading to appear on the leaderboard</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rankStyle = i < 3 ? rankMeta[i] : null;
            const r = entry.rank ?? i + 1;
            return (
              <motion.div
                key={entry.address}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
                  rankStyle
                    ? `${rankStyle.bg} ${rankStyle.border}`
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                {/* Rank */}
                <div className="flex w-7 items-center justify-center">
                  {rankStyle ? (
                    <rankStyle.icon className={`h-4 w-4 ${rankStyle.bg.split(" ")[2]}`} />
                  ) : (
                    <span className="text-xs font-bold text-zinc-600">{r}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                  rankStyle
                    ? rankStyle.bg
                    : "bg-zinc-800 text-zinc-400"
                }`}>
                  {entry.name ? entry.name.slice(0, 2).toUpperCase() : entry.address.slice(2, 4).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      {entry.name ?? `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                    </span>
                    {entry.streak && entry.streak >= 5 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                        <Flame className="h-3 w-3" />{entry.streak}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)} · {entry.trades} trade{entry.trades !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right">
                  <div className="text-sm font-bold text-zinc-100">
                    {activeTab === "volume"
                      ? `$${(+entry.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : activeTab === "pnl"
                        ? `${(+entry.pnl) >= 0 ? "+" : ""}${(+entry.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
                        : activeTab === "trophies"
                          ? `${entry.trophies} trophies`
                          : `${entry.streak ?? 0} day streak`}
                  </div>
                  {activeTab !== "trophies" && activeTab !== "streak" && (
                    <div className="text-[10px] text-zinc-600 flex items-center gap-1 justify-end">
                      <Award className="h-3 w-3" />
                      {entry.xp} XP
                    </div>
                  )}
                  {activeTab === "trophies" && (
                    <div className="text-[10px] text-zinc-600 flex items-center gap-1 justify-end">
                      <Award className="h-3 w-3" />
                      {entry.xp} XP
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
