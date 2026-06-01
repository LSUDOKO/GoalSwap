"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { oracleApi } from "@/lib/oracle";
import { contracts, bracketNftAbi, defaultChain } from "@/lib/contracts";
import {
  Trophy,
  Users,
  Sparkles,
  Shield,
  TrendingUp,
  Wallet,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface BracketRound {
  round: string;
  matches: number;
  description: string;
  icon: string;
  reward: string;
}

const BRACKET_ROUNDS: BracketRound[] = [
  {
    round: "Round of 16",
    matches: 8,
    description:
      "Predict all 8 Round of 16 winners correctly. The foundation of your bracket run.",
    icon: "R16",
    reward: "100 XP + Bronze Trophy",
  },
  {
    round: "Quarter-finals",
    matches: 4,
    description:
      "4 crucial matches — predict every QF winner to advance. Where brackets start to separate.",
    icon: "QF",
    reward: "250 XP + Silver Trophy",
  },
  {
    round: "Semi-finals",
    matches: 2,
    description:
      "The final four. Predict both semi-final winners correctly to earn elite status.",
    icon: "SF",
    reward: "500 XP + Gold Trophy",
  },
  {
    round: "Final",
    matches: 1,
    description:
      "The championship match — predict the World Cup winner. The ultimate test of foresight.",
    icon: "FIN",
    reward: "1000 XP + Diamond Trophy",
  },
];

/** Generate dummy predictedPath for demo — in production, user selects winners */
function generatePredictedPath(matches: number): `0x${string}`[] {
  const path: `0x${string}`[] = [];
  for (let i = 0; i < matches; i++) {
    // Random home/away selection as bytes32
    const winner = Math.random() > 0.5 ? "01" : "02";
    path.push(
      `0x${Array.from({ length: 31 }, () => "0").join("")}${winner}` as `0x${string}`
    );
  }
  return path;
}

export default function BracketsPage() {
  const { address, isConnected } = useAccount();
  const [totalMinted, setTotalMinted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mintingRound, setMintingRound] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Read total minted from contract
  const { data: onChainMinted } = useReadContract({
    address: contracts.bracketNft,
    abi: bracketNftAbi,
    functionName: "totalMinted",
  });

  useEffect(() => {
    if (onChainMinted !== undefined) {
      setTotalMinted(Number(onChainMinted));
    } else {
      // Fallback to estimated number
      setTotalMinted(501);
    }
    setLoading(false);
  }, [onChainMinted]);

  const handleMint = useCallback(
    async (round: BracketRound) => {
      if (!isConnected) return;

      setMintingRound(round.round);
      setMintSuccess(null);

      try {
        const predictedPath = generatePredictedPath(round.matches);

        const txHash = await writeContractAsync({
          address: contracts.bracketNft,
          abi: bracketNftAbi,
          functionName: "mintBracket",
          args: [predictedPath],
          chainId: defaultChain.id,
        });

        setMintSuccess(round.round);
        setTotalMinted((prev) => prev + 1);

        // Notify oracle
        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "https://goalswap.onrender.com";
          await fetch(`${API_URL}/api/bracket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: address,
              round: round.round,
              txHash,
              matchCount: round.matches,
            }),
          });
        } catch {
          // Non-critical
        }
      } catch (err) {
        console.error("Mint failed:", err);
      } finally {
        setMintingRound(null);
      }
    },
    [isConnected, writeContractAsync, address]
  );

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
            <Trophy className="h-5 w-5 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
            Brackets
          </h1>
        </div>
        <p className="text-sm text-zinc-500 ml-12">
          Mint and trade bracket prediction NFTs — predict the World Cup path
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-3 gap-3"
      >
        {[
          { label: "Total Minted", value: String(totalMinted), icon: Users },
          {
            label: "Your Brackets",
            value: isConnected ? "0" : "—",
            icon: Shield,
          },
          { label: "Rewards Pool", value: "1,850 XP", icon: TrendingUp },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center"
            >
              <Icon className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-sm font-bold text-zinc-100 tabular-nums">
                {stat.value}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Bracket cards */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 rounded bg-zinc-800" />
                  <div className="h-3 w-24 rounded bg-zinc-800" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-zinc-800 mb-3" />
              <div className="h-10 rounded-lg bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {BRACKET_ROUNDS.map((bracket, i) => {
              const isMinting = mintingRound === bracket.round;
              const justMinted = mintSuccess === bracket.round;
              const progress = Math.min(
                ((totalMinted + i * 50) / 1000) * 100,
                99
              );

              return (
                <motion.div
                  key={bracket.round}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 hover:shadow-[0_0_24px_-8px_rgba(52,211,153,0.06)]"
                >
                  {/* Background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full" />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-[10px] font-bold tracking-wider text-emerald-400">
                        {bracket.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {bracket.round}
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                          {bracket.matches} match
                          {bracket.matches !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] font-medium text-emerald-400/60">
                        {bracket.reward.split(" ").slice(-2).join(" ")}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                      {bracket.description}
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-zinc-600">
                          Minted
                        </span>
                        <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
                          {Math.round(progress)} / 1,000
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{
                            duration: 1,
                            ease: "easeOut",
                            delay: i * 0.1 + 0.3,
                          }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                        />
                      </div>
                    </div>

                    {/* Reward info */}
                    <div className="mb-4 rounded-lg bg-zinc-800/30 p-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">
                          Reward on correct prediction
                        </span>
                        <span className="text-emerald-400 font-medium">
                          {bracket.reward}
                        </span>
                      </div>
                    </div>

                    {/* Mint / Success / Connect button */}
                    {isConnected ? (
                      justMinted ? (
                        <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Bracket Minted Successfully!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMint(bracket)}
                          disabled={isMinting}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2.5 text-xs font-medium text-zinc-300 transition-all hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isMinting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Minting on X Layer...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Mint Bracket NFT
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
                        <Wallet className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500">
                          Connect wallet to mint
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            How Bracket NFTs Work
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-xs text-zinc-500 leading-relaxed">
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-semibold block mb-1">
              1. Mint & Predict
            </span>
            Mint a bracket NFT with your World Cup predictions. Each round is a
            separate NFT market — mint the rounds you&apos;re confident in.
          </div>
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-semibold block mb-1">
              2. Trade on Secondary
            </span>
            Brackets are transferable ERC-721 tokens. Trade them on secondary
            markets before the tournament ends — early predictions gain value.
          </div>
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-semibold block mb-1">
              3. Earn Rewards
            </span>
            Correct predictions earn XP and soulbound trophies. The more rounds
            you predict correctly, the higher your leaderboard rank.
          </div>
        </div>
      </motion.div>

      {/* Contract info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500/60" />
          <span>
            Contract verified on{" "}
            <a
              href={`https://www.oklink.com/xlayer-test/address/${contracts.bracketNft}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              X Layer Testnet
            </a>
          </span>
        </div>
        <span className="text-[10px] text-zinc-700 font-mono">
          {contracts.bracketNft.slice(0, 10)}...{contracts.bracketNft.slice(-6)}
        </span>
      </motion.div>
    </div>
  );
}
