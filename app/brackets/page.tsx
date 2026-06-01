"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { oracleApi, type MatchSummary } from "@/lib/oracle";
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
  ChevronRight,
  ChevronLeft,
  Swords,
  Target,
  Clock,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

interface BracketRound {
  round: string;
  matches: number;
  description: string;
  icon: string;
  reward: string;
}

interface UserBracket {
  tokenId: number;
  predictedPath: string[];
  matchCount: number;
  isValidated: boolean;
  isCorrect: boolean;
  creationTime: number;
}

const BRACKET_ROUNDS: BracketRound[] = [
  {
    round: "Round of 16",
    matches: 8,
    description: "Predict all 8 Round of 16 winners correctly.",
    icon: "R16",
    reward: "100 XP + Bronze Trophy",
  },
  {
    round: "Quarter-finals",
    matches: 4,
    description: "4 crucial matches — predict every QF winner to advance.",
    icon: "QF",
    reward: "250 XP + Silver Trophy",
  },
  {
    round: "Semi-finals",
    matches: 2,
    description: "The final four. Predict both semi-final winners correctly.",
    icon: "SF",
    reward: "500 XP + Gold Trophy",
  },
  {
    round: "Final",
    matches: 1,
    description: "The championship match — predict the World Cup winner.",
    icon: "FIN",
    reward: "1000 XP + Diamond Trophy",
  },
];

// Generate deterministic bracket match labels for demo
function getRoundMatches(roundIdx: number, matches: number): string[][] {
  const labels: Record<number, string[][]> = {
    0: [
      ["France", "Germany"],
      ["Brazil", "Netherlands"],
      ["Argentina", "England"],
      ["Spain", "Portugal"],
      ["Japan", "Morocco"],
      ["USA", "Mexico"],
      ["Italy", "Belgium"],
      ["Croatia", "Uruguay"],
    ],
    1: [
      ["TBD (R16-1)", "TBD (R16-2)"],
      ["TBD (R16-3)", "TBD (R16-4)"],
      ["TBD (R16-5)", "TBD (R16-6)"],
      ["TBD (R16-7)", "TBD (R16-8)"],
    ],
    2: [
      ["TBD (QF-1)", "TBD (QF-2)"],
      ["TBD (QF-3)", "TBD (QF-4)"],
    ],
    3: [["TBD (SF-1)", "TBD (SF-2)"]],
  };
  return labels[roundIdx] ?? Array.from({ length: matches }, () => ["Team A", "Team B"]);
}

