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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-4xl mb-4">👛</div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Connect your wallet to view your profile, portfolio, and trophies.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-lg font-bold text-emerald-400">
            {address?.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Profile</h1>
            <p className="text-xs text-zinc-500 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800" />
          <div className="h-48 rounded-xl bg-zinc-900/50 border border-zinc-800" />
        </div>
      ) : portfolio ? (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Volume", value: `$${(+portfolio.totalVolume).toLocaleString()}` },
              { label: "PnL", value: `${(+portfolio.pnl) >= 0 ? "+" : ""}${(+portfolio.pnl).toFixed(2)} USDC` },
              { label: "Trophies", value: `${portfolio.trophies} 🏆` },
              { label: "Positions", value: `${portfolio.positions.length}` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center"
              >
                <div className="text-lg font-bold text-zinc-100">{s.value}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Positions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 mb-3">Positions</h2>
            {portfolio.positions.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No open positions</p>
            ) : (
              <div className="space-y-2">
                {portfolio.positions.map((pos, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/30 p-3"
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
                      <div className="text-xs font-medium text-zinc-100">
                        ${(+pos.currentValue).toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] ${
                          (+pos.pnl) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {(+pos.pnl) >= 0 ? "+" : ""}{(+pos.pnl).toFixed(2)} USDC
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-sm font-medium text-zinc-400">No portfolio data</h3>
          <p className="text-xs text-zinc-600 mt-1">
            Start trading to see your portfolio here
          </p>
        </div>
      )}
    </div>
  );
}
