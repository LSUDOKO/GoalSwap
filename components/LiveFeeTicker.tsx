/**
 * GoalSwap Arena — LiveFeeTicker
 *
 * Visual ticker that displays the current dynamic fee tier with color coding,
 * reason label, and a mini sparkline chart showing fee changes over time.
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

function getFeeTier(fee: number): {
  label: string;
  color: string;
  bg: string;
  barHeight: number;
} {
  if (fee >= 10000)
    return { label: "PEAK", color: "text-purple-400", bg: "bg-purple-500/20", barHeight: 100 };
  if (fee >= 5000)
    return { label: "VERY HIGH", color: "text-red-400", bg: "bg-red-500/20", barHeight: 80 };
  if (fee >= 3000)
    return { label: "HIGH", color: "text-orange-400", bg: "bg-orange-500/20", barHeight: 60 };
  if (fee >= 1000)
    return { label: "NORMAL", color: "text-yellow-400", bg: "bg-yellow-500/20", barHeight: 40 };
  return { label: "LOW", color: "text-zinc-400", bg: "bg-zinc-500/20", barHeight: 20 };
}

export function LiveFeeTicker({ currentFee, feeReason, feeHistory = [] }: LiveFeeTickerProps) {
  const tier = useMemo(() => getFeeTier(currentFee), [currentFee]);
  const feePct = (currentFee / 100).toFixed(1);

  // Sparkline: last 20 fee entries
  const sparklineData = useMemo(() => {
    const all = [...feeHistory, { fee: currentFee, reason: feeReason, timestamp: Date.now() }];
    return all.slice(-20).map((r) => r.fee);
  }, [currentFee, feeReason, feeHistory]);

  const maxSpark = Math.max(...sparklineData, 1);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">Dynamic Fee</h3>
        <AnimatePresence mode="wait">
          <motion.span
            key={tier.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`text-[10px] font-bold uppercase tracking-wider ${tier.color}`}
          >
            {tier.label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Fee percentage display */}
      <div className="flex items-baseline gap-1.5 mb-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={feePct}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`text-3xl font-bold tabular-nums transition-colors ${tier.color}`}
          >
            {feePct}%
          </motion.span>
        </AnimatePresence>
        <span className="text-xs text-zinc-500">fee</span>
      </div>

      {/* Fee reason */}
      <div className={`rounded-lg ${tier.bg} px-3 py-2 mb-4`}>
        <p className={`text-xs font-medium ${tier.color}`}>{feeReason}</p>
      </div>

      {/* Sparkline */}
      {sparklineData.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
            Fee history
          </span>
          <div className="flex items-end gap-px h-8">
            {sparklineData.map((fee, i) => {
              const h = Math.max((fee / maxSpark) * 100, 8);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    backgroundColor:
                      fee >= 10000
                        ? "#a855f7"
                        : fee >= 5000
                          ? "#ef4444"
                          : fee >= 3000
                            ? "#f97316"
                            : fee >= 1000
                              ? "#eab308"
                              : "#a1a1aa",
                    opacity: i < sparklineData.length - 1 ? 0.4 : 1,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
