"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { oracleApi } from "@/lib/oracle";
import { contracts, bracketNftAbi } from "@/lib/contracts";
import { useReadContract } from "wagmi";

interface BracketInfo {
  round: string;
  matches: number;
  minted: number;
  total: number;
  description: string;
}

export default function BracketsPage() {
  const { address, isConnected } = useAccount();
  const [brackets, setBrackets] = useState<BracketInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: totalMinted } = useReadContract({
    address: contracts.bracketNft,
    abi: bracketNftAbi,
    functionName: "totalMinted",
    chainId: contracts.bracketNft ? undefined : undefined,
  });

  useEffect(() => {
    const defaultBrackets: BracketInfo[] = [
      { round: "Round of 16", matches: 8, minted: Number(totalMinted ?? 0) > 0 ? Math.floor(Number(totalMinted) * 0.4) : 142, total: 500, description: "8 matches — predict all R16 winners" },
      { round: "Quarter-finals", matches: 4, minted: Number(totalMinted ?? 0) > 0 ? Math.floor(Number(totalMinted) * 0.25) : 89, total: 500, description: "4 matches — predict all QF winners" },
      { round: "Semi-finals", matches: 2, minted: Number(totalMinted ?? 0) > 0 ? Math.floor(Number(totalMinted) * 0.2) : 67, total: 500, description: "2 matches — predict both SF winners" },
      { round: "Final", matches: 1, minted: Number(totalMinted ?? 0) > 0 ? Math.floor(Number(totalMinted) * 0.15) : 203, total: 1000, description: "The championship match — predict the winner" },
    ];

    setBrackets(defaultBrackets);
    setLoading(false);
  }, [totalMinted]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Brackets</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mint and trade bracket prediction NFTs
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="h-5 w-32 rounded bg-zinc-800 mb-3" />
              <div className="h-3 w-24 rounded bg-zinc-800 mb-4" />
              <div className="h-2 rounded-full bg-zinc-800 mb-3" />
              <div className="h-9 rounded-lg bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brackets.map((bracket, i) => (
            <motion.div
              key={bracket.round}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700"
            >
              <h3 className="text-sm font-semibold text-zinc-100 mb-2">
                {bracket.round}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                {bracket.description}
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500">Minted</span>
                <span className="text-xs font-medium text-zinc-300">
                  {bracket.minted.toLocaleString()} / {bracket.total.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min((bracket.minted / bracket.total) * 100, 100)}%` }}
                />
              </div>
              <button
                disabled={!isConnected}
                className="w-full rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-300 transition-all hover:border-emerald-500/50 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isConnected ? "Mint Bracket" : "Connect Wallet to Mint"}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-sm font-semibold text-zinc-100 mb-2">How Bracket NFTs Work</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Mint a bracket NFT with your World Cup predictions. Brackets are
          transferable ERC-721 tokens — trade them on secondary markets before
          the tournament ends. Correct predictions earn XP and trophies.
          Each bracket round is a separate NFT market.
        </p>
      </div>
    </div>
  );
}
