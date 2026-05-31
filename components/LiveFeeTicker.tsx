/**
 * GoalSwap Arena — LiveFeeTicker
 *
 * Premium dynamic fee analytics panel.
 * Enterprise-grade gauge with animated ring, progress bar,
 * status indicators, history sparkline with area fill,
 * and fee tier badges.
 *
 * Design: Bloomberg Terminal × Stripe Dashboard
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Gauge, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

interface FeeRecord {
  fee: number;
  reason: string;
  timestamp: number;
}

interface LiveFeeTickerProps {
  currentFee: number;
  feeReason: string;
  feeHistory?: FeeRecord[];
}

// ─── Fee Tier ───

interface FeeTier {
  label: string;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  progress: number; // 0-100
  description: string;
}

function getFeeTier(fee: number): FeeTier {
  if (fee >= 100000)
    return {
      label: "PENALTY",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      barColor: "#a855f7",
      progress: 100,
      description: "Penalty shootout — extreme volatility",
    };
  if (fee >= 50000)
    return {
      label: "PEAK",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      barColor: "#ef4444",
      progress: 85,
      description: "Red card / final minutes — high volatility",
    };
  if (fee >= 30000)
    return {
      label: "ELEVATED",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      barColor: "#f97316",
      progress: 65,
      description: "Post-goal window — momentum shift",
    };
  if (fee >= 10000)
    return {
      label: "STANDARD",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      barColor: "#eab308",
      progress: 40,
      description: "Normal market conditions",
    };
  return {
    label: "LOW",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    barColor: "#00E68A",
    progress: 20,
    description: "Settlement / pre-match — minimal fee",
  };
}

// ─── Mini Sparkline ───

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 32;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  const line = points.join(" ");
  const area = `0,${h} ${points.join(" ")} ${w},${h}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {/* Area fill */}
      <defs>
        <linearGradient id={`fee-gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={area}
        fill={`url(#fee-gradient-${color.replace("#", "")})`}
      />
      {/* Line */}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_4px_var(--tw-shadow-color)]"
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      {/* End dot */}
      <circle cx={data.length > 0 ? w : 0} cy={data.length > 0 ? h - ((data[data.length - 1] - min) / range) * (h - 4) - 2 : h} r="2.5" fill={color} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export function LiveFeeTicker({ currentFee, feeReason, feeHistory = [] }: LiveFeeTickerProps) {
  const tier = useMemo(() => getFeeTier(currentFee), [currentFee]);
  const feePct = (currentFee / 100).toFixed(1);

  // Sparkline data — last 20 entries
  const sparklineData = useMemo(() => {
    const all = [...feeHistory, { fee: currentFee, reason: feeReason, timestamp: Date.now() }];
    return all.slice(-20).map((r) => r.fee);
  }, [currentFee, feeReason, feeHistory]);

  // Fee statistics
  const stats = useMemo(() => {
    if (sparklineData.length < 2) return null;
    const avg = sparklineData.reduce((a, b) => a + b, 0) / sparklineData.length;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const last = sparklineData[sparklineData.length - 1];
    const prev = sparklineData[sparklineData.length - 2];
    const trend = last > prev ? "up" : last < prev ? "down" : "flat";
    return { avg, max, min, trend, change: ((last - prev) / (prev || 1)) * 100 };
  }, [sparklineData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_-20px_rgba(0,0,0,0.3)]"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-transparent border border-white/[0.06]">
            <Gauge className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dynamic Fee</h3>
            <p className="text-[9px] text-zinc-600 mt-0.5">Uniswap V4 Hook</p>
          </div>
        </div>

        {/* Tier badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 border", tier.bg, tier.border)}
          >
            <span className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", tier.color)}>
              {tier.label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Fee Percentage Display ── */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={feePct}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn("text-4xl font-black tabular-nums tracking-tighter", tier.color)}
              >
                {feePct}%
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-zinc-600 font-medium">fee</span>
          </div>

          {/* Mini trend indicator */}
          {stats && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-600">vs prev</span>
              {stats.trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-red-400" />
              ) : stats.trend === "down" ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Activity className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span className={cn(
                "text-xs font-semibold tabular-nums",
                stats.trend === "up" ? "text-red-400" :
                stats.trend === "down" ? "text-emerald-400" :
                "text-zinc-500"
              )}>
                {stats.change > 0 ? "+" : ""}{stats.change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* ── Fee Reason ── */}
        <div className={cn("rounded-lg border px-4 py-3 flex items-center gap-3", tier.bg, tier.border)}>
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", tier.bg, "border", tier.border)}>
            <span className={cn("text-[10px] font-bold", tier.color)}>
              {tier.label.slice(0, 2)}
            </span>
          </div>
          <div>
            <p className={cn("text-sm font-medium", tier.color)}>{feeReason}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{tier.description}</p>
          </div>
        </div>

        {/* ── Fee Progress Bar ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-600">Fee level</span>
            <span className="text-zinc-400 font-mono tabular-nums">{tier.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tier.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${tier.barColor}, ${tier.barColor}99)`,
                boxShadow: `0 0 8px ${tier.barColor}44`,
              }}
            />
          </div>
        </div>

        {/* ── Sparkline Chart ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              <BarChart3 className="h-3 w-3" />
              Fee history
            </span>
            {stats && (
              <span className="text-[9px] text-zinc-700 font-mono tabular-nums">
                avg {(stats.avg / 100).toFixed(1)}% &middot; max {(stats.max / 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Sparkline */}
          <div className="rounded-lg bg-black/40 p-3 border border-white/[0.03]">
            <MiniSparkline data={sparklineData} color={tier.barColor} />
          </div>
        </div>

        {/* ── Status Indicators ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Status", value: currentFee <= 1000 ? "Low" : currentFee <= 10000 ? "Normal" : "Active", color: currentFee <= 1000 ? "text-emerald-400" : currentFee <= 10000 ? "text-yellow-400" : "text-red-400" },
            { label: "Volatility", value: tier.progress >= 65 ? "High" : tier.progress >= 40 ? "Moderate" : "Low", color: tier.progress >= 65 ? "text-red-400" : tier.progress >= 40 ? "text-yellow-400" : "text-emerald-400" },
            { label: "Liquidity", value: "Pooled", color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-black/30 border border-white/[0.03] px-3 py-2.5 text-center">
              <p className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn("text-[10px] font-bold tabular-nums", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
