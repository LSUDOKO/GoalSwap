/**
 * GoalSwap Arena — MatchCard
 *
 * Displays a match summary with live score, team flags, fee tier,
 * and status indicator.
 */

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MatchSummary } from "@/lib/oracle";
import { SPORT_CONFIG } from "@/lib/format";

interface MatchCardProps {
  match: MatchSummary;
}

function getFeeColor(feeTier?: number): string {
  if (!feeTier) return "text-zinc-400";
  if (feeTier >= 10000) return "text-purple-400"; // 10%+ penalty shootout
  if (feeTier >= 5000) return "text-red-400";    // 5% red card/late
  if (feeTier >= 3000) return "text-orange-400";  // 3% post-goal
  if (feeTier >= 1000) return "text-yellow-400";  // 1% normal
  return "text-zinc-400";                          // 0.3% kickoff
}

function getStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "LIV":
      return {
        label: "LIVE",
        className:
          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "FT":
      return {
        label: "FT",
        className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
      };
    default:
      return {
        label: "UPCOMING",
        className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      };
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const statusBadge = getStatusBadge(match.status);
  const isLive = match.status === "LIV";

  return (
    <Link href={`/match/${match.matchId}`}>
      <motion.div
        className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {/* Live indicator */}
        {isLive && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              LIVE {match.minute}&apos;
            </span>
          </div>
        )}

        {/* Teams */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
              {match.homeTeam.slice(0, 2)}
            </div>
            <span className="truncate text-sm font-medium text-zinc-100">
              {match.homeTeam}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 px-3">
            <span
              className={`text-2xl font-bold tabular-nums ${
                isLive ? "text-white" : "text-zinc-300"
              }`}
            >
              {match.homeScore}
            </span>
            <span className="text-sm text-zinc-600">:</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                isLive ? "text-white" : "text-zinc-300"
              }`}
            >
              {match.awayScore}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-medium text-zinc-100">
              {match.awayTeam}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
              {match.awayTeam.slice(0, 2)}
            </div>
          </div>
        </div>

        {/* Bottom row: sport badge + status + fee */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Sport badge */}
            {(() => {
              const sc = SPORT_CONFIG[match.sport] ?? SPORT_CONFIG.football;
              return (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.color}`}
                >
                  <span>{sc.icon}</span>
                  <span>{sc.label}</span>
                </span>
              );
            })()}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <span className={`text-xs font-medium ${getFeeColor(undefined)}`}>
            Fee: {match.status === "LIV" ? "Dynamic" : "—"}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
