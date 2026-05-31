/**
 * GoalSwap Arena — SwapBox
 *
 * Neo-Iridescent betting terminal with frosted glassmorphism,
 * team-colored outcomes, and a liquid gradient CTA.
 */

"use client";

import { useState, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { contracts, xLayerTestnet, USDC_DECIMALS } from "@/lib/contracts";
import { useSwap } from "@/hooks/useSwap";
import type { FlagPalette } from "@/lib/flagColors";

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

  const feePercent = (currentFee / 100).toFixed(1);
  const isAmountValid = amount && parseFloat(amount) > 0;

  const handleSwap = useCallback(async () => {
    if (!isAmountValid) return;
    await executeSwap({
      matchId,
      amount,
      outcome: selectedOutcome,
    });
  }, [amount, selectedOutcome, matchId, executeSwap, isAmountValid]);

  const predictedTokens = amount
    ? (parseFloat(amount) / (1 + currentFee / 10000)).toFixed(2)
    : "0.00";

  // ── Outcome buttons ────────────────────────────────
  const outcomeButtons: Array<{
    key: Outcome;
    label: string;
    accent: string;
  }> = [
    {
      key: "home",
      label: `${homeTeam}`,
      accent: homePalette?.accent ?? "#22c55e",
    },
    {
      key: "draw",
      label: "Draw",
      accent: "#a1a1aa",
    },
    {
      key: "away",
      label: `${awayTeam}`,
      accent: awayPalette?.accent ?? "#22c55e",
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_50px_-20px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-purple-500/10 border border-white/[0.08]">
            <span className="text-xs font-black text-emerald-400">$</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Bet Terminal
            </h3>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Predict &amp; earn USDC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/50 border border-white/[0.04]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
            Live odds
          </span>
        </div>
      </div>

      {/* ── Outcome Selection ── */}
      <div className="mb-5 space-y-2.5">
        {outcomeButtons.map((o) => {
          const isSelected = selectedOutcome === o.key;
          const isDraw = o.key === "draw";
          return (
            <motion.button
              key={o.key}
              onClick={() => {
                setSelectedOutcome(o.key);
                reset();
              }}
              className={`relative w-full rounded-lg border py-3 px-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-emerald-500/50 bg-emerald-500/8 text-emerald-300 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]"
                  : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:border-white/[0.10] hover:text-zinc-300 hover:bg-white/[0.05]"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {/* Selected indicator glow bar */}
              {isSelected && (
                <motion.div
                  layoutId="outcome-glow"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Color dot with glow */}
                  {!isDraw && (
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px]"
                      style={{
                        backgroundColor: o.accent,
                        boxShadow: `0 0 8px ${o.accent}66`,
                      }}
                    />
                  )}
                  {isDraw && (
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-600 ring-1 ring-white/[0.06]" />
                  )}
                  <span className="text-sm font-medium">{o.label}</span>
                </div>

                {isSelected && (
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Selected
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Amount Input ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Stake Amount
          </label>
          {usdcBalance && (
            <button
              onClick={() =>
                setAmount(
                  (Number(usdcBalance.formatted) / 10 ** USDC_DECIMALS).toFixed(
                    2,
                  ),
                )
              }
              className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
            >
              Balance:{" "}
              {(Number(usdcBalance.formatted) / 10 ** USDC_DECIMALS).toFixed(2)}{" "}
              USDC
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-4 pr-20 py-3 text-base text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 font-semibold"
            disabled={loading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-800/70 px-2.5 py-1 rounded-md border border-white/[0.06]">
              USDC
            </span>
            {parseFloat(amount) > 0 && (
              <button
                onClick={() => setAmount("")}
                className="text-zinc-600 hover:text-zinc-400 transition-colors px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Receipt Preview ── */}
      <AnimatePresence>
        {amount && parseFloat(amount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="rounded-lg border border-white/[0.06] bg-black/40 backdrop-blur-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Payout</span>
                <span className="text-sm font-bold text-emerald-400">
                  +{predictedTokens} tokens
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Fee</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {feePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Reason</span>
                <span className="text-xs text-zinc-400 text-right max-w-[200px] truncate">
                  {feeReason}
                </span>
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
            className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400"
          >
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
            className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Bet placed successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Primary CTA — Iridescent Gradient ── */}
      <motion.button
        onClick={handleSwap}
        disabled={!isConnected || !isAmountValid || loading}
        className="relative w-full overflow-hidden rounded-lg py-3.5 text-sm font-bold text-white tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.35)] group"
        whileTap={!loading ? { scale: 0.97 } : undefined}
        style={{
          background:
            "linear-gradient(135deg, #059669 0%, #10b981 30%, #14b8a6 60%, #8b5cf6 100%)",
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
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
        <span className="relative z-10">
          {loading
            ? step === "approving"
              ? "Approving USDC..."
              : "Placing Bet..."
            : !isConnected
              ? "Connect Wallet"
              : !isAmountValid
                ? "Enter Stake Amount"
                : "Place Bet"}
        </span>
      </motion.button>

      {/* ── Trust Footer ── */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
          Liquidity: Active
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
          Contract: Verified
        </span>
      </div>
    </div>
  );
}
