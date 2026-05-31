/**
 * GoalSwap Arena — /match/[matchId]
 *
 * Match detail page showing live score, team info, dynamic fee ticker,
 * trading interface (SwapBox), event timeline, and WebSocket live updates.
 */

"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMatchState } from "@/hooks/useMatchState";
import { SwapBox } from "@/components/SwapBox";
import { LiveFeeTicker } from "@/components/LiveFeeTicker";
import { EventTimeline, type TimelineEvent } from "@/components/EventTimeline";
import { AiInsightCard } from "@/components/AiInsightCard";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getTeamCountryCode } from "@/lib/countries";
import {
  ArrowLeft,
  Trophy,
  Swords,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { isConnected } = useAccount();
  const { detail, liveState, loading, error, recentGoals, recentFeeChanges } =
    useMatchState(matchId);
  const [homeLogoFailed, setHomeLogoFailed] = useState(false);
  const [awayLogoFailed, setAwayLogoFailed] = useState(false);

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

  const teamColors: Record<string, { bg: string; accent: string; gradient: string }> = {
    // Auto-generated random-ish colors per matchId will be used as fallback
  };

  const getTeamColor = (name: string) => {
    const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const colors = [
      { bg: "bg-emerald-500/15", accent: "border-emerald-500/30", gradient: "from-emerald-500/5" },
      { bg: "bg-blue-500/15", accent: "border-blue-500/30", gradient: "from-blue-500/5" },
      { bg: "bg-purple-500/15", accent: "border-purple-500/30", gradient: "from-purple-500/5" },
      { bg: "bg-rose-500/15", accent: "border-rose-500/30", gradient: "from-rose-500/5" },
      { bg: "bg-amber-500/15", accent: "border-amber-500/30", gradient: "from-amber-500/5" },
      { bg: "bg-cyan-500/15", accent: "border-cyan-500/30", gradient: "from-cyan-500/5" },
    ];
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          {/* Breadcrumb */}
          <div className="h-4 w-32 rounded bg-zinc-800" />

          {/* Scoreboard skeleton */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-8 sm:gap-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-zinc-800" />
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-32 rounded bg-zinc-800" />
                  <div className="h-3 w-20 rounded bg-zinc-800" />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-zinc-800" />
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800" />
              <div className="h-48 rounded-xl bg-zinc-900/50 border border-zinc-800" />
            </div>
            <div className="h-80 rounded-xl bg-zinc-900/50 border border-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="relative mx-auto max-w-2xl px-4 py-24 sm:px-6 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-red-500/3 blur-[100px]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 mx-auto"
        >
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-xl font-bold text-zinc-100"
        >
          Match Not Found
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-sm text-zinc-500"
        >
          The match &quot;{matchId}&quot; could not be found or has been removed.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentFee = liveState?.feeTier ?? detail.feeTier;
  const feeReason = liveState?.feeReason ?? detail.feeReason;
  const matchStatus = liveState?.status ?? (detail.isFinished ? "FT" : "NS");
  const isLive = matchStatus === "LIV";
  const isFinished = matchStatus === "FT";
  const isUpcoming = matchStatus === "NS";

  const homeColor = getTeamColor(detail.homeTeam);
  const awayColor = getTeamColor(detail.awayTeam);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <motion.div {...fadeUp} transition={{ duration: 0.2 }} className="mb-6">
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Matches
        </Link>
      </motion.div>

      {/* ── Premium Scoreboard ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 p-6 sm:p-10">
          {/* Ambient background patterns */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/8 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent" />
          <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent" />

          {/* Status badge */}
          <div className="relative mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLive && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                    LIVE {liveState?.minute ?? detail.minute}&apos;
                  </span>
                </div>
              )}
              {isFinished && (
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Full Time
                  </span>
                </div>
              )}
              {isUpcoming && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400">
                    Upcoming
                  </span>
                </div>
              )}
            </div>

            {/* Match meta */}
            {detail.penaltyShootout && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Penalties
              </span>
            )}
          </div>

          {/* Teams + Score */}
          <div className="relative flex items-center justify-between gap-4 sm:gap-8">
            {/* Home Team */}
            <div className="flex flex-1 flex-col items-center sm:items-start">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`mb-3 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl ${homeColor.bg} ${homeColor.accent} border overflow-hidden`}
              >
                {(() => {
                  const cc = getTeamCountryCode(detail.homeTeam);
                  if (detail.homeLogo && !homeLogoFailed) {
                    return (
                      <img
                        src={detail.homeLogo}
                        alt={detail.homeTeam}
                        className="h-full w-full object-contain p-1.5"
                        onError={() => setHomeLogoFailed(true)}
                      />
                    );
                  }
                  return cc ? (
                    <CountryFlag countryCode={cc} size={4} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-zinc-300">
                      {detail.homeTeam.slice(0, 2).toUpperCase()}
                    </span>
                  );
                })()}
              </motion.div>
              <h2 className="text-sm sm:text-lg font-semibold text-zinc-100 text-center sm:text-left leading-tight">
                {detail.homeTeam}
              </h2>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-5">
                <motion.span
                  key={liveState?.homeScore ?? detail.homeScore}
                  initial={isLive ? { scale: 1.3 } : undefined}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-5xl font-bold tabular-nums sm:text-7xl text-zinc-100"
                >
                  {liveState?.homeScore ?? detail.homeScore}
                </motion.span>
                <span className="text-2xl text-zinc-700 sm:text-4xl font-light">:</span>
                <motion.span
                  key={liveState?.awayScore ?? detail.awayScore}
                  initial={isLive ? { scale: 1.3 } : undefined}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-5xl font-bold tabular-nums sm:text-7xl text-zinc-100"
                >
                  {liveState?.awayScore ?? detail.awayScore}
                </motion.span>
              </div>

              {/* Match stats */}
              <div className="flex items-center gap-3">
                {detail.redCards > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                    RC {detail.redCards}
                  </span>
                )}
                {isLive && (
                  <span className="text-[10px] text-zinc-600">Last update: just now</span>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-col items-center sm:items-end">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`mb-3 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl ${awayColor.bg} ${awayColor.accent} border overflow-hidden`}
              >
                {(() => {
                  const cc = getTeamCountryCode(detail.awayTeam);
                  if (detail.awayLogo && !awayLogoFailed) {
                    return (
                      <img
                        src={detail.awayLogo}
                        alt={detail.awayTeam}
                        className="h-full w-full object-contain p-1.5"
                        onError={() => setAwayLogoFailed(true)}
                      />
                    );
                  }
                  return cc ? (
                    <CountryFlag countryCode={cc} size={4} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-zinc-300">
                      {detail.awayTeam.slice(0, 2).toUpperCase()}
                    </span>
                  );
                })()}
              </motion.div>
              <h2 className="text-sm sm:text-lg font-semibold text-zinc-100 text-center sm:text-right leading-tight">
                {detail.awayTeam}
              </h2>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main Content Grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
          >
            <AiInsightCard
              homeTeam={detail.homeTeam}
              awayTeam={detail.awayTeam}
              homeScore={liveState?.homeScore ?? detail.homeScore}
              awayScore={liveState?.awayScore ?? detail.awayScore}
              minute={liveState?.minute ?? detail.minute}
              isFinished={isFinished}
              isUpcoming={isUpcoming}
              isLive={isLive}
              currentFee={currentFee}
              redCards={detail.redCards}
              penaltyShootout={detail.penaltyShootout}
              recentGoals={recentGoals}
            />
          </motion.div>

          {/* Fee Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <LiveFeeTicker
              currentFee={currentFee}
              feeReason={feeReason}
              feeHistory={recentFeeChanges.map((f) => ({
                fee: f.newFee,
                reason: f.reason,
                timestamp: Date.now(),
              }))}
            />
          </motion.div>

          {/* Event Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <EventTimeline events={timelineEvents} />
          </motion.div>
        </div>

        {/* Right Column — Swap Box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="lg:sticky lg:top-24 lg:self-start space-y-4"
        >
          <SwapBox
            matchId={matchId}
            homeTeam={detail.homeTeam}
            awayTeam={detail.awayTeam}
            currentFee={currentFee}
            feeReason={feeReason}
          />

          {/* Info card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-3.5 w-3.5 text-zinc-500" />
              <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {isFinished ? "Match Complete" : isUpcoming ? "Upcoming Match" : "Live Match"}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {isFinished
                ? "This match has finished. Outcome tokens can be redeemed for USDC based on the final result."
                : isUpcoming
                  ? "This match hasn't started yet. You can buy prediction tokens before kickoff to lock in current odds."
                  : "Live trading is active. Dynamic fees adjust in real-time based on match events — goals, cards, and stoppages."}
            </p>
          </div>

          {/* Wallet prompt */}
          {!isConnected && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Wallet</span>
              </div>
              <p className="text-xs text-zinc-500">
                Connect your wallet to start trading on this match. You&apos;ll need USDC on X Layer to buy prediction tokens.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
