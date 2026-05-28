"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { contracts, erc20Abi, USDC_DECIMALS, defaultChain } from "@/lib/contracts";

interface SwapParams {
  matchId: string;
  amount: string;
  outcome: "home" | "away" | "draw";
}

interface SwapState {
  loading: boolean;
  step: "idle" | "approving" | "swapping" | "success" | "error";
  txHash: `0x${string}` | null;
  error: string | null;
  orderId?: string;
}

export function useSwap() {
  const { address } = useAccount();
  const [swapState, setSwapState] = useState<SwapState>({
    loading: false, step: "idle", txHash: null, error: null,
  });

  const { writeContractAsync: approveAsync } = useWriteContract();

  const executeSwap = useCallback(
    async (params: SwapParams) => {
      if (!address || !contracts.usdc) {
        setSwapState({ loading: false, step: "error", txHash: null, error: "Wallet not connected" });
        return;
      }

      const amountParsed = parseUnits(params.amount || "0", USDC_DECIMALS);
      if (amountParsed <= 0n) {
        setSwapState({ loading: false, step: "error", txHash: null, error: "Invalid amount" });
        return;
      }

      setSwapState({ loading: true, step: "approving", txHash: null, error: null });

      try {
        const approveHash = await approveAsync({
          address: contracts.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.poolManager, amountParsed],
          chainId: defaultChain.id,
        });

        setSwapState((prev) => ({ ...prev, step: "swapping", txHash: approveHash }));

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        const resp = await fetch(`${API_URL}/api/trade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: params.matchId,
            outcome: params.outcome,
            amount: params.amount,
            user: address,
            approveTx: approveHash,
          }),
        });

        if (!resp.ok) {
          throw new Error(`Trade request failed: ${resp.statusText}`);
        }

        const result = await resp.json();

        setSwapState({
          loading: false, step: "success", txHash: result.txHash || approveHash,
          error: null, orderId: result.orderId,
        });
      } catch (err) {
        setSwapState({ loading: false, step: "error", txHash: null, error: (err as Error).message });
      }
    },
    [address, approveAsync],
  );

  const reset = useCallback(() => {
    setSwapState({ loading: false, step: "idle", txHash: null, error: null });
  }, []);

  return { ...swapState, executeSwap, reset };
}
