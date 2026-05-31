/**
 * GoalSwap Arena — /match/[matchId]
 *
 * Neo-Iridescent Holographic Glass scoreboard with flag-themed team gradients,
 * massive typography, frosted glassmorphism panels, and floating ambient orbs.
 */

"use client";

import { use, useMemo, useState, useCallback } from "react";
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
import { getFlagPalette } from "@/lib/flagColors";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Trophy,
  Clock,
  AlertTriangle,
  Sparkles,
  Gauge,
} from "lucide-react";

// ── Floating Ambient Orbs ──────────────────────────────
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Deep purple orb — top left */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-600/15 blur-[120px] animate-[drift_20s_ease-in-out_infinite]" />
      {/* Cyan orb — bottom right */}
      <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-[140px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
      {/* Emerald orb — center top */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/5 blur-[160px] animate-[drift_30s_ease-in-out_infinite]" />
    </div>
  );
}

// ── Team Flag Gradient Background ──────────────────────
function TeamGradient({
  countryCode,
  children,
  side,
}: {
  countryCode: string | null;
  children: React.ReactNode;
  side: "home" | "away";
}) {
  const palette = getFlagPalette(countryCode);
  const gradientAngle = side === "home" ? 135 : 45;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 md:py-16 overflow-hidden min-h-[240px] sm:min-h-[280px]">
      {/* Primary flag gradient — 40% opacity for stadium presence */}
      <div
        className="absolute inset-0 opacity-40 sm:opacity-45"
        style={{
          background: `linear-gradient(${gradientAngle}deg, ${palette.colors.join(", ")})`,
        }}
      />

      {/* Secondary radial glow from center of each side */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(ellipse at ${side === "home" ? "30%" : "70%"} 50%, ${palette.accent}66 0%, transparent 70%)`,
        }}
      />

      {/* Holographic sheen overlay */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          background: `linear-gradient(${gradientAngle + 90}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)`,
        }}
      />

      {/* Side accent glow bar */}
      <div
        className="absolute top-0 bottom-0 w-1.5"
        style={{
          [side === "home" ? "right" : "left"]: 0,
          background: `linear-gradient(to bottom, transparent, ${palette.accent}99, transparent)`,
          boxShadow: `0 0 20px ${palette.accent}44`,
        }}
      />

      {children}
    </div>
  );
}

// ── Scoreboard Score Display ───────────────────────────
function ScoreDisplay({
  homeScore,
  awayScore,
  isLive,
  minute,
  isFinished,
  redCards,
  penaltyShootout,
}: {
  homeScore: number;
  awayScore: number;
  isLive: boolean;
  minute?: number;
  isFinished: boolean;
  redCards: number;
  penaltyShootout: boolean;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center px-3 py-4">
      {/* Glass score pod */}
      <div className="relative">
        {/* Outer iridescent glow ring */}
        <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-purple-500/8 via-emerald-500/8 to-cyan-500/8 blur-3xl" />

        {/* Score numbers — massive hero typography */}
        <div className="relative flex items-center gap-3 sm:gap-5">
          <motion.span
            key={homeScore}
            initial={isLive ? { scale: 1.4 } : undefined}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-7xl sm:text-8xl md:text-9xl font-black tabular-nums text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.08)] tracking-tighter"
          >
            {homeScore}
          </motion.span>

          <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-600 drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]">
            :
          </span>

          <motion.span
            key={awayScore}
            initial={isLive ? { scale: 1.4 } : undefined}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-7xl sm:text-8xl md:text-9xl font-black tabular-nums text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.08)] tracking-tighter"
          >
            {awayScore}
          </motion.span>
        </div>
      </div>

      {/* Match status badges */}
      <div className="mt-5 flex items-center gap-2.5">
        {isLive && minute !== undefined && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 border border-emerald-500/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {minute}&apos;
          </span>
        )}
        {isFinished && (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 border border-zinc-500/20 backdrop-blur-sm">
            <Trophy className="h-3.5 w-3.5" />
            Full Time
          </span>
        )}
        {!isLive && !isFinished && (
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-blue-400 border border-blue-500/20 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5" />
            Upcoming
          </span>
        )}
        {redCards > 0 && (
          <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 backdrop-blur-sm">
            🟥 {redCards}
          </span>
        )}
        {penaltyShootout && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-400 border border-purple-500/20 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Pens
          </span>
        )}
      </div>
    </div>
  );
}

// ── Team Emblem ────────────────────────────────────────
function TeamEmblem({
  teamName,
  teamLogo,
  size = "lg",
}: {
  teamName: string;
  teamLogo?: string;
  size?: "sm" | "lg";
}) {
  const cc = getTeamCountryCode(teamName);
  const palette = getFlagPalette(cc);
  const [localFailed, setLocalFailed] = useState(false);

  const sizeClasses =
    size === "lg"
      ? "h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 ring-[3px] ring-white/[0.08]"
      : "h-8 w-8 ring-[1.5px] ring-white/[0.08]";

  const handleError = useCallback(() => {
    setLocalFailed(true);
  }, []);

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className={cn(
        "relative flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm",
        sizeClasses,
      )}
      style={{
        background: `linear-gradient(135deg, ${palette.colors[0] || "#1a1a2e"}, ${palette.colors[palette.colors.length - 1] || "#0f3460"})`,
      }}
    >
      {/* Iridescent inner glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />

      {teamLogo && !localFailed ? (
        <img
          src={teamLogo}
          alt={teamName}
          className="h-full w-full object-contain p-2 drop-shadow-xl"
          onError={handleError}
        />
      ) : cc ? (
        <CountryFlag
          countryCode={cc}
          size={size === "lg" ? 5 : 2.5}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white/80 drop-shadow-xl">
          {teamName.slice(0, 2).toUpperCase()}
        </span>
      )}

      {/* Bottom gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

// ── Page Component ─────────────────────────────────────
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
      events.push({ type: "goal", data: g, timestamp: Date.now() });
    });

    recentFeeChanges.forEach((f) => {
      events.push({ type: "fee_change", data: f, timestamp: Date.now() });
    });

    return events;
  }, [detail, recentGoals, recentFeeChanges]);

  // ── Loading State ────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-8">
          <div className="h-4 w-32 rounded bg-zinc-800" />
          <div className="rounded-2xl border border-white/[0.05] bg-zinc-900/70 backdrop-blur-xl p-8 sm:p-12">
            <div className="flex items-center justify-center gap-8 sm:gap-20">
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-zinc-800" />
                <div className="h-5 w-28 rounded bg-zinc-800" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-40 rounded bg-zinc-800" />
                <div className="h-4 w-24 rounded bg-zinc-800" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-zinc-800" />
                <div className="h-5 w-28 rounded bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <div className="h-32 rounded-xl bg-zinc-900/60 border border-white/[0.05]" />
              <div className="h-56 rounded-xl bg-zinc-900/60 border border-white/[0.05]" />
            </div>
            <div className="h-96 rounded-xl bg-zinc-900/60 border border-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────
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
          The match &ldquo;{matchId}&rdquo; could not be found or has been
          removed.
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

  // ── Derived State ────────────────────────────────────
  const currentFee = liveState?.feeTier ?? detail.feeTier;
  const feeReason = liveState?.feeReason ?? detail.feeReason;
  const matchStatus = liveState?.status ?? (detail.isFinished ? "FT" : "NS");
  const isLive = matchStatus === "LIV";
  const isFinished = matchStatus === "FT";
  const isUpcoming = matchStatus === "NS";

  const homeCountryCode = getTeamCountryCode(detail.homeTeam);
  const awayCountryCode = getTeamCountryCode(detail.awayTeam);
  const homePalette = getFlagPalette(homeCountryCode);
  const awayPalette = getFlagPalette(awayCountryCode);

  // ── Render ───────────────────────────────────────────
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Background ambient floating orbs */}
      <FloatingOrbs />

      {/* ── Breadcrumb ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 mb-8"
      >
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Matches
        </Link>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          NEO-IRIDESCENT STADIUM SCOREBOARD
          ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mb-12"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl shadow-[0_0_80px_-30px_rgba(0,0,0,0.6)]">
          {/* Top iridescent glow bar */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 via-cyan-500/20 to-transparent" />

          {/* Main arena split */}
          <div className="relative flex flex-row items-stretch">
            {/* ── HOME TEAM ── */}
            <TeamGradient countryCode={homeCountryCode} side="home">
              <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-5">
                <TeamEmblem
                  teamName={detail.homeTeam}
                  teamLogo={detail.homeLogo}
                  size="lg"
                />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] leading-tight">
                  {detail.homeTeam}
                </h2>
                {isLive && (
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">
                    Home
                  </span>
                )}
              </div>
            </TeamGradient>

            {/* ── CENTER SCORE ── */}
            <div className="relative z-20 flex flex-col items-center justify-center px-2">
              {/* Vertical divider lines */}
              <div className="absolute left-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
              <div className="absolute right-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

              <ScoreDisplay
                homeScore={liveState?.homeScore ?? detail.homeScore}
                awayScore={liveState?.awayScore ?? detail.awayScore}
                isLive={isLive}
                minute={liveState?.minute ?? detail.minute}
                isFinished={isFinished}
                redCards={detail.redCards}
                penaltyShootout={detail.penaltyShootout}
              />
            </div>

            {/* ── AWAY TEAM ── */}
            <TeamGradient countryCode={awayCountryCode} side="away">
              <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-5">
                <TeamEmblem
                  teamName={detail.awayTeam}
                  teamLogo={detail.awayLogo}
                  size="lg"
                />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] leading-tight">
                  {detail.awayTeam}
                </h2>
                {isLive && (
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">
                    Away
                  </span>
                )}
              </div>
            </TeamGradient>
          </div>

          {/* ── Bottom fee bar ── */}
          <div className="relative border-t border-white/[0.05] px-5 sm:px-8 py-3 flex items-center justify-between bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-xs text-zinc-500">
              <Gauge className="h-3.5 w-3.5 text-emerald-500/60" />
              <span>
                Dynamic Fee:{" "}
                <span className="text-zinc-200 font-bold">
                  {(currentFee / 100).toFixed(1)}%
                </span>
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">{feeReason}</span>
            </div>
            {isLive && (
              <span className="text-[10px] text-zinc-600 font-mono">
                ● Live
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT GRID
          ══════════════════════════════════════════════════ */}
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* ── Left Column ── */}
        <div className="space-y-8 min-w-0">
          {/* AI Insights — Glass Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
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

          {/* Fee Ticker — Glass Card */}
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

        {/* ── Right Column — Swap Box ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="lg:sticky lg:top-24 lg:self-start space-y-6"
        >
          <SwapBox
            matchId={matchId}
            homeTeam={detail.homeTeam}
            awayTeam={detail.awayTeam}
            currentFee={currentFee}
            feeReason={feeReason}
            homePalette={homePalette}
            awayPalette={awayPalette}
          />

          {/* Info Card — Glass */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400">i</span>
              </div>
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                {isFinished ? "Match Complete" : isUpcoming ? "Upcoming Match" : "Live Match"}
              </h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {isFinished
                ? "This match has finished. Outcome tokens can be redeemed for USDC based on the final result."
                : isUpcoming
                  ? "This match hasn't started yet. Buy prediction tokens before kickoff to lock in current odds."
                  : "Live trading is active. Dynamic fees adjust in real-time based on match events — goals, cards, and stoppages."}
            </p>
          </div>

          {/* Wallet Prompt — Glass */}
          {!isConnected && (
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                  <span className="text-xs font-bold text-blue-400">⊕</span>
                </div>
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Wallet
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Connect your wallet to start trading. You&apos;ll need USDC on X
                Layer to buy prediction tokens.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
