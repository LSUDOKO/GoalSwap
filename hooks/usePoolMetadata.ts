"use client";

import { useReadContract } from "wagmi";
import { contracts, hookAbi, xLayer } from "@/lib/contracts";

function matchIdToBytes32(matchId: string): `0x${string}` {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(matchId);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  return `0x${Array.from(padded)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function useMatchOnChain(matchId: string) {
  const matchIdBytes = matchIdToBytes32(matchId);

  const { data: matchState, isError, isLoading } = useReadContract({
    address: contracts.hook,
    abi: hookAbi,
    functionName: "matchStates",
    args: [matchIdBytes],
    chainId: xLayer.id,
  });

  return {
    matchState,
    isError,
    isLoading,
  };
}

export function useOracleAddress() {
  return useReadContract({
    address: contracts.hook,
    abi: hookAbi,
    functionName: "oracle",
    chainId: xLayer.id,
  });
}

export function useIsPaused() {
  return useReadContract({
    address: contracts.hook,
    abi: hookAbi,
    functionName: "paused",
    chainId: xLayer.id,
  });
}

type PoolKeyInput = {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
};

export function useGetFeeTier(poolKey: PoolKeyInput) {
  return useReadContract({
    address: contracts.hook,
    abi: hookAbi,
    functionName: "getCurrentFee",
    args: [poolKey],
    chainId: xLayer.id,
  });
}
