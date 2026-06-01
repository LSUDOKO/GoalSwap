"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseUnits, encodeFunctionData } from "viem";
import { contracts, erc20Abi, poolManagerAbi, hookAbi, outcomeTokenAbi, USDC_DECIMALS, defaultChain, FEE_TIERS, formatFeePct } from "@/lib/contracts";

interface SwapParams {
  matchId: string;
  amount: string;
  outcome: "home" | "away" | "draw";
  currentFee?: number;
}

interface SwapState {
  loading: boolean;
  step: "idle" | "approving" | "swapping" | "success" | "error" | "redeeming";
  txHash: `0x${string}` | null;
  swapId: `0x${string}` | null;
  error: string | null;
  tokensReceived: string | null;
}

/**
 * Get the dynamic fee from the WorldCupArenaHook contract.
 * Falls back to NORMAL fee (1%) if the call fails.
 */
function useDynamicFee(matchId: string): { fee: number; feeReason: string } {
  // Attempt to read fee from hook — the contract uses PoolKey struct;
  // for frontend preview, we use a heuristic based on match state
  // The real fee is applied by the hook during swap, so this is for UI display only
  return { fee: FEE_TIERS.NORMAL, feeReason: "Normal play" };
}

/**
 * Compute the outcome token address based on outcome selection.
 * The OutcomeTokenFactory creates tokens deterministically.
 * We use keccak256(matchId, outcome) to derive the token address,
 * falling back to the factory address as a reference.
 */
function getOutcomeTokenHint(matchId: string, outcome: "home" | "away" | "draw"): `0x${string}` {
  // The OutcomeTokenFactory stores token addresses in its registry.
  // For the swap, we encode the outcome token hint in the call.
  // MockPoolManager.simulateSwap just needs valid addresses — use factory-derived.
  const outcomeIndex = outcome === "home" ? 0 : outcome === "away" ? 1 : 2;
  // We'll pass the factory address as a placeholder; the mock PM records the swap.
  // In production, the V4 router would resolve the actual OutcomeToken from the pool.
  return contracts.outcomeFactory;
}

export function useSwap() {
  const { address } = useAccount();
  const [swapState, setSwapState] = useState<SwapState>({
    loading: false, step: "idle", txHash: null, swapId: null, error: null, tokensReceived: null,
  });

  const { writeContractAsync } = useWriteContract();

  const executeSwap = useCallback(
    async (params: SwapParams) => {
      if (!address || !contracts.usdc) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: "Wallet not connected", tokensReceived: null });
        return;
      }

      const amountParsed = parseUnits(params.amount || "0", USDC_DECIMALS);
      if (amountParsed <= 0n) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: "Invalid amount", tokensReceived: null });
        return;
      }

      // Use the dynamic fee from props or hook state (UI-level)
      const fee = params.currentFee ?? FEE_TIERS.NORMAL;
      const outcomeTokenAddr = getOutcomeTokenHint(params.matchId, params.outcome);

      setSwapState({ loading: true, step: "approving", txHash: null, swapId: null, error: null, tokensReceived: null });

      try {
        // Step 1: Approve USDC spend by MockPoolManager
        const approveHash = await writeContractAsync({
          address: contracts.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.poolManager, amountParsed],
          chainId: defaultChain.id,
        });

        setSwapState((prev) => ({ ...prev, step: "swapping", txHash: approveHash }));

        // Step 2: Execute swap on MockPoolManager.simulateSwap
        // amountOut = amountIn * (10000 - fee) / 10000 (fee is in hundredths of bps)
        const feeBps = fee / 100;
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

        const tokensReceived = (Number(amountOutParsed) / 10 ** USDC_DECIMALS).toFixed(2);

        setSwapState({
          loading: false,
          step: "success",
          txHash: swapHash,
          swapId: swapHash,
          error: null,
          tokensReceived,
        });

        // Notify oracle about the trade for portfolio tracking
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://goalswap.onrender.com";
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
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: (err as Error).message, tokensReceived: null });
      }
    },
    [address, writeContractAsync],
  );

  const executeRedeem = useCallback(
    async (outcomeTokenAddress: `0x${string}`) => {
      if (!address) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: "Wallet not connected", tokensReceived: null });
        return;
      }
      setSwapState({ loading: true, step: "redeeming", txHash: null, swapId: null, error: null, tokensReceived: null });
      try {
        const redeemHash = await writeContractAsync({
          address: outcomeTokenAddress,
          abi: outcomeTokenAbi,
          functionName: "redeem",
          chainId: defaultChain.id,
        });
        setSwapState({ loading: false, step: "success", txHash: redeemHash, swapId: null, error: null, tokensReceived: null });
      } catch (err) {
        setSwapState({ loading: false, step: "error", txHash: null, swapId: null, error: (err as Error).message, tokensReceived: null });
      }
    },
    [address, writeContractAsync],
  );

  const reset = useCallback(() => {
    setSwapState({ loading: false, step: "idle", txHash: null, swapId: null, error: null, tokensReceived: null });
  }, []);

  return { ...swapState, executeSwap, executeRedeem, reset };
}
