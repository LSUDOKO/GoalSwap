/**
 * GoalSwap Arena — /match/[matchId]
 *
 * World-class premium match detail page.
 * Cinema-style stadium hero, 96px scoreboard, odds cards,
 * AI insights with confidence meter, market sentiment gauge,
 * dynamic fee analytics, and a dominant bet terminal.
 *
 * Design: 70% Polymarket · 20% Stripe · 10% Apple
 * Quality: Awwwards Site of the Day
 */

"use client";

import { use, useMemo, useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMatchState } from "@/hooks/useMatchState";
import { SwapBox } from "@/components/SwapBox";
import { EventTimeline, type TimelineEvent } from "@/components/EventTimeline";
import { AiInsightCard } from "@/components/AiInsightCard";
import { LiveFeeTicker } from "@/components/LiveFeeTicker";
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
  Flame,
  Gift,
  Shield,
  BarChart3,
  Activity,
  Zap,
  TrendingUp,
  Target,
  ChevronDown,
  Calendar,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
//  WELCOME BONUS BANNER
// ═══════════════════════════════════════════════════════

function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(86400);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);
  if (dismissed) return null;
  const h = Math.floor(countdown / 3600);
  const m = Math.floor((countdown % 3600) / 60);
  const s = countdown % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-purple-500/10 mb-8 animate-[bonus-glow_3s_ease-in-out_infinite]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_4s_ease-in-out_infinite]" />
      <div className="relative flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
            <Gift className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Welcome Bonus — 100 USDC Free</h3>
            <p className="text-xs text-emerald-400/80 mt-0.5">Trade with zero risk on your first 3 predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400/60" />
            <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
              <span className="rounded-md bg-white/5 px-2 py-1 text-emerald-400 font-bold animate-[countdown-pulse_2s_ease-in-out_infinite]">{String(h).padStart(2,"0")}</span>
              <span className="text-zinc-600">:</span>
              <span className="rounded-md bg-white/5 px-2 py-1 text-emerald-400 font-bold">{String(m).padStart(2,"0")}</span>
              <span className="text-zinc-600">:</span>
              <span className="rounded-md bg-white/5 px-2 py-1 text-emerald-400 font-bold">{String(s).padStart(2,"0")}</span>
            </div>
          </div>
          <button className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-all hover:shadow-[0_0_30px_-5px_rgba(0,230,138,0.4)] active:scale-[0.97]">
            Claim Your Bonus
          </button>
          <button onClick={() => setDismissed(true)} className="text-zinc-600 hover:text-zinc-400 transition-colors">✕</button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
//  STADIUM BACKGROUND — Cinema-style fog & lighting
// ═══════════════════════════════════════════════════════

