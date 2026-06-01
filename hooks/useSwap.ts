"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { contracts, erc20Abi, poolManagerAbi, USDC_DECIMALS, defaultChain, FEE_TIERS, formatFeePct } from "@/lib/contracts";

interface SwapParams {
  matchId: string;
  amount: string;
  outcome: "home" | "away" | "draw";
}

interface SwapState {
  loading: boolean;
  step: "idle" | "approving" | "swapping" | "success" | "error";
  txHash: `0x${string}` | null;
  swapId: `0x${string}` | null;
  error: string | null;
}

export function useSwap() {
  const { address } = useAccount();
  const [swapState, setSwapState] = useState<SwapState>({
    loading: false, step: "idle", txHash: null, swapId: null, error: null,
  });

  const { writeContractAsync } = useWriteContract();

  const executeSwap = useCallback(
    async (params: SwapParams) => {
      if (!address || !contracts.usdc) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: "Wallet not connected" });
        return;
      }

      const amountParsed = parseUnits(params.amount || "0", USDC_DECIMALS);
      if (amountParsed <= 0n) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: "Invalid amount" });
        return;
      }

      // Simulate outcome token address
      const outcomeTokenAddr = params.outcome === "home"
        ? contracts.hook
        : params.outcome === "away"
          ? contracts.trophies
          : contracts.outcomeFactory;

      // Use post-goal fee for demo (shows dynamic fee working)
      const fee = FEE_TIERS.POST_GOAL; // 3%

      setSwapState({ loading: true, step: "approving", txHash: null, swapId: null, error: null });

      try {
        // Step 1: Approve USDC spend
        const approveHash = await writeContractAsync({
          address: contracts.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.poolManager, amountParsed],
          chainId: defaultChain.id,
        });

        setSwapState((prev) => ({ ...prev, step: "swapping", txHash: approveHash }));

        // Step 2: Execute swap on MockPoolManager
        // tokenIn = USDC (6 decimals), tokenOut = outcome token (simulated)
        // amountOut = amountIn * (1 - fee) = amountIn * (10000 - fee) / 10000
        const feeBps = fee / 100; // convert hundredths of bps to bps
        const amountOutParsed = (amountParsed * BigInt(10000 - feeBps)) / BigInt(10000);

        const swapHash = await writeContractAsync({
          address: contracts.poolManager,
          abi: poolManagerAbi,
          functionName: "simulateSwap",
          args: [
            contracts.usdc,
            outcomeTokenAddr,
            amountParsed,
            amountOutParsed,
            fee,
          ],
          chainId: defaultChain.id,
        });

        setSwapState({
          loading: false,
          step: "success",
          txHash: swapHash,
          swapId: swapHash,
          error: null,
        });

        // Notify oracle about the trade for portfolio tracking
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
          await fetch(`${API_URL}/api/trade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId: params.matchId,
              outcome: params.outcome,
              amount: params.amount,
              user: address,
              approveTx: approveHash,
              swapTx: swapHash,
              fee: formatFeePct(fee),
            }),
          });
        } catch {
          // Non-critical - oracle notification is best-effort
        }
      } catch (err) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: (err as Error).message });
      }
    },
    [address, writeContractAsync],
  );

  const reset = useCallback(() => {
    setSwapState({ loading: false, step: "idle", txHash: null, swapId: null, error: null });
  }, []);

  return { ...swapState, executeSwap, reset };
}