export default function BracketsPage() {
  const { address, isConnected } = useAccount();
  const [totalMinted, setTotalMinted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mintingRound, setMintingRound] = useState<number | null>(null);
  const [mintSuccess, setMintSuccess] = useState<number | null>(null);
  const [activeRound, setActiveRound] = useState(0);
  const [predictions, setPredictions] = useState<Record<number, Record<number, 0 | 1>>>({});
  const [userBrackets, setUserBrackets] = useState<UserBracket[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Read total minted from contract
  const { data: onChainMinted } = useReadContract({
    address: contracts.bracketNft,
    abi: bracketNftAbi,
    functionName: "totalMinted",
  });

  // Read user's brackets from contract
  const { data: userBracketIds, refetch: refetchUserBrackets } = useReadContract({
    address: contracts.bracketNft,
    abi: bracketNftAbi,
    functionName: "getUserBrackets",
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    if (onChainMinted !== undefined) {
      setTotalMinted(Number(onChainMinted));
    } else {
      setTotalMinted(501);
    }
    setLoading(false);
  }, [onChainMinted]);

  // Fetch bracket details when user bracket IDs change
  useEffect(() => {
    async function loadBracketDetails() {
      if (!userBracketIds || userBracketIds.length === 0) {
        setUserBrackets([]);
        return;
      }
      const details: UserBracket[] = [];
      for (const id of userBracketIds) {
        try {
          // We can't call getBracket directly from wagmi without a hook per ID,
          // so we'll show the IDs and basic info
          details.push({
            tokenId: Number(id),
            predictedPath: [],
            matchCount: 0,
            isValidated: false,
            isCorrect: false,
            creationTime: 0,
          });
        } catch {
          // skip
        }
      }
      setUserBrackets(details);
    }
    loadBracketDetails();
  }, [userBracketIds]);

  // Set a prediction for a specific match in a round
  const setPrediction = useCallback(
    (roundIdx: number, matchIdx: number, winner: 0 | 1) => {
      setPredictions((prev) => ({
        ...prev,
        [roundIdx]: { ...prev[roundIdx], [matchIdx]: winner },
      }));
    },
    []
  );

  // Build predicted path bytes32 array from selections
  const buildPredictedPath = useCallback(
    (roundIdx: number): `0x${string}`[] => {
      const round = BRACKET_ROUNDS[roundIdx];
      const roundPredictions = predictions[roundIdx] ?? {};
      const path: `0x${string}`[] = [];
      for (let i = 0; i < round.matches; i++) {
        const pick = roundPredictions[i];
        if (pick === undefined) {
          // Default to home winner if not selected
          path.push(
            `0x${"00".repeat(31)}01` as `0x${string}`
          );
        } else {
          const hex = pick === 0 ? "01" : "02";
          path.push(
            `0x${"00".repeat(31)}${hex}` as `0x${string}`
          );
        }
      }
      return path;
    },
    [predictions]
  );

  // Check if all matches in a round have been selected
  const roundComplete = useCallback(
    (roundIdx: number): boolean => {
      const round = BRACKET_ROUNDS[roundIdx];
      const roundPredictions = predictions[roundIdx] ?? {};
      return Object.keys(roundPredictions).length >= round.matches;
    },
    [predictions]
  );

  const handleMint = useCallback(
    async (roundIdx: number) => {
      if (!isConnected) return;

      setMintingRound(roundIdx);
      setMintSuccess(null);

      try {
        const predictedPath = buildPredictedPath(roundIdx);

        const txHash = await writeContractAsync({
          address: contracts.bracketNft,
          abi: bracketNftAbi,
          functionName: "mintBracket",
          args: [predictedPath],
          chainId: defaultChain.id,
        });

        setMintSuccess(roundIdx);
        setTotalMinted((prev) => prev + 1);
        refetchUserBrackets();

        // Notify oracle
        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "https://goalswap.onrender.com";
          await fetch(`${API_URL}/api/bracket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: address,
              round: BRACKET_ROUNDS[roundIdx].round,
              txHash,
              matchCount: BRACKET_ROUNDS[roundIdx].matches,
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
    [isConnected, writeContractAsync, address, buildPredictedPath, refetchUserBrackets]
  );

  const currentRound = BRACKET_ROUNDS[activeRound];
  const matches = getRoundMatches(activeRound, currentRound.matches);
  const currentPredictions = predictions[activeRound] ?? {};
  const isComplete = roundComplete(activeRound);
  const totalPredictions = Object.keys(predictions).reduce(
    (sum, key) => sum + Object.keys(predictions[Number(key)]).length,
    0
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
            World Cup Brackets
          </h1>
        </div>
        <p className="text-sm text-zinc-500 ml-12">
          Predict the World Cup path — mint bracket NFTs and earn rewards
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-4 gap-3"
      >
        {[
          { label: "Total Minted", value: String(totalMinted), icon: Users },
          {
            label: "Your Brackets",
            value: isConnected ? String(userBrackets.length) : "—",
            icon: Shield,
          },
          { label: "Your Picks", value: String(totalPredictions), icon: Target },
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

      {/* Wallet gate */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center"
        >
          <Wallet className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 mb-4">
            Connect your wallet to create bracket predictions and mint NFTs
          </p>
          <ConnectButton label="Connect Wallet" accountStatus="avatar" showBalance={false} chainStatus="icon" />
        </motion.div>
      )}

      {/* Round selector tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {BRACKET_ROUNDS.map((round, i) => {
          const picks = Object.keys(predictions[i] ?? {}).length;
          const isActive = activeRound === i;
          return (
            <button
              key={round.round}
              onClick={() => setActiveRound(i)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all shrink-0",
                isActive
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {round.icon}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold">{round.round}</div>
                <div className="text-[10px] opacity-60">
                  {picks}/{round.matches} picks
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bracket selection UI */}
      <motion.div
        key={activeRound}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        {/* Round header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {currentRound.icon} — {currentRound.round}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentRound.description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-medium">
              {Object.keys(currentPredictions).length}/{currentRound.matches} selected
            </span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
              {currentRound.reward}
            </span>
          </div>
        </div>

        {/* Match cards */}
        <div className="space-y-3">
          {matches.map((teams, matchIdx) => {
            const selected = currentPredictions[matchIdx];
            const isHome = selected === 0;
            const isAway = selected === 1;

            return (
              <motion.div
                key={matchIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: matchIdx * 0.04 }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center gap-2 mb-3 text-[10px] text-zinc-600">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono">
                    M{matchIdx + 1}
                  </span>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span>Jun {14 + Math.floor(matchIdx / 2)}, 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Home team */}
                  <button
                    onClick={() => setPrediction(activeRound, matchIdx, 0)}
                    disabled={!isConnected}
                    className={cn(
                      "flex-1 rounded-lg border p-3 text-left transition-all",
                      isHome
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/40",
                      !isConnected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                          isHome
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        )}
                      >
                        {teams[0].slice(0, 2)}
                      </div>
                      <div>
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            isHome ? "text-emerald-400" : "text-zinc-300"
                          )}
                        >
                          {teams[0]}
                        </div>
                      </div>
                      {isHome && (
                        <CheckCircle className="h-4 w-4 text-emerald-400 ml-auto" />
                      )}
                    </div>
                  </button>

                  {/* VS */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <Swords className="h-4 w-4 text-zinc-600" />
                    <span className="text-[10px] font-bold text-zinc-600">VS</span>
                  </div>

                  {/* Away team */}
                  <button
                    onClick={() => setPrediction(activeRound, matchIdx, 1)}
                    disabled={!isConnected}
                    className={cn(
                      "flex-1 rounded-lg border p-3 text-left transition-all",
                      isAway
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/40",
                      !isConnected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                          isAway
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        )}
                      >
                        {teams[1].slice(0, 2)}
                      </div>
                      <div>
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            isAway ? "text-emerald-400" : "text-zinc-300"
                          )}
                        >
                          {teams[1]}
                        </div>
                      </div>
                      {isAway && (
                        <CheckCircle className="h-4 w-4 text-emerald-400 ml-auto" />
                      )}
                    </div>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mint button */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            {mintSuccess === activeRound ? (
              <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3.5 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Bracket NFT Minted Successfully!
              </div>
            ) : (
              <button
                onClick={() => handleMint(activeRound)}
                disabled={mintingRound !== null}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
                  isComplete
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "border border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5",
                  mintingRound !== null && "opacity-50 cursor-not-allowed"
                )}
              >
                {mintingRound !== null ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Minting on X Layer...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {isComplete
                      ? `Mint ${currentRound.round} Bracket NFT`
                      : `Select all ${currentRound.matches} winners first (${Object.keys(currentPredictions).length}/${currentRound.matches})`}
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* User's bracket history */}
      {isConnected && userBrackets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 mb-4 text-sm font-semibold text-zinc-300 hover:text-emerald-400 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Your Minted Brackets ({userBrackets.length})
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                showHistory && "rotate-90"
              )}
            />
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  {userBrackets.map((bracket) => (
                    <div
                      key={bracket.tokenId}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-emerald-400">
                          #{bracket.tokenId}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">
                            Bracket #{bracket.tokenId}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {bracket.isValidated
                              ? bracket.isCorrect
                                ? "✅ Correct predictions"
                                : "❌ Incorrect predictions"
                              : "⏳ Pending validation"}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://www.oklink.com/xlayer-test/address/${contracts.bracketNft}#tokentxns`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* How Bracket NFTs Work */}
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
              1. Pick Winners
            </span>
            Select your predicted winner for each match in each round. Every
            round is a separate NFT — mint the rounds you&apos;re confident in.
          </div>
          <div className="rounded-lg bg-zinc-800/30 p-3">
            <span className="text-emerald-400 font-semibold block mb-1">
              2. Mint & Trade
            </span>
            Mint your bracket as an ERC-721 token on X Layer. Brackets are
            transferable — trade them on secondary markets before the tournament.
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
