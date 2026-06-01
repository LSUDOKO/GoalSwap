/**
 * GoalSwap Arena — /profile
 *
 * User profile: wallet link, on-chain USDC balance, portfolio summary,
 * trophy cabinet, bracket NFTs, and trade history.
 */

"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { oracleApi, type UserPortfolio } from "@/lib/oracle";
import {
  contracts,
  erc20Abi,
  trophiesAbi,
  bracketNftAbi,
  poolManagerAbi,
  USDC_DECIMALS,
  defaultChain,
} from "@/lib/contracts";
import Link from "next/link";
import {
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart3,
  Sparkles,
  ArrowRight,
  Shield,
  Target,
  ExternalLink,
  Flame,
  Coins,
  Receipt,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

const TIER_NAMES = ["Bronze", "Silver", "Gold", "Diamond", "Legend"];
const TIER_ICONS = ["🥉", "🥈", "🥇", "💎", "👑"];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [loading, setLoading] = useState(false);

  // ── On-chain reads ──

  // USDC balance
  const { data: usdcBalanceRaw, refetch: refetchBalance } = useReadContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: defaultChain.id,
  });

  // Trophy tiers
  const { data: trophyTier0 } = useReadContract({
    address: contracts.trophies,
    abi: trophiesAbi,
    functionName: "hasTier",
    args: address ? [address, 0n] : undefined,
    chainId: defaultChain.id,
  });
  const { data: trophyTier1 } = useReadContract({
    address: contracts.trophies,
    abi: trophiesAbi,
    functionName: "hasTier",
    args: address ? [address, 1n] : undefined,
    chainId: defaultChain.id,
  });
  const { data: trophyTier2 } = useReadContract({
    address: contracts.trophies,
    abi: trophiesAbi,
    functionName: "hasTier",
    args: address ? [address, 2n] : undefined,
    chainId: defaultChain.id,
  });
  const { data: trophyTier3 } = useReadContract({
    address: contracts.trophies,
    abi: trophiesAbi,
    functionName: "hasTier",
    args: address ? [address, 3n] : undefined,
    chainId: defaultChain.id,
  });
  const { data: trophyTier4 } = useReadContract({
    address: contracts.trophies,
    abi: trophiesAbi,
    functionName: "hasTier",
    args: address ? [address, 4n] : undefined,
    chainId: defaultChain.id,
  });

  const trophyTiers = [trophyTier0, trophyTier1, trophyTier2, trophyTier3, trophyTier4];
  const trophyCount = trophyTiers.filter(Boolean).length;

  // Bracket NFTs
  const { data: bracketIds } = useReadContract({
    address: contracts.bracketNft,
    abi: bracketNftAbi,
    functionName: "getUserBrackets",
    args: address ? [address] : undefined,
    chainId: defaultChain.id,
  });

  // Trade count from pool manager
  const { data: swapCount } = useReadContract({
    address: contracts.poolManager,
    abi: poolManagerAbi,
    functionName: "getUserSwapCount",
    args: address ? [address] : undefined,
    chainId: defaultChain.id,
  });

  const usdcBalance = usdcBalanceRaw
    ? Number(formatUnits(usdcBalanceRaw, USDC_DECIMALS))
    : 0;

  // ── Fetch portfolio from oracle ──
  useEffect(() => {
    if (!address) return;
    setLoading(true);
    oracleApi.getUserPortfolio(address).then((p) => {
      setPortfolio(p);
      setLoading(false);
    });
  }, [address]);

  // Auto-refresh balance every 15s
  useEffect(() => {
    const interval = setInterval(() => refetchBalance(), 15000);
    return () => clearInterval(interval);
  }, [refetchBalance]);

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl px-4 py-24 text-center"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 mx-auto">
          <User className="h-10 w-10 text-zinc-600" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
          Connect your wallet to view your profile, portfolio, and trophies.
          Your entire GoalSwap history lives on-chain.
        </p>
        <div className="inline-flex">
          <ConnectButton label="Connect Wallet" accountStatus="avatar" showBalance={false} chainStatus="icon" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />

          <div className="relative flex items-center gap-4 sm:gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-xl font-bold text-emerald-400"
            >
              {address?.slice(2, 4).toUpperCase()}
            </motion.div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Profile</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <a
                  href={`https://www.oklink.com/xlayer-test/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors flex items-center gap-0.5"
                >
                  Explorer <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
            <a
              href={`https://www.oklink.com/xlayer-test/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[10px] text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
            >
              View on Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-zinc-900/50 border border-zinc-800" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* On-chain stats row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-5"
          >
            {/* USDC Balance */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center col-span-2 sm:col-span-1">
              <Coins className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-lg font-bold text-zinc-100 tabular-nums">
                ${usdcBalance.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                USDC Balance
              </div>
            </div>

            {/* Volume */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <BarChart3 className="h-4 w-4 text-zinc-500 mx-auto mb-1.5" />
              <div className="text-lg font-bold text-zinc-100 tabular-nums">
                ${portfolio ? (+portfolio.totalVolume).toLocaleString() : "0"}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                Volume
              </div>
            </div>

            {/* PnL */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <TrendingUp className="h-4 w-4 text-zinc-500 mx-auto mb-1.5" />
              <div className={cn("text-lg font-bold tabular-nums", portfolio && +portfolio.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                {portfolio ? `${+portfolio.pnl >= 0 ? "+" : ""}${(+portfolio.pnl).toFixed(2)}` : "0.00"}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                PnL (USDC)
              </div>
            </div>

            {/* Swaps */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <Receipt className="h-4 w-4 text-zinc-500 mx-auto mb-1.5" />
              <div className="text-lg font-bold text-zinc-100 tabular-nums">
                {swapCount !== undefined ? Number(swapCount) : 0}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                Swaps
              </div>
            </div>

            {/* Bracket NFTs */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <Trophy className="h-4 w-4 text-zinc-500 mx-auto mb-1.5" />
              <div className="text-lg font-bold text-zinc-100 tabular-nums">
                {bracketIds !== undefined ? bracketIds.length : 0}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                Brackets
              </div>
            </div>
          </motion.div>

          {/* Trophy Cabinet */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Trophy Cabinet
                </h2>
              </div>
              <span className="text-[10px] text-zinc-500">
                {trophyCount}/5 tiers unlocked
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {TIER_NAMES.map((tier, i) => {
                const unlocked = !!trophyTiers[i];
                return (
                  <div
                    key={tier}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl p-3 transition-all",
                      unlocked
                        ? "bg-amber-500/5 border border-amber-500/20"
                        : "bg-zinc-800/30 border border-zinc-800 opacity-40"
                    )}
                  >
                    <span className="text-2xl">{TIER_ICONS[i]}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        unlocked ? "text-amber-400" : "text-zinc-600"
                      )}
                    >
                      {tier}
                    </span>
                    {unlocked && (
                      <span className="text-[9px] text-emerald-400/60 font-medium">
                        ✓ Unlocked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Oracle Portfolio (positions) */}
          {portfolio && portfolio.positions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-100">Positions</h2>
                <Link
                  href="/matches"
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  View matches
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {portfolio.positions.map((pos, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/30 p-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-100">
                        {pos.matchId.slice(0, 16)}...
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{pos.market}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-zinc-100 tabular-nums">
                        ${(+pos.currentValue).toFixed(2)}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] tabular-nums",
                          +pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {+pos.pnl >= 0 ? "+" : ""}
                        {(+pos.pnl).toFixed(2)} USDC
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {!portfolio && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <BarChart3 className="h-8 w-8 text-zinc-700 mb-2" />
              <h3 className="text-sm font-medium text-zinc-400">No portfolio data yet</h3>
              <p className="text-xs text-zinc-600 mt-1">
                Start trading to see your positions here
              </p>
              <Link
                href="/matches"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Browse Matches
              </Link>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
