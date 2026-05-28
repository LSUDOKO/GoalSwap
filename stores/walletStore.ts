/**
 * GoalSwap Arena — Wallet Store (Zustand)
 *
 * Manages wallet connection state, USDC balance, and chain info.
 */

import { create } from "zustand";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  usdcBalance: string;
  isCorrectChain: boolean;

  setConnected: (address: string, chainId: number) => void;
  setDisconnected: () => void;
  setUsdcBalance: (balance: string) => void;
  setChainId: (chainId: number) => void;
  setCorrectChain: (correct: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  chainId: null,
  usdcBalance: "0",
  isCorrectChain: false,

  setConnected: (address, chainId) =>
    set({ isConnected: true, address, chainId }),

  setDisconnected: () =>
    set({
      isConnected: false,
      address: null,
      chainId: null,
      usdcBalance: "0",
      isCorrectChain: false,
    }),

  setUsdcBalance: (balance) => set({ usdcBalance: balance }),

  setChainId: (chainId) => set({ chainId }),

  setCorrectChain: (correct) => set({ isCorrectChain: correct }),
}));

export const CORRECT_CHAIN_ID = 1952; // X Layer Testnet
