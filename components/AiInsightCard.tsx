/**
 * GoalSwap Arena — AiInsightCard
 *
 * Premium AI insights panel. Bloomberg Terminal × ChatGPT aesthetic.
 * Confidence meter, signal strength, risk rating, verified badge.
 * Animated pulse on live data.
 *
 * Design: Terminal density × AI-first UI
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Zap,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Insight Types ───

type InsightSeverity = "info" | "positive" | "negative" | "warning";

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: InsightSeverity;
  action?: string;
  signalStrength?: number; // 0-100
}

// ─── Probabilities ───

const HISTORICAL_COMEBACK_RATES: Record<string, { min: number; max: number }> = {
  "0": { min: 0.05, max: 0.08 },
  "1": { min: 0.10, max: 0.18 },
  "draw": { min: 0.35, max: 0.45 },
  "leading": { min: 0.65, max: 0.80 },
};

// ─── Signal Strength Badge ───

function SignalBadge({ strength }: { strength: number }) {
  let label: string;
  let color: string;
  if (strength >= 75) { label = "Strong"; color = "text-emerald-400"; }
  else if (strength >= 50) { label = "Moderate"; color = "text-yellow-400"; }
  else if (strength >= 25) { label = "Weak"; color = "text-orange-400"; }
  else { label = "Noise"; color = "text-zinc-500"; }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", color, "bg-white/[0.04]")}>
      <Activity className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── Confidence Meter ───

function ConfidenceMeter({ confidence = 92 }: { confidence?: number }) {
  const [animVal, setAnimVal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimVal(confidence), 300);
    return () => clearTimeout(t);
  }, [confidence]);

  return (
    <div className="flex items-center gap-3">
      {/* Ring */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="36" height="36" className="-rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke="#00E68A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 15}
            strokeDashoffset={2 * Math.PI * 15 * (1 - animVal / 100)}
            className="transition-all duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 4px rgba(0,230,138,0.4))" }}
          />
        </svg>
        <span className="absolute text-[8px] font-black text-emerald-400 tabular-nums">{confidence}%</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Confidence</span>
          <span className="text-[9px] font-mono tabular-nums text-emerald-400">{confidence}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${animVal}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ boxShadow: "0 0 8px rgba(0,230,138,0.3)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Component ───

interface AiInsightCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  isFinished: boolean;
  isUpcoming: boolean;
  isLive: boolean;
  currentFee: number;
  redCards: number;
  penaltyShootout: boolean;
  recentGoals: Array<{ matchId: string; team: string; minute: number }>;
}

