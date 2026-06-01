/**
 * GoalSwap Arena — SwapBox
 *
 * Premium bet terminal. Dominant CTA with glow/scale,
 * live payout calculation, strong visual hierarchy.
 * Design: Polymarket terminal × Stripe checkout.
 */

"use client";

import { useState, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { contracts, xLayerTestnet, USDC_DECIMALS } from "@/lib/contracts";
import { useSwap } from "@/hooks/useSwap";
import type { FlagPalette } from "@/lib/flagColors";
import { cn } from "@/lib/utils";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  ArrowRight,
  Wallet,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface SwapBoxProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentFee?: number;
  feeReason?: string;
  homePalette?: FlagPalette;
  awayPalette?: FlagPalette;
}

type Outcome = "home" | "away" | "draw";

export function SwapBox({
  matchId,
  homeTeam,
  awayTeam,
  currentFee = 100,
  feeReason = "Normal play",
  homePalette,
  awayPalette,
}: SwapBoxProps) {
  const { address, isConnected } = useAccount();
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>("home");
  const [amount, setAmount] = useState("");
  const { loading, step, error, executeSwap, reset } = useSwap();

  const { data: usdcBalance } = useBalance({
    address,
    token: contracts.usdc,
    chainId: xLayerTestnet.id,
  });

  const feePct = currentFee / 10000;
  const enteredAmount = parseFloat(amount) || 0;
  const isAmountValid = enteredAmount > 0;

  // Live payout: stake minus fee = tokens received
  const predictedTokens = isAmountValid
    ? (enteredAmount / (1 + feePct / 100)).toFixed(2)
    : "0.00";

  // Fee in USDC
  const feeAmount = isAmountValid
    ? (enteredAmount - enteredAmount / (1 + feePct / 100)).toFixed(2)
    : "0.00";

  const handleSwap = useCallback(async () => {
    if (!isAmountValid) return;
    await executeSwap({
      matchId,
      amount,
      outcome: selectedOutcome,
      currentFee: currentFee,
    });
  }, [amount, selectedOutcome, matchId, executeSwap, isAmountValid, currentFee]);

  // ── Outcome buttons ──
  const outcomeButtons: Array<{
    key: Outcome;
    label: string;
    accent: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "home",
      label: homeTeam,
      accent: homePalette?.accent ?? "#00E68A",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
    },
    {
      key: "draw",
      label: "Draw",
      accent: "#8B5CF6",
      icon: <span className="text-[10px] font-black">=</span>,
    },
    {
      key: "away",
      label: awayTeam,
      accent: awayPalette?.accent ?? "#00E68A",
      icon: <TrendingDown className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card backdrop-blur-2xl p-6 shadow-[0_0_80px_-30px_rgba(0,0,0,0.5)]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-purple-500/10 border border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(0,230,138,0.15)]">
            <Trophy className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Place Your Bet</h3>
            <p className="text-xs text-zinc-500">Predict the outcome</p>
          </div>
        </div>

        {/* Live odds badge */}
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.12em]">
            Live
          </span>
        </div>
      </div>

      {/* ── Outcome Selection ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {outcomeButtons.map((o) => {
          const isSelected = selectedOutcome === o.key;
          const isDraw = o.key === "draw";
          return (
            <motion.button
              key={o.key}
              onClick={() => { setSelectedOutcome(o.key); reset(); }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border py-4 px-3 transition-all duration-200",
                isSelected
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_30px_-10px_rgba(0,230,138,0.2)]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]",
              )}
            >
              {/* Top accent line */}
              <div
                className={cn(
                  "absolute top-0 left-3 right-3 h-0.5 rounded-full transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0",
                )}
                style={{
                  background: `linear-gradient(90deg, ${o.accent}, transparent)`,
                }}
              />

              {/* Icon */}
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  isSelected
                    ? "text-white"
                    : "text-zinc-500",
                )}
                style={{
                  background: isSelected ? `${o.accent}22` : "transparent",
                  border: `1px solid ${isSelected ? `${o.accent}44` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <span className={isSelected ? "text-white" : "text-zinc-500"}>{o.icon}</span>
              </div>

              <span
                className={cn(
                  "text-xs font-semibold leading-tight text-center transition-colors",
                  isSelected ? "text-white" : "text-zinc-400",
                )}
              >
                {o.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  layoutId="selected-outcome-terminal"
                  className="absolute -inset-px rounded-xl border-2 border-emerald-500/30 pointer-events-none"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Stake Input — Large, dominant ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Stake Amount
          </label>
          {usdcBalance && (
            <button
              onClick={() =>
                setAmount(
                  (Number(usdcBalance.formatted) / 10 ** USDC_DECIMALS).toFixed(2),
                )
              }
              className="flex items-center gap-1 text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
            >
              <Wallet className="h-3 w-3" />
              {(Number(usdcBalance.formatted) / 10 ** USDC_DECIMALS).toFixed(2)} USDC
            </button>
          )}
        </div>

        <div className="relative">
          {/* Big input */}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-5 pr-24 py-4 text-2xl font-bold text-white placeholder-zinc-700 outline-none transition-all focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 font-[family-name:var(--font-inter)]"
            disabled={loading}
          />

          {/* USDC badge right side */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              USDC
            </span>
            {enteredAmount > 0 && (
              <button
                onClick={() => setAmount("")}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-300 transition-all"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Live Payout Calculation ── */}
      <AnimatePresence>
        {isAmountValid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.06] bg-black/40 backdrop-blur-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">You Receive</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">
                  {predictedTokens} <span className="text-xs font-medium text-emerald-400/70">tokens</span>
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Fee</span>
                <span className="text-sm font-semibold text-yellow-400/90 tabular-nums">
                  {feeAmount} USDC <span className="text-[10px] text-zinc-500 font-normal">({(feePct).toFixed(1)}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Reason</span>
                <span className="text-xs text-zinc-400 text-right max-w-[180px] truncate">
                  {feeReason}
                </span>
              </div>
              {/* Fee progress bar */}
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((feePct / 10) * 100, 100)}%`,
                    background: feePct >= 5
                      ? "linear-gradient(90deg, #f97316, #ef4444)"
                      : feePct >= 3
                        ? "linear-gradient(90deg, #eab308, #f97316)"
                        : "linear-gradient(90deg, #00E68A, #10b981)",
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400 flex items-center gap-2"
          >
            <Shield className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success ── */}
      <AnimatePresence>
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 text-sm text-emerald-400 flex items-center gap-3"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Bet placed successfully!</p>
              <p className="text-xs text-emerald-400/60 mt-0.5">Your position is now live.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Primary CTA — Large, dominant, glowing ── */}
      <motion.button
        onClick={handleSwap}
        disabled={!isConnected || !isAmountValid || loading}
        className="relative w-full overflow-hidden rounded-xl py-4 text-base font-bold text-black tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_8px_40px_-8px_rgba(0,230,138,0.35)] hover:shadow-[0_12px_50px_-8px_rgba(0,230,138,0.5)] group"
        whileHover={(!loading && isConnected && isAmountValid) ? { scale: 1.02 } : undefined}
        whileTap={(!loading && isConnected && isAmountValid) ? { scale: 0.97 } : undefined}
        style={{
          background: "linear-gradient(135deg, #00E68A 0%, #00FFAA 50%, #10b981 100%)",
          backgroundSize: "200% 100%",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundPosition = "100% 0";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundPosition = "0% 0";
        }}
      >
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out" />
        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl" />

        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>
                {step === "approving" ? "Approving USDC..." : "Placing Bet..."}
              </span>
            </>
          ) : !isConnected ? (
            <>
              <Wallet className="h-4 w-4" />
              <span>Connect Wallet to Bet</span>
            </>
          ) : !isAmountValid ? (
            <>
              <ArrowRight className="h-4 w-4" />
              <span>Enter Stake Amount</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Place Bet — {predictedTokens} Tokens</span>
            </>
          )}
        </span>
      </motion.button>

      {/* ── Trust Footer ── */}
      <div className="mt-5 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3 text-zinc-600">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-500/50" />
            Contract Verified
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-500/50" />
            Audited
          </span>
        </div>
        <span className="text-zinc-700 font-mono tabular-nums">
          {enteredAmount > 0 ? `${enteredAmount.toFixed(2)} USDC` : "—"}
        </span>
      </div>
    </div>
  );
}
