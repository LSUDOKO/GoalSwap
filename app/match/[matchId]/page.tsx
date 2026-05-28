/**
 * GoalSwap Arena — /match/[matchId]
 *
 * Match detail page showing live score, team info, dynamic fee ticker,
 * trading interface (SwapBox), event timeline, and WebSocket live updates.
 */

"use client";

import { use, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMatchState } from "@/hooks/useMatchState";
import { SwapBox } from "@/components/SwapBox";
import { LiveFeeTicker } from "@/components/LiveFeeTicker";
import { EventTimeline, type TimelineEvent } from "@/components/EventTimeline";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { isConnected } = useAccount();
  const { detail, liveState, loading, error, recentGoals, recentFeeChanges } =
    useMatchState(matchId);

  // Build timeline events from live data
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    if (detail) {
      events.push({
        type: "match_start",
        data: {
          matchId: detail.matchId,
          minute: 0,
          timestamp: new Date(detail.lastGoalTimestamp - 60000).getTime(),
        },
        timestamp: new Date(detail.lastGoalTimestamp - 60000).getTime(),
      });
    }

    recentGoals.forEach((g) => {
      events.push({
        type: "goal",
        data: g,
        timestamp: Date.now(),
      });
    });

    recentFeeChanges.forEach((f) => {
      events.push({
        type: "fee_change",
        data: f,
        timestamp: Date.now(),
      });
    });

    return events;
  }, [detail, recentGoals, recentFeeChanges]);

  const teamEmoji = (team: string) => {
    // Fallback to first two letters if no specific flag mapping
    return team.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-48 rounded bg-zinc-800" />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-full bg-zinc-800" />
                  <div className="h-16 w-32 rounded bg-zinc-800" />
                  <div className="h-12 w-12 rounded-full bg-zinc-800" />
                </div>
              </div>
            </div>
            <div className="h-96 rounded-xl border border-zinc-800 bg-zinc-900/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">
          Match not found
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          The match &quot;{matchId}&quot; could not be found.
        </p>
        <Link
          href="/matches"
          className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
        >
          ← Back to Matches
        </Link>
      </div>
    );
  }

  const currentFee = liveState?.feeTier ?? detail.feeTier;
  const feeReason = liveState?.feeReason ?? detail.feeReason;
  const isLive = (liveState?.status ?? detail.isFinished ? "FT" : "LIV") === "LIV";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/matches"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to Matches
        </Link>
      </div>

      {/* Scoreboard */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />

          {/* Live badge */}
          {isLive && (
            <div className="relative flex items-center gap-1.5 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                LIVE {liveState?.minute ?? detail.minute}&apos;
              </span>
            </div>
          )}

          {/* Teams + Score */}
          <div className="relative flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex flex-1 flex-col items-center sm:items-start">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                {teamEmoji(detail.homeTeam)}
              </div>
              <h2 className="text-base font-semibold text-zinc-100 sm:text-lg text-center sm:text-left">
                {detail.homeTeam}
              </h2>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.span
                  key={liveState?.homeScore ?? detail.homeScore}
                  initial={isLive ? { scale: 1.3, color: "#22c55e" } : undefined}
                  animate={{ scale: 1, color: "#fafafa" }}
                  className="text-4xl font-bold tabular-nums sm:text-6xl text-zinc-100"
                >
                  {liveState?.homeScore ?? detail.homeScore}
                </motion.span>
                <span className="text-2xl text-zinc-600 sm:text-4xl">:</span>
                <motion.span
                  key={liveState?.awayScore ?? detail.awayScore}
                  initial={isLive ? { scale: 1.3, color: "#22c55e" } : undefined}
                  animate={{ scale: 1, color: "#fafafa" }}
                  className="text-4xl font-bold tabular-nums sm:text-6xl text-zinc-100"
                >
                  {liveState?.awayScore ?? detail.awayScore}
                </motion.span>
              </div>
              {detail.penaltyShootout && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Penalties
                </span>
              )}
              {detail.redCards > 0 && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  {detail.redCards} red card{detail.redCards > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-1 flex-col items-center sm:items-end">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                {teamEmoji(detail.awayTeam)}
              </div>
              <h2 className="text-base font-semibold text-zinc-100 sm:text-lg text-center sm:text-right">
                {detail.awayTeam}
              </h2>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Fee Ticker */}
          <LiveFeeTicker
            currentFee={currentFee}
            feeReason={feeReason}
            feeHistory={recentFeeChanges.map((f) => ({
              fee: f.newFee,
              reason: f.reason,
              timestamp: Date.now(),
            }))}
          />

          {/* Event Timeline */}
          <EventTimeline events={timelineEvents} />
        </div>

        {/* Right Column — Swap Box */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SwapBox
            matchId={matchId}
            homeTeam={detail.homeTeam}
            awayTeam={detail.awayTeam}
            currentFee={currentFee}
            feeReason={feeReason}
          />

          {/* Match Info Card */}
          {!isLive && detail.isFinished && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Match Status
              </h3>
              <p className="text-sm text-zinc-300">
                This match has finished. Settlement may be in progress.
              </p>
            </div>
          )}

          {/* Connection prompt */}
          {!isConnected && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">
                Connect your wallet to trade on this match.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