function StadiumBackground({ homeCountryCode, awayCountryCode: _away }: { homeCountryCode: string | null; awayCountryCode: string | null }) {
  const hp = getFlagPalette(homeCountryCode);
  const ap = getFlagPalette(_away);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070B] via-[#0A0F16] to-[#05070B]" />
      {/* Floodlight cones */}
      <div className="absolute -top-20 left-[10%] h-64 w-32 opacity-[0.04]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)", transform: "skewX(-15deg)" }} />
      <div className="absolute -top-20 right-[10%] h-64 w-32 opacity-[0.04]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)", transform: "skewX(15deg)" }} />
      {/* Team color washes */}
      <div className="absolute inset-y-0 left-0 w-1/3 opacity-[0.06]" style={{ background: `linear-gradient(135deg, ${hp.colors[0]}88 0%, transparent 100%)` }} />
      <div className="absolute inset-y-0 right-0 w-1/3 opacity-[0.06]" style={{ background: `linear-gradient(225deg, ${ap.colors[0]}88 0%, transparent 100%)` }} />
      {/* Center spotlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.03]" style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 70%)" }} />
      {/* Fog layers */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/[0.02] to-transparent" />
      <div className="absolute top-1/3 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent animate-[slow-drift_15s_ease-in-out_infinite]" />
      {/* Ambient orbs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/5 blur-[150px] animate-[drift_25s_ease-in-out_infinite]" />
      <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-500/5 blur-[150px] animate-[drift_30s_ease-in-out_infinite_reverse]" />
      {/* Pitch lines */}
      <div className="absolute top-1/2 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      <div className="absolute top-1/3 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
      <div className="absolute top-2/3 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  TEAM EMBLEM — Premium badge with flag gradient
// ═══════════════════════════════════════════════════════

function TeamEmblem({ teamName, teamLogo, size = "lg" }: { teamName: string; teamLogo?: string; size?: "sm" | "lg" | "xl" }) {
  const cc = getTeamCountryCode(teamName);
  const palette = getFlagPalette(cc);
  const [localFailed, setLocalFailed] = useState(false);
  const handleError = useCallback(() => setLocalFailed(true), []);
  const sizeMap = { sm: "h-10 w-10 ring-[2px]", lg: "h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 ring-[3px]", xl: "h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 ring-[4px]" };
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className={cn("relative flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm", sizeMap[size])}
      style={{
        background: `linear-gradient(135deg, ${palette.colors[0] || "#1a1a2e"}, ${palette.colors[palette.colors.length - 1] || "#0f3460"})`,
        boxShadow: `0 0 40px -10px ${palette.accent}33, inset 0 0 40px -20px rgba(255,255,255,0.1)`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5" />
      {teamLogo && !localFailed ? (
        <img src={teamLogo} alt={teamName} className="h-full w-full object-contain p-2 drop-shadow-xl" onError={handleError} />
      ) : cc ? (
        <CountryFlag countryCode={cc} size={size === "xl" ? 8 : size === "lg" ? 6 : 3} className="h-full w-full object-cover" />
      ) : (
        <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white/80 drop-shadow-xl">{teamName.slice(0, 2).toUpperCase()}</span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
//  MATCH STATUS BADGE
// ═══════════════════════════════════════════════════════

function MatchStatusBadge({ isLive, isFinished, isUpcoming, minute, redCards, penaltyShootout }: { isLive: boolean; isFinished: boolean; isUpcoming: boolean; minute?: number; redCards: number; penaltyShootout: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {isLive && minute !== undefined && (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 border border-emerald-500/20 backdrop-blur-sm shadow-[0_0_20px_-5px_rgba(0,230,138,0.2)]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
          {minute}&apos;
        </span>
      )}
      {isFinished && (
        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 border border-zinc-500/20 backdrop-blur-sm">
          <Trophy className="h-3.5 w-3.5" /> Full Time
        </span>
      )}
      {isUpcoming && (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 border border-emerald-500/20 backdrop-blur-sm shadow-[0_0_30px_-8px_rgba(0,230,138,0.3)]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
          Upcoming
        </span>
      )}
      {redCards > 0 && (
        <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 backdrop-blur-sm">🟥 {redCards}</span>
      )}
      {penaltyShootout && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-400 border border-purple-500/20 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Pens
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCOREBOARD — Massive 96px hero typography
// ═══════════════════════════════════════════════════════

function ScoreDisplay({ homeScore, awayScore, isLive }: { homeScore: number; awayScore: number; isLive: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center">
      <div className="relative px-8 sm:px-12 py-4 sm:py-6">
        <div className={cn("absolute -inset-8 rounded-full blur-3xl", isLive ? "bg-emerald-500/10 animate-[score-glow_2s_ease-in-out_infinite]" : "bg-white/[0.03]")} />
        <div className="relative flex items-center gap-4 sm:gap-6 md:gap-8">
          <motion.span
            key={homeScore}
            initial={isLive ? { scale: 1.3 } : undefined}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-7xl sm:text-8xl md:text-[96px] font-black tabular-nums text-white tracking-tighter leading-none"
            style={{ textShadow: isLive ? "0 0 40px rgba(0,230,138,0.15), 0 0 80px rgba(0,230,138,0.05)" : "0 0 30px rgba(0,0,0,0.3)" }}
          >
            {homeScore}
          </motion.span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-600 leading-none">:</span>
          <motion.span
            key={awayScore}
            initial={isLive ? { scale: 1.3 } : undefined}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-7xl sm:text-8xl md:text-[96px] font-black tabular-nums text-white tracking-tighter leading-none"
            style={{ textShadow: isLive ? "0 0 40px rgba(0,230,138,0.15), 0 0 80px rgba(0,230,138,0.05)" : "0 0 30px rgba(0,0,0,0.3)" }}
          >
            {awayScore}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ODDS CARD — Home Win / Draw / Away Win
// ═══════════════════════════════════════════════════════

type OutcomeType = "home" | "draw" | "away";

const ODDS_DATA: Record<OutcomeType, { odds: string; prob: string }> = {
  home: { odds: "2.45", prob: "40.8%" },
  draw: { odds: "3.10", prob: "32.3%" },
  away: { odds: "2.85", prob: "35.1%" },
};

function OddsCard({ type, teamName, palette, isSelected, onSelect }: { type: OutcomeType; teamName?: string; palette?: { accent: string; colors: string[] }; isSelected: boolean; onSelect: () => void }) {
  const data = ODDS_DATA[type];
  const accentColor = type === "draw" ? "#8B5CF6" : palette?.accent ?? "#00E68A";
  const displayLabel = type === "home" ? teamName ?? "Home" : type === "away" ? teamName ?? "Away" : "Draw";

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "relative flex-1 rounded-xl border p-4 sm:p-5 text-left transition-all duration-200",
        isSelected
          ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_-10px_rgba(0,230,138,0.2)]"
          : "border-white/[0.06] bg-card/60 hover:bg-card-hover/80 hover:border-white/[0.10]",
      )}
    >
      <div className="absolute top-0 left-3 right-3 h-0.5 rounded-full opacity-60" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div className="flex items-center gap-2.5 mb-3">
        {type !== "draw" ? (
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${accentColor}22`, borderColor: `${accentColor}44`, borderWidth: 1 }}>
            {displayLabel.slice(0, 1)}
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-purple-400">=</span>
          </div>
        )}
        <span className="text-sm font-semibold text-zinc-200">{displayLabel}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: accentColor }}>{data.odds}</span>
        <span className="text-xs text-zinc-500">{data.prob}</span>
      </div>
      {isSelected && (
        <motion.div layoutId="selected-odds" className="absolute -inset-px rounded-xl border-2 border-emerald-500/30 pointer-events-none" transition={{ type: "spring", stiffness: 300, damping: 25 }} />
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════
//  MARKET SENTIMENT — Radial gauge
// ═══════════════════════════════════════════════════════

function MarketSentimentGauge({ sentiment = 72 }: { sentiment?: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (sentiment / 100) * circumference;
  const isBullish = sentiment >= 50;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Market Sentiment</h3>
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Live</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              stroke={isBullish ? "#00E68A" : "#FFD84D"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,230,138,0.3))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black tabular-nums text-white">{sentiment}%</span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", isBullish ? "text-emerald-400" : "text-yellow-400")}>
              {isBullish ? "Bullish" : "Bearish"}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {[
            { label: "Home Win", value: 42, color: "#00E68A" },
            { label: "Draw", value: 28, color: "#8B5CF6" },
            { label: "Away Win", value: 30, color: "#FFD84D" },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{item.label}</span>
                <span className="text-zinc-200 font-semibold">{item.value}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  STREAK REWARDS — Gamification
// ═══════════════════════════════════════════════════════

function StreakRewards() {
  const streak = 5;
  const levels = [
    { level: 1, label: "Bronze", icon: "🥉", minStreak: 1, multiplier: "1x" },
    { level: 2, label: "Silver", icon: "🥈", minStreak: 3, multiplier: "1.5x" },
    { level: 3, label: "Gold", icon: "🥇", minStreak: 7, multiplier: "2x" },
    { level: 4, label: "Diamond", icon: "💎", minStreak: 14, multiplier: "3x" },
    { level: 5, label: "Legend", icon: "👑", minStreak: 30, multiplier: "5x" },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Streak Rewards</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 border border-orange-500/20">
          <Flame className="h-3 w-3 text-orange-400" />
          <span className="text-xs font-bold text-orange-400 tabular-nums">{streak} days</span>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {levels.map((lvl) => {
          const unlocked = streak >= lvl.minStreak;
          const isCurrent = levels.findIndex((l) => l.minStreak > streak) === -1 ? false : streak >= lvl.minStreak && streak < (levels.find((l) => l.minStreak > streak)?.minStreak ?? Infinity);
          return (
            <div key={lvl.level} className={cn("flex-1 flex flex-col items-center gap-1.5 rounded-lg py-3 px-1 transition-all", unlocked ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-white/[0.02] border border-white/[0.04] opacity-40")}>
              <span className="text-lg">{lvl.icon}</span>
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", unlocked ? "text-emerald-400" : "text-zinc-600")}>{lvl.label}</span>
              <span className={cn("text-[10px] font-mono tabular-nums", unlocked ? "text-zinc-300" : "text-zinc-700")}>{lvl.multiplier}</span>
            </div>
          );
        })}
      </div>
      {/* Progress to next level */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Next reward</span>
          <span className="text-emerald-400 font-semibold">Silver (3 days)</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-500" style={{ width: `${(streak / 7) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  NEXT MATCH CARD
// ═══════════════════════════════════════════════════════

function NextMatchCard({ homeTeam, awayTeam }: { homeTeam: string; awayTeam: string }) {
  const homeCC = getTeamCountryCode(homeTeam);
  const awayCC = getTeamCountryCode(awayTeam);
  const [reminder, setReminder] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Next Match</h3>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          {homeCC ? <CountryFlag countryCode={homeCC} size={2.5} className="rounded-full" /> : <div className="h-8 w-8 rounded-full bg-zinc-800" />}
          <span className="text-sm font-medium text-zinc-200 truncate">{homeTeam}</span>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">vs</span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium text-zinc-200 truncate">{awayTeam}</span>
          {awayCC ? <CountryFlag countryCode={awayCC} size={2.5} className="rounded-full" /> : <div className="h-8 w-8 rounded-full bg-zinc-800" />}
        </div>
      </div>
      <div className="rounded-lg bg-white/[0.03] p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">World Cup 2026</p>
          <p className="text-sm font-semibold text-zinc-300">Jun 14, 2026 — 21:00</p>
        </div>
        <motion.button
          onClick={() => setReminder(true)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            reminder
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.10] border border-white/[0.06]",
          )}
        >
          {reminder ? "✓ Reminder Set" : "Set Reminder"}
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAGE COMPONENT
// ═══════════════════════════════════════════════════════

export default function MatchDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { isConnected } = useAccount();
  const { detail, liveState, loading, error, recentGoals, recentFeeChanges } = useMatchState(matchId);
  const [selectedOddsOutcome, setSelectedOddsOutcome] = useState<OutcomeType | null>(null);

  // Timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    if (detail) {
      events.push({ type: "match_start", data: { matchId: detail.matchId, minute: 0, timestamp: new Date(detail.lastGoalTimestamp - 60000).getTime() }, timestamp: new Date(detail.lastGoalTimestamp - 60000).getTime() });
    }
    recentGoals.forEach((g) => events.push({ type: "goal", data: g, timestamp: Date.now() }));
    recentFeeChanges.forEach((f) => events.push({ type: "fee_change", data: f, timestamp: Date.now() }));
    return events;
  }, [detail, recentGoals, recentFeeChanges]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-8">
          <div className="h-4 w-32 rounded bg-zinc-800" />
          <div className="rounded-2xl border border-white/[0.05] bg-card/70 backdrop-blur-xl p-8 sm:p-12">
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
              <div className="h-32 rounded-xl bg-card/60 border border-white/[0.05]" />
              <div className="h-56 rounded-xl bg-card/60 border border-white/[0.05]" />
            </div>
            <div className="h-96 rounded-xl bg-card/60 border border-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !detail) {
    return (
      <div className="relative mx-auto max-w-2xl px-4 py-24 sm:px-6 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-red-500/3 blur-[100px]" />
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xl font-bold text-zinc-100">Match Not Found</motion.h2>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-2 text-sm text-zinc-500">The match &ldquo;{matchId}&rdquo; could not be found.</motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
          <Link href="/matches" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Matches
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Derived State ──
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

  // ── Render ──
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Background */}
      <StadiumBackground homeCountryCode={homeCountryCode} awayCountryCode={awayCountryCode} />

      {/* ── Welcome Bonus ── */}
      <WelcomeBanner />

      {/* ── Breadcrumb ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="relative z-10 mb-8">
        <Link href="/matches" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Matches
        </Link>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          STADIUM SCOREBOARD — Cinema hero
          ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl shadow-[0_0_80px_-30px_rgba(0,0,0,0.6)]">
          {/* Top glow bar */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 via-cyan-500/20 to-transparent" />

          {/* Match status at top left */}
          <div className="absolute top-4 left-5 z-20">
            <MatchStatusBadge
              isLive={isLive}
              isFinished={isFinished}
              isUpcoming={isUpcoming}
              minute={liveState?.minute ?? detail.minute}
              redCards={detail.redCards}
              penaltyShootout={detail.penaltyShootout}
            />
          </div>

          {/* Team emblems + score */}
          <div className="relative flex flex-row items-stretch pt-12 sm:pt-10 pb-6">
            {/* Home team */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
              <TeamEmblem teamName={detail.homeTeam} teamLogo={detail.homeLogo} size="lg" />
              <h2 className="mt-4 text-xl sm:text-2xl md:text-3xl font-bold text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] leading-tight tracking-tight">
                {detail.homeTeam}
              </h2>
            </div>

            {/* Score */}
            <div className="relative z-20 flex flex-col items-center justify-center px-2">
              <div className="absolute left-0 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
              <div className="absolute right-0 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
              <ScoreDisplay
                homeScore={liveState?.homeScore ?? detail.homeScore}
                awayScore={liveState?.awayScore ?? detail.awayScore}
                isLive={isLive}
              />
            </div>

            {/* Away team */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
              <TeamEmblem teamName={detail.awayTeam} teamLogo={detail.awayLogo} size="lg" />
              <h2 className="mt-4 text-xl sm:text-2xl md:text-3xl font-bold text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] leading-tight tracking-tight">
                {detail.awayTeam}
              </h2>
            </div>
          </div>

          {/* Bottom bar — fee + live indicator */}
          <div className="relative border-t border-white/[0.05] px-5 sm:px-8 py-3 flex items-center justify-between bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-xs text-zinc-500">
              <Gauge className="h-3.5 w-3.5 text-emerald-500/60" />
              <span>Dynamic Fee: <span className="text-zinc-200 font-bold">{(currentFee / 10000).toFixed(1)}%</span></span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">{feeReason}</span>
            </div>
            {isLive && <span className="text-[10px] text-zinc-600 font-mono">● Live</span>}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          ODDS CARDS ROW
          ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Market Odds</h3>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <OddsCard type="home" teamName={detail.homeTeam} palette={homePalette} isSelected={selectedOddsOutcome === "home"} onSelect={() => setSelectedOddsOutcome("home")} />
          <OddsCard type="draw" isSelected={selectedOddsOutcome === "draw"} onSelect={() => setSelectedOddsOutcome("draw")} />
          <OddsCard type="away" teamName={detail.awayTeam} palette={awayPalette} isSelected={selectedOddsOutcome === "away"} onSelect={() => setSelectedOddsOutcome("away")} />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT GRID
          ══════════════════════════════════════════════════ */}
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* ── Left Column ── */}
        <div className="space-y-8 min-w-0">
          {/* AI Insights */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3 }}>
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

          {/* Market Sentiment */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.3 }}>
            <MarketSentimentGauge />
          </motion.div>

          {/* Fee Ticker */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
            <LiveFeeTicker
              currentFee={currentFee}
              feeReason={feeReason}
              feeHistory={recentFeeChanges.map((f) => ({ fee: f.newFee, reason: f.reason, timestamp: Date.now() }))}
            />
          </motion.div>

          {/* Streak Rewards */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
            <StreakRewards />
          </motion.div>

          {/* Event Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
            <EventTimeline events={timelineEvents} />
          </motion.div>
        </div>

        {/* ── Right Column — Bet Terminal ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="lg:sticky lg:top-24 lg:self-start space-y-6"
        >
          {/* Next Match Card (shown when upcoming) */}
          {isUpcoming && <NextMatchCard homeTeam={detail.homeTeam} awayTeam={detail.awayTeam} />}

          {/* Bet Terminal */}
          <SwapBox
            matchId={matchId}
            homeTeam={detail.homeTeam}
            awayTeam={detail.awayTeam}
            currentFee={currentFee}
            feeReason={feeReason}
            homePalette={homePalette}
            awayPalette={awayPalette}
          />

          {/* Info Card */}
          <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-5">
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

          {/* Wallet Prompt */}
          {!isConnected && (
            <div className="rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                  <span className="text-xs font-bold text-blue-400">⊕</span>
                </div>
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Wallet</h3>
              </div>
              <p className="text-sm text-zinc-500">Connect your wallet to start trading. You&apos;ll need USDC on X Layer to buy prediction tokens.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
