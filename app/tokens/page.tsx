"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

export default function TokensPage() {
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
    const result = await oracleApi.tradeToken(selectedToken.symbol, action, amount);
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Fan Tokens</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-11">
          Team bonding curve tokens — price grows with every buy, trade against live match data
        </p>
      </div>

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
        <div className="flex flex-col items-center justify-center py-20">
          <BarChart3 className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-sm font-medium text-zinc-400">No tokens available</h3>
          <p className="mt-2 text-xs text-zinc-600">Tokens will appear once match data is loaded.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {tokens.map((token, i) => (
              <motion.button
                key={token.symbol}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { setSelectedToken(token); setTradeAmount(""); setTradeResult(null); }}
                className="relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/70"
              >
                {/* Status indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    token.matchStatus === "LIV" ? "bg-emerald-400 animate-pulse" :
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
                  <div className="text-lg font-bold text-zinc-100">{formatPrice(token.price)}</div>
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
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
                      style={{ width: `${Math.min(token.bondingCurveProgress / 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-1 border-t border-zinc-800/50">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Price</div>
                <div className="text-base font-bold text-zinc-100">{formatPrice(selectedToken.price)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">24h Change</div>
                <div className={`text-base font-bold flex items-center gap-1 ${
                  selectedToken.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {selectedToken.priceChange24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {(selectedToken.priceChange24h * 100).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Supply</div>
                <div className="text-base font-bold text-zinc-100">{selectedToken.supply.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Volume</div>
                <div className="text-base font-bold text-zinc-100">${selectedToken.totalVolume.toLocaleString()}</div>
              </div>
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
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 transition-all duration-500"
                  style={{ width: `${Math.min(selectedToken.bondingCurveProgress / 100, 100)}%` }}
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

              {/* Trade result */}
              {tradeResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info card */}
      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">About Bonding Curve Tokens</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-xs text-zinc-500 leading-relaxed">
          <div>
            <span className="text-emerald-400 font-medium block mb-1">Automatic Pricing</span>
            Token price increases as more tokens are minted. Buy early to capture lower prices before the curve rises.
          </div>
          <div>
            <span className="text-emerald-400 font-medium block mb-1">Live Match Sync</span>
            Token metrics update with every goal and match event. Winning teams drive positive price momentum.
          </div>
          <div>
            <span className="text-emerald-400 font-medium block mb-1">V4 Pool Creation</span>
            When supply crosses 50% of max, a Uniswap V4 pool is created — unlocking automated market making.
          </div>
        </div>
      </div>
    </div>
  );
}
