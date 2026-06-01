"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { contracts, erc20Abi, poolManagerAbi, outcomeTokenAbi, USDC_DECIMALS, defaultChain, FEE_TIERS, formatFeePct } from "@/lib/contracts";

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

      // Use the dynamic fee from props or oracle state
      const fee = params.currentFee ?? FEE_TIERS.NORMAL;
      // Use factory address as outcome token reference — MockPoolManager records the swap
      const outcomeTokenAddr = contracts.outcomeFactory;

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
