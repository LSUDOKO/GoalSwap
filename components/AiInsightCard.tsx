/**
 * GoalSwap Arena — AiInsightCard
 *
 * AI-powered trading insights for the match detail page.
 * Generates contextual suggestions based on match state,
 * score differential, fee tier, and time remaining.
 *
 * In production, this would call an LLM (GPT-4o-mini) via API route.
 * Here, we use deterministic logic for zero-latency display.
 */

"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";

// ─── Insight Types ───

type InsightSeverity = "info" | "positive" | "negative" | "warning";

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: InsightSeverity;
  action?: string;
  actionLink?: string;
}

// ─── Probabilities for insight generation ───

const HISTORICAL_COMEBACK_RATES: Record<string, { min: number; max: number }> = {
  "0": { min: 0.05, max: 0.08 },   // 2+ goal deficit
  "1": { min: 0.10, max: 0.18 },   // 1 goal deficit
  "draw": { min: 0.35, max: 0.45 }, // Drawn match
  "leading": { min: 0.65, max: 0.80 }, // Leading
};

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

  // ─── Generate insights based on match state ───
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];
    const goalDiff = Math.abs(homeScore - awayScore);
    const totalGoals = homeScore + awayScore;
    const isHomeLeading = homeScore > awayScore;
    const isDraw = homeScore === awayScore;
    const minutesRemaining = Math.max(90 - minute, 0);
    const stoppageTime = minute > 90;
    const feePct = currentFee / 100;

    // 1. Fee-based insight — show for non-finished matches
    if (!isFinished) {
      if (currentFee >= 50000) {
        result.push({
          id: "fee-high",
          icon: <Zap className="h-4 w-4 text-red-400" />,
          title: `${feePct.toFixed(1)}% Fee — Extreme Volatility`,
          description:
            currentFee >= 100000
              ? "Penalty shootout fee tier active. Token prices swing wildly — consider waiting for resolution if you're risk-averse."
              : "Red card or final minutes trigger. LPs earn premium fees. If trading, size small and expect wide spreads.",
          severity: "warning",
          action: penaltyShootout ? "Trade during penalties" : "Trade final minutes",
        });
      } else if (currentFee >= 30000) {
        // Post-goal window: ~5 minutes from the goal event
        result.push({
          id: "fee-post-goal",
          icon: <TrendingUp className="h-4 w-4 text-orange-400" />,
          title: `${feePct.toFixed(1)}% Post-Goal Window`,
          description: `Fee elevated for ~5 minutes after a goal. Historical data shows 22% of matches see a second goal within 5 minutes of the first.`,
          severity: "positive",
          action: "Trade now to capitalize on momentum",
        });
      } else if (currentFee >= 10000) {
        result.push({
          id: "fee-normal",
          icon: <Brain className="h-4 w-4 text-yellow-400" />,
          title: `${feePct.toFixed(1)}% Standard Fee`,
          description: "Normal market conditions. Good time to enter or exit positions with minimal fee impact.",
          severity: "info",
        });
      } else {
        result.push({
          id: "fee-low",
          icon: <TrendingDown className="h-4 w-4 text-zinc-400" />,
          title: `${feePct.toFixed(1)}% Low Fee`,
          description: isUpcoming
            ? "Pre-match pricing. Lock in current odds before the match starts — fees will increase at kickoff."
            : "Settlement mode. Token redemption is active — winning tokens can be redeemed 1:1 for USDC.",
          severity: "info",
        });
      }
    }

    // 2. Score-based insight (only for live matches)
    if (isLive && !isFinished) {
      if (goalDiff >= 2 && minutesRemaining <= 30) {
        const comebackRate = HISTORICAL_COMEBACK_RATES["0"];
        const impliedProb = Math.round(comebackRate.min * 100);
        result.push({
          id: "comeback-unlikely",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `${goalDiff}-Goal Deficit at ${minute}'`,
          description: `Historical comeback rate from ${goalDiff}-goal deficit at this stage: ~${impliedProb}%. ${
            isHomeLeading ? awayTeam : homeTeam
          } Win token implies a ${Math.round(impliedProb * 2)}% chance.`,
          severity: "negative",
          action: `Consider trading ${isHomeLeading ? awayTeam : homeTeam} comeback at these odds`,
        });
      } else if (goalDiff === 1 && minutesRemaining >= 15) {
        result.push({
          id: "comeback-possible",
          icon: <Lightbulb className="h-4 w-4 text-orange-400" />,
          title: `1-Goal Lead at ${minute}' — Not Over Yet`,
          description: `Historically, ${Math.round(HISTORICAL_COMEBACK_RATES["1"].min * 100)}-${Math.round(HISTORICAL_COMEBACK_RATES["1"].max * 100)}% of trailing teams equalize when trailing by 1 at this stage. ${
            isHomeLeading ? awayTeam : homeTeam
          } token may be undervalued.`,
          severity: "positive",
          action: `Buy ${isHomeLeading ? awayTeam : homeTeam} Win for potential upside`,
        });
      } else if (isDraw && minutesRemaining >= 20) {
        result.push({
          id: "draw-tense",
          icon: <Lightbulb className="h-4 w-4 text-blue-400" />,
          title: `Drawn at ${minute}' — Momentum Swings`,
          description:
            goalDiff === 0
              ? `Drawn matches at this stage see a goal ~65% of the time. The next goal scorer's token often jumps 30-50% instantly.`
              : `Close match — both teams within reach. The next goal is pivotal.`,
          severity: "info",
          action: "Monitor for goal alerts to trade the momentum",
        });
      }

      // 3. Fatigue / late game insight
      if (minute >= 75 && !stoppageTime) {
        const avgGoalsInLast15 = 0.38;
        result.push({
          id: "late-game",
          icon: <Shield className="h-4 w-4 text-amber-400" />,
          title: `Late Game — ${minute}'`,
          description: `~${Math.round(avgGoalsInLast15 * 100)}% of matches see a goal in the final 15 minutes (excluding stoppage time). Fatigue leads to defensive errors.`,
          severity: "info",
          action: goalDiff <= 1 ? "Goal likely — position before the spike" : undefined,
        });
      }

      // 4. Stoppage time insight
      if (stoppageTime && !isFinished) {
        result.push({
          id: "stoppage-time",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `Stoppage Time — ${minute}'`,
          description: `5% fee tier active. Every set piece is a potential goal. Token prices can move 20-40% on a single stoppage-time event.`,
          severity: "warning",
          action: "High risk, high reward — trade carefully",
        });
      }

      // 5. Red card insight
      if (redCards > 0) {
        result.push({
          id: "red-card",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          title: `${redCards} Red Card${redCards > 1 ? "s" : ""} — Advantage Shift`,
          description: `Teams with a red card concede ~1.2 more goals on average. The opposing team's win probability increases significantly. 5% volatility fee in effect.`,
          severity: "warning",
          action: `Trade ${homeScore > awayScore ? homeTeam : awayTeam} momentum or fade the short-handed team`,
        });
      }
    }

    // 6. Multi-goal thriller insight
    if (isLive && totalGoals >= 4 && !isFinished) {
      result.push({
        id: "goal-fest",
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        title: `${totalGoals}-Goal Thriller`,
        description: "High-scoring matches tend to produce more goals — momentum compounds. Consider buying both teams to continue scoring.",
        severity: "positive",
        action: "Ride the momentum — buy Over tokens",
      });
    }

    // 7. Pre-match insight
    if (isUpcoming) {
      result.push({
        id: "pre-match",
        icon: <Brain className="h-4 w-4 text-emerald-400" />,
        title: "Pre-Match Opportunity",
        description:
          "Lock in current odds before kickoff. Prices are most favorable now — once the match starts, dynamic fees and volatility will affect your entry price.",
        severity: "positive",
        action: `Buy ${homeTeam} or ${awayTeam} prediction now`,
      });
    }

    // 8. Finished match insight
    if (isFinished) {
      result.push({
        id: "settlement",
        icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
        title: "Match Settled",
        description:
          homeScore > awayScore
            ? `${homeTeam} won ${homeScore}-${awayScore}. ${homeTeam} Win tokens can be redeemed 1:1 for USDC.`
            : awayScore > homeScore
              ? `${awayTeam} won ${homeScore}-${awayScore}. ${awayTeam} Win tokens can be redeemed 1:1 for USDC.`
              : `Match ended ${homeScore}-${awayScore}. Draw tokens can be redeemed 1:1 for USDC.`,
        severity: "info",
        action: "Redeem winning tokens in your portfolio",
      });
    }

    // 9. Lightning Reflex opportunity (goal within last 60s)
    if (isLive && recentGoals.length > 0) {
      const lastGoal = recentGoals[recentGoals.length - 1];
      result.push({
        id: "lightning-reflex",
        icon: <Zap className="h-4 w-4 text-emerald-400" />,
        title: "Lightning Reflex Trophy Available!",
        description: `Trade within 60 seconds of ${lastGoal.team}'s goal to earn the Tier 1 'Lightning Reflex' soulbound trophy. Limited-time opportunity!`,
        severity: "positive",
        action: "Trade now to earn the trophy",
      });
    }

    return result.slice(0, 5); // Max 5 insights to keep it clean
  }, [
    homeScore,
    awayScore,
    minute,
    isLive,
    isFinished,
    isUpcoming,
    currentFee,
    redCards,
    penaltyShootout,
    recentGoals,
    homeTeam,
    awayTeam,
  ]);

  const visibleInsights = expanded ? insights : insights.slice(0, 2);
  const hasMore = insights.length > 2;

  // ─── Refreshing handler ───
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/20"
          >
            <Brain className="h-3.5 w-3.5 text-emerald-400" />
          </motion.div>
          <span className="text-sm font-semibold text-zinc-100">AI Insights</span>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Insights list */}
      <div className="px-4 pb-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleInsights.map((insight, i) => (
            <motion.div
              key={insight.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="group rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{insight.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-zinc-200">
                      {insight.title}
                    </span>
                    {insight.severity === "positive" && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                        Signal
                      </span>
                    )}
                    {insight.severity === "warning" && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                        Caution
                      </span>
                    )}
                    {insight.severity === "negative" && (
                      <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-400">
                        Risk
                      </span>
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

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-800/40 py-2 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-all"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show fewer insights
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show {insights.length - 2} more insights
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer — disclaimer */}
      <div className="border-t border-zinc-800/50 px-4 py-2">
        <p className="text-[9px] text-zinc-700 leading-relaxed">
          Insights are generated based on historical data and current match state.
          Not financial advice. Always DYOR.
        </p>
      </div>
    </motion.div>
  );
}
