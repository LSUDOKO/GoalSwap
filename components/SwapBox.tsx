/**
 * GoalSwap Arena — SwapBox
 *
 * Core trading interface: outcome selection, USDC input,
 * fee display, and swap execution.
 */

"use client";

import { useState, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { contracts, xLayerTestnet, USDC_DECIMALS } from "@/lib/contracts";
import { useSwap } from "@/hooks/useSwap";

interface SwapBoxProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  currentFee?: number;
  feeReason?: string;
}

type Outcome = "home" | "away" | "draw";

const outcomes: { key: Outcome; label: (h: string, a: string) => string }[] = [
  { key: "home", label: (h) => `${h} Win` },
  { key: "away", label: (_, a) => `${a} Win` },
  { key: "draw", label: () => "Draw" },
];

export function SwapBox({
  matchId,
  homeTeam,
  awayTeam,
  currentFee = 100,
  feeReason = "Normal play",
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
  const isAmountValid =
    amount && parseFloat(amount) > 0;

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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4">Swap</h3>

      {/* Outcome Selection */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {outcomes.map((o) => {
          const isSelected = selectedOutcome === o.key;
          return (
            <motion.button
              key={o.key}
              onClick={() => {
                setSelectedOutcome(o.key);
                reset();
              }}
              className={`relative rounded-lg border py-2.5 text-xs font-medium transition-all ${
                isSelected
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {o.label(homeTeam, awayTeam)}
            </motion.button>
          );
        })}
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
          <span>Amount (USDC)</span>
          {usdcBalance && (
            <span>
              Balance:{" "}
              {(Number(usdcBalance.formatted) / 10 ** USDC_DECIMALS).toFixed(2)}
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            disabled={loading}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
            USDC
          </span>
        </div>
      </div>

      {/* Swap Info */}
      <AnimatePresence>
        {amount && parseFloat(amount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mb-4 overflow-hidden"
          >
            <div className="rounded-lg bg-zinc-800/30 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">You receive</span>
                <span className="text-zinc-100 font-medium">
                  {predictedTokens} tokens
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Fee</span>
                <span className="text-yellow-400 font-medium">{feePercent}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Fee reason</span>
                <span className="text-zinc-400">{feeReason}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Est. probability</span>
                <span className="text-zinc-400">
                  {selectedOutcome === "home"
                    ? "—"
                    : selectedOutcome === "away"
                      ? "—"
                      : "—"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400"
          >
            ✅ Swap submitted!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <motion.button
        onClick={handleSwap}
        disabled={!isConnected || !isAmountValid || loading}
        className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        whileTap={!loading ? { scale: 0.98 } : undefined}
      >
        {loading
          ? step === "approving"
            ? "Approving USDC..."
            : "Swapping..."
          : !isConnected
            ? "Connect Wallet"
            : !isAmountValid
              ? "Enter Amount"
              : "Buy Prediction"}
      </motion.button>
    </div>
  );
}