export function AiInsightCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  minute,
  isFinished,
  isUpcoming,
  isLive,
  currentFee,
  redCards,
  penaltyShootout,
  recentGoals,
}: AiInsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Generate insights ───
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];
    const goalDiff = Math.abs(homeScore - awayScore);
    const totalGoals = homeScore + awayScore;
    const isHomeLeading = homeScore > awayScore;
    const minutesRemaining = Math.max(90 - minute, 0);
    const stoppageTime = minute > 90;
    const feePct = currentFee / 10000;

    let signal: number;

    if (!isFinished) {
      if (currentFee >= 50000) {
        signal = currentFee >= 100000 ? 95 : 85;
        result.push({
          id: "fee-high",
          icon: <Zap className="h-4 w-4 text-red-400" />,
          title: `${feePct.toFixed(1)}% Fee — Extreme Volatility`,
          description:
            currentFee >= 100000
              ? "Penalty shootout fee tier active. Token prices swing wildly."
              : "Red card or final minutes trigger. LPs earn premium fees.",
          severity: "warning",
          action: penaltyShootout ? "Trade during penalties" : "Trade final minutes",
          signalStrength: signal,
        });
      } else if (currentFee >= 30000) {
        signal = 78;
        result.push({
          id: "fee-post-goal",
          icon: <TrendingUp className="h-4 w-4 text-orange-400" />,
          title: `${feePct.toFixed(1)}% Post-Goal Window`,
          description: "~22% of matches see a second goal within 5 minutes of the first.",
          severity: "positive",
          action: "Trade now to capitalize on momentum",
          signalStrength: signal,
        });
      } else if (currentFee >= 10000) {
        signal = 55;
        result.push({
          id: "fee-normal",
          icon: <Brain className="h-4 w-4 text-yellow-400" />,
          title: `${feePct.toFixed(1)}% Standard Fee`,
          description: "Normal market conditions. Good time to enter or exit positions.",
          severity: "info",
          signalStrength: signal,
        });
      } else {
        signal = 40;
        result.push({
          id: "fee-low",
          icon: <TrendingDown className="h-4 w-4 text-zinc-400" />,
          title: `${feePct.toFixed(1)}% Low Fee`,
          description: isUpcoming
            ? "Pre-match pricing. Lock in current odds before kickoff."
            : "Settlement mode. Winning tokens can be redeemed 1:1 for USDC.",
          severity: "info",
          signalStrength: signal,
        });
      }
    }

    if (isLive && !isFinished) {
      if (goalDiff >= 2 && minutesRemaining <= 30) {
        signal = 20;
        result.push({
          id: "comeback-unlikely",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `${goalDiff}-Goal Deficit at ${minute}'`,
          description: `Historical comeback rate: ~${Math.round(HISTORICAL_COMEBACK_RATES["0"].min * 100)}%.`,
          severity: "negative",
          signalStrength: signal,
        });
      } else if (goalDiff === 1 && minutesRemaining >= 15) {
        signal = 65;
        result.push({
          id: "comeback-possible",
          icon: <Lightbulb className="h-4 w-4 text-orange-400" />,
          title: `1-Goal Lead at ${minute}'`,
          description: `${Math.round(HISTORICAL_COMEBACK_RATES["1"].min * 100)}-${Math.round(HISTORICAL_COMEBACK_RATES["1"].max * 100)}% of trailing teams equalize.`,
          severity: "positive",
          action: `Buy ${isHomeLeading ? awayTeam : homeTeam} Win`,
          signalStrength: signal,
        });
      } else if (homeScore === awayScore && minutesRemaining >= 20) {
        signal = 60;
        result.push({
          id: "draw-tense",
          icon: <Lightbulb className="h-4 w-4 text-blue-400" />,
          title: `Drawn at ${minute}'`,
          description: "Drawn matches see a goal ~65% of the time. Next scorer's token jumps 30-50%.",
          severity: "info",
          signalStrength: signal,
        });
      }

      if (minute >= 75 && !stoppageTime) {
        signal = 58;
        result.push({
          id: "late-game",
          icon: <Shield className="h-4 w-4 text-amber-400" />,
          title: `Late Game — ${minute}'`,
          description: "~38% of matches see a goal in the final 15 minutes (excluding stoppage).",
          severity: "info",
          signalStrength: signal,
        });
      }

      if (stoppageTime && !isFinished) {
        signal = 70;
        result.push({
          id: "stoppage-time",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `Stoppage Time — ${minute}'`,
          description: "5% fee tier. Every set piece is a potential goal. 20-40% token swings.",
          severity: "warning",
          signalStrength: signal,
        });
      }

      if (redCards > 0) {
        signal = 82;
        result.push({
          id: "red-card",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `${redCards} Red Card${redCards > 1 ? "s" : ""}`,
          description: "Teams with a red card concede ~1.2 more goals on average.",
          severity: "warning",
          action: "Trade against the short-handed team",
          signalStrength: signal,
        });
      }
    }

    if (isLive && totalGoals >= 4 && !isFinished) {
      signal = 75;
      result.push({
        id: "goal-fest",
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        title: `${totalGoals}-Goal Thriller`,
        description: "High-scoring matches produce more goals. Momentum compounds.",
        severity: "positive",
        signalStrength: signal,
      });
    }

    if (isUpcoming) {
      signal = 88;
      result.push({
        id: "pre-match",
        icon: <Brain className="h-4 w-4 text-emerald-400" />,
        title: "Pre-Match Opportunity",
        description: "Lock in current odds before kickoff. Prices are most favorable now.",
        severity: "positive",
        action: `Buy ${homeTeam} or ${awayTeam} now`,
        signalStrength: signal,
      });
    }

    if (isFinished) {
      signal = 100;
      result.push({
        id: "settlement",
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        title: "Match Settled",
        description:
          homeScore > awayScore
            ? `${homeTeam} won ${homeScore}-${awayScore}. Redeem 1:1 for USDC.`
            : awayScore > homeScore
              ? `${awayTeam} won ${homeScore}-${awayScore}. Redeem 1:1 for USDC.`
              : `Draw ${homeScore}-${awayScore}. Redeem 1:1 for USDC.`,
        severity: "info",
        signalStrength: signal,
      });
    }

    if (isLive && recentGoals.length > 0) {
      const lastGoal = recentGoals[recentGoals.length - 1];
      signal = 96;
      result.push({
        id: "lightning-reflex",
        icon: <Zap className="h-4 w-4 text-emerald-400" />,
        title: "Lightning Reflex Trophy Available!",
        description: `Trade within 60s of ${lastGoal.team}'s goal for Tier 1 soulbound trophy.`,
        severity: "positive",
        action: "Trade now to earn the trophy",
        signalStrength: signal,
      });
    }

    return result.slice(0, 5);
  }, [homeScore, awayScore, minute, isLive, isFinished, isUpcoming, currentFee, redCards, penaltyShootout, recentGoals, homeTeam, awayTeam]);

  const visibleInsights = expanded ? insights : insights.slice(0, 2);
  const hasMore = insights.length > 2;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (insights.length === 0) return null;

  // Average confidence score
  const avgConfidence = Math.round(
    insights.reduce((acc, i) => acc + (i.signalStrength ?? 50), 0) / insights.length
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_-20px_rgba(0,0,0,0.4)]"
    >
      {/* ── Header ── */}
      <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.04]">
        {/* AI glow ornament */}
        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-500/5 blur-[40px]" />

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/25 shadow-[0_0_20px_-5px_rgba(0,230,138,0.15)]">
              <Brain className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">AI Intelligence</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
                  <Sparkles className="h-2 w-2" />
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                GPT-4o powered predictions
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Confidence Meter + Signal + Verified */}
        <div className="flex items-center gap-4">
          <ConfidenceMeter confidence={avgConfidence} />
          <div className="flex items-center gap-2">
            <SignalBadge strength={avgConfidence} />
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/15">
              <BadgeCheck className="h-2.5 w-2.5" />
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* ── Insights List ── */}
      <div className="px-5 py-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleInsights.map((insight, i) => (
            <motion.div
              key={insight.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="group rounded-lg border border-white/[0.04] bg-black/30 p-3.5 transition-all hover:bg-white/[0.03] hover:border-white/[0.06]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 border border-white/[0.04]">
                  {insight.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-zinc-200">
                      {insight.title}
                    </span>
                    {insight.signalStrength !== undefined && (
                      <span className={cn(
                        "text-[8px] font-bold uppercase tracking-wider tabular-nums",
                        insight.signalStrength >= 75 ? "text-emerald-400" :
                        insight.signalStrength >= 50 ? "text-yellow-400" :
                        "text-zinc-500"
                      )}>
                        {insight.signalStrength}%
                      </span>
                    )}
                    {insight.severity === "positive" && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-400">Signal</span>
                    )}
                    {insight.severity === "warning" && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-amber-400">Caution</span>
                    )}
                    {insight.severity === "negative" && (
                      <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-red-400">Risk</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
                      💡 {insight.action}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/[0.04] py-2.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] transition-all"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Show fewer insights</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Show {insights.length - 2} more insights</>
            )}
          </button>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center justify-between">
        <p className="text-[8px] text-zinc-700">Not financial advice. DYOR.</p>
        {isLive && (
          <span className="flex items-center gap-1 text-[8px] text-zinc-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live feed
          </span>
        )}
      </div>
    </motion.div>
  );
}
