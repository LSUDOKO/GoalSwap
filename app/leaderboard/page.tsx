"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { oracleApi, type LeaderboardEntry } from "@/lib/oracle";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Award,
  Flame,
  Medal,
  Users,
  BarChart3,
  Crown,
  Star,
  Zap,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardType = "volume" | "pnl" | "trophies" | "streak";

const tabs: { key: LeaderboardType; label: string; icon: typeof Trophy; desc: string }[] = [
  { key: "volume", label: "Volume", icon: TrendingUp, desc: "Total trading volume" },
  { key: "pnl", label: "PnL", icon: DollarSign, desc: "Profit & loss" },
  { key: "trophies", label: "Trophies", icon: Trophy, desc: "Achievements earned" },
  { key: "streak", label: "Streak", icon: Flame, desc: "Consecutive win days" },
];

const rankStyles = [
  {
    bg: "bg-gradient-to-r from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/30",
    icon: Crown,
    iconColor: "text-amber-400",
    avatarBg: "bg-amber-500/20 border-amber-500/30",
    textColor: "text-amber-400",
  },
  {
    bg: "bg-gradient-to-r from-zinc-300/8 to-zinc-300/3",
    border: "border-zinc-400/25",
    icon: Medal,
    iconColor: "text-zinc-300",
    avatarBg: "bg-zinc-400/15 border-zinc-400/25",
    textColor: "text-zinc-300",
  },
  {
    bg: "bg-gradient-to-r from-amber-700/10 to-amber-700/5",
    border: "border-amber-700/25",
    icon: Medal,
    iconColor: "text-amber-600",
    avatarBg: "bg-amber-700/15 border-amber-700/25",
    textColor: "text-amber-600",
  },
];

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("volume");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadLeaderboard = useCallback(async () => {
    const data = await oracleApi.getLeaderboard(activeTab);
    setEntries(data ?? []);
    setLastRefresh(new Date());
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadLeaderboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [loadLeaderboard]);

  // Filter entries by search
  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.name && e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : entries;

  // Find current user's position
  const myEntry = address ? entries.find((e) => e.address.toLowerCase() === address.toLowerCase()) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
            <BarChart3 className="h-5 w-5 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Leaderboard</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-12">
          Top traders ranked by volume, PnL, trophies, and win streaks
        </p>
      </motion.div>

      {/* Tabs + refresh */}
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="lb-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { setLoading(true); loadLeaderboard(); }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
        <input
          type="text"
          placeholder="Search by address or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
        />
      </div>

      {/* Current user highlight */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400">
              {myEntry.name ? myEntry.name.slice(0, 2).toUpperCase() : myEntry.address.slice(2, 4).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-400">Your Rank</div>
              <div className="text-[10px] text-zinc-500">
                #{myEntry.rank} · {myEntry.volume} volume · {myEntry.trophies} trophies
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-400 tabular-nums">#{myEntry.rank}</div>
              <div className="text-[10px] text-zinc-500">{myEntry.xp} XP</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="h-6 w-6 rounded bg-zinc-800" />
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-800" />
              </div>
              <div className="h-4 w-20 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-24 text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <Users className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-base font-medium text-zinc-400">No traders yet</h3>
          <p className="text-sm text-zinc-600 mt-1 max-w-xs">
            Start trading to appear on the leaderboard and compete with the best.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry, i) => {
              const r = entry.rank ?? i + 1;
              const isTop3 = i < 3;
              const style = isTop3 ? rankStyles[i] : null;
              const RankIcon = style?.icon;

              return (
                <motion.div
                  key={entry.address}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.025, duration: 0.25 }}
                  className={cn(
                    `flex items-center gap-3 rounded-xl border p-4 transition-all`,
                    style
                      ? `${style.bg} ${style.border}`
                      : "border-zinc-800 bg-zinc-90/40 hover:border-zinc-700 hover:bg-zinc-900/60",
                    address && entry.address.toLowerCase() === address.toLowerCase() &&
                      "ring-1 ring-emerald-500/30",
                  )}
                >
                  {/* Rank */}
                  <div className="flex w-8 items-center justify-center shrink-0">
                    {RankIcon ? (
                      <RankIcon className={`h-5 w-5 ${style!.iconColor}`} />
                    ) : (
                      <span className="text-xs font-bold text-zinc-600 tabular-nums">{r}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    style
                      ? `${style.avatarBg} ${style.textColor}`
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {entry.name ? entry.name.slice(0, 2).toUpperCase() : entry.address.slice(2, 4).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100 truncate">
                        {entry.name ?? `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                      </span>
                      {entry.streak && entry.streak >= 5 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-400 shrink-0">
                          <Flame className="h-3 w-3" />{entry.streak}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                      <span>{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
                      <span>·</span>
                      <span>{entry.trades} trade{entry.trades !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-zinc-100 tabular-nums">
                      {activeTab === "volume"
                        ? `$${(+entry.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : activeTab === "pnl"
                          ? `${(+entry.pnl) >= 0 ? "+" : ""}${(+entry.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
                          : activeTab === "trophies"
                            ? `${entry.trophies} Trophies`
                            : `${entry.streak ?? 0}d streak`}
                    </div>
                    <div className="text-[10px] text-zinc-600 flex items-center gap-1 justify-end">
                      <Award className="h-3 w-3" />
                      {entry.xp} XP
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center"
      >
        <p className="text-xs text-zinc-500">
          Leaderboard updates every 60 seconds. Trading X Layer testnet tokens — rankings are for demo purposes.
        </p>
      </motion.div>
    </div>
  );
}
