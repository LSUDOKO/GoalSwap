/**
 * GoalSwap Arena — /profile
 *
 * User profile: wallet link, portfolio summary, trophy cabinet, and stats.
 */

"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { oracleApi, type UserPortfolio } from "@/lib/oracle";
import { useWalletStore } from "@/stores/walletStore";
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
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    oracleApi.getUserPortfolio(address).then((p) => {
      setPortfolio(p);
      setLoading(false);
    });
  }, [address]);

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
            <div>
              <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Profile</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                {portfolio && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400/60">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
            </div>
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
      ) : portfolio ? (
        <div className="space-y-6">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { label: "Total Volume", value: `$${(+portfolio.totalVolume).toLocaleString()}`, icon: BarChart3 },
              { label: "PnL", value: `${(+portfolio.pnl) >= 0 ? "+" : ""}${(+portfolio.pnl).toFixed(2)}`, sub: "USDC", icon: TrendingUp },
              { label: "Trophies", value: `${portfolio.trophies}`, icon: Trophy },
              { label: "Positions", value: `${portfolio.positions.length}`, icon: Target },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center"
                >
                  <Icon className="h-4 w-4 text-zinc-500 mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-zinc-100 tabular-nums">
                    {s.value}
                    {s.sub && <span className="text-xs text-zinc-500 font-normal ml-1">{s.sub}</span>}
                  </div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Positions */}
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
            {portfolio.positions.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Target className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">No open positions</p>
                <Link
                  href="/matches"
                  className="mt-3 inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-emerald-400 transition-colors"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Browse matches to start trading
                </Link>
              </div>
            ) : (
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
                      <Link
                        href={`/match/${pos.matchId}`}
                        className="text-xs font-medium text-zinc-100 hover:text-emerald-400 transition-colors"
                      >
                        {pos.matchId}
                      </Link>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{pos.market}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-zinc-100 tabular-nums">
                        ${(+pos.currentValue).toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] tabular-nums ${
                          (+pos.pnl) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {(+pos.pnl) >= 0 ? "+" : ""}{(+pos.pnl).toFixed(2)} USDC
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-20 text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <BarChart3 className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400">No portfolio data</h3>
          <p className="text-xs text-zinc-600 mt-1">
            Start trading to see your portfolio here
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
  );
}
