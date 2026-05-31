"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { oracleApi, type FanTokenInfo, type FanTokenTradeResult } from "@/lib/oracle";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Circle,
  Activity,
  Zap,
  BarChart3,
  ArrowLeftRight,
  ChevronDown,
  Wallet,
  Sparkles,
  Coins,
} from "lucide-react";

export default function TokensPage() {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<FanTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<FanTokenInfo | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeResult, setTradeResult] = useState<FanTokenTradeResult | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);

  const loadTokens = useCallback(async () => {
    const all = await oracleApi.getTokens();
    if (all.length > 0) setTokens(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTokens();
    const interval = setInterval(loadTokens, 15000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  const handleTrade = async (action: "buy" | "sell") => {
    if (!selectedToken || !tradeAmount) return;
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setTradeLoading(true);
    setTradeResult(null);
    const result = await oracleApi.tradeToken(selectedToken.symbol, action, amount, address);
    if (result) {
      setTradeResult(result);
      setSelectedToken((prev) =>
        prev ? { ...prev, supply: result.newSupply, price: result.price, totalVolume: result.totalVolume } : prev,
      );
    }
    setTradeLoading(false);
  };

  const formatPrice = (p: number) => {
    if (p < 0.01) return `$${p.toFixed(5)}`;
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(2)}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50"
          >
            <Zap className="h-5 w-5 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Fan Tokens</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-12">
          Team bonding curve tokens — price grows with every buy, trade against live match data
        </p>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                  <div className="h-3 w-16 rounded bg-zinc-800" />
                </div>
              </div>
              <div className="h-5 w-20 rounded bg-zinc-800 mb-2" />
              <div className="h-2 w-full rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <BarChart3 className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-base font-medium text-zinc-400">No tokens available</h3>
          <p className="mt-1 text-sm text-zinc-600">Tokens will appear once match data is loaded.</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {tokens.map((token, i) => (
              <motion.button
                key={`${token.symbol}-${token.matchId}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { setSelectedToken(token); setTradeAmount(""); setTradeResult(null); }}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/70 hover:shadow-[0_0_24px_-8px_rgba(52,211,153,0.06)]"
              >
                {/* Status indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    token.matchStatus === "LIV" ? "bg-emerald-400 animate-ping" :
                    token.matchStatus === "FT" ? "bg-zinc-500" : "bg-zinc-600"
                  }`} />
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {token.matchStatus === "LIV" ? "Live" :
                     token.matchStatus === "FT" ? "FT" : "Upcoming"}
                  </span>
                </div>

                {/* Team info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{token.teamName}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {token.symbol} · {token.homeScore}-{token.awayScore}
                    </div>
                  </div>
                </div>

                {/* Price + Change */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold text-zinc-100 tabular-nums">{formatPrice(token.price)}</div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    token.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {token.priceChange24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {(token.priceChange24h * 100).toFixed(2)}%
                  </div>
                </div>

                {/* Bonding curve progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
                    <span>Bonding Curve</span>
                    <span>{(token.bondingCurveProgress / 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(token.bondingCurveProgress / 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {token.holderCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {token.totalVolume.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Circle className="h-3 w-3" />
                    {token.supply.toLocaleString()} / {token.maxSupply.toLocaleString()}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Connect to Trade Banner ── */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center"
        >
          <Wallet className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Connect Your Wallet</h3>
          <p className="text-xs text-zinc-500 mb-4 max-w-md mx-auto">
            You need to connect your wallet to buy, sell, and trade fan tokens.
            Trades interact with the GoalSwap bonding curve on X Layer.
          </p>
          <div className="inline-flex">
            <ConnectButton label="Connect Wallet" accountStatus="avatar" showBalance={false} chainStatus="icon" />
          </div>
        </motion.div>
      )}

      {/* ── Token Detail / Trade Panel ── */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6"
          >
            {/* Token header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20 text-sm font-bold text-emerald-400">
                  {selectedToken.symbol.slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">{selectedToken.teamName}</h2>
                  <div className="text-xs text-zinc-500">
                    {selectedToken.symbol} ·{" "}
                    {selectedToken.matchStatus === "LIV" ? "Live" :
                     selectedToken.matchStatus === "FT" ? "Full Time" : "Upcoming"} ·{" "}
                    {selectedToken.homeScore}-{selectedToken.awayScore}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedToken(null); setTradeResult(null); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Price", value: formatPrice(selectedToken.price), color: "text-zinc-100" },
                {
                  label: "24h Change",
                  value: (
                    <span className={`flex items-center gap-1 ${selectedToken.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedToken.priceChange24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {(selectedToken.priceChange24h * 100).toFixed(2)}%
                    </span>
                  ),
                  color: selectedToken.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400",
                },
                { label: "Supply", value: selectedToken.supply.toLocaleString(), color: "text-zinc-100" },
                { label: "Volume", value: `$${selectedToken.totalVolume.toLocaleString()}`, color: "text-zinc-100" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Bonding curve progress detail */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-zinc-400">Bonding Curve Progress</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {(selectedToken.bondingCurveProgress / 100).toFixed(1)}% ·{" "}
                  {selectedToken.fundingGoalReached ? "Funding goal reached" : "Pre-funding"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(selectedToken.bondingCurveProgress / 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300"
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                <span>0</span>
                <span>{(selectedToken.maxSupply / 2).toLocaleString()} (Funding goal)</span>
                <span>{selectedToken.maxSupply.toLocaleString()} (Max)</span>
              </div>
            </div>

            {/* Trade form */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Trade</span>
              </div>

              {!isConnected ? (
                <div className="flex flex-col items-center gap-3 py-3">
                  <p className="text-xs text-zinc-500">Connect your wallet to trade tokens</p>
                  <ConnectButton label="Connect Wallet" accountStatus="avatar" showBalance={false} chainStatus="icon" />
                </div>
              ) : (
                <>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 block">
                        Amount (tokens)
                      </label>
                      <input
                        type="number"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        placeholder="0"
                        min="1"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleTrade("buy")}
                      disabled={tradeLoading || !tradeAmount}
                      className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {tradeLoading ? "Processing..." : "Buy"}
                    </button>
                    <button
                      onClick={() => handleTrade("sell")}
                      disabled={tradeLoading || !tradeAmount}
                      className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {tradeLoading ? "Processing..." : "Sell"}
                    </button>
                  </div>

                  <AnimatePresence>
                    {tradeResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 overflow-hidden"
                      >
                        <p className="text-xs text-emerald-400 font-medium mb-1">
                          {tradeResult.action === "buy" ? "Purchased" : "Sold"} {tradeResult.amountOut.toLocaleString()} tokens
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {tradeResult.action === "buy"
                            ? `Cost: $${tradeResult.amountIn.toFixed(2)}`
                            : `Received: $${tradeResult.amountOut.toFixed(2)}`}
                          {" · "}New price: {formatPrice(tradeResult.price)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">About Bonding Curve Tokens</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-xs text-zinc-500 leading-relaxed">
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-medium block mb-1">Automatic Pricing</span>
            Token price increases as more tokens are minted. Buy early to capture lower prices before the curve rises.
          </div>
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-medium block mb-1">Live Match Sync</span>
            Token metrics update with every goal and match event. Winning teams drive positive price momentum.
          </div>
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-medium block mb-1">V4 Pool Creation</span>
            When supply crosses 50% of max, a Uniswap V4 pool is created — unlocking automated market making.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
