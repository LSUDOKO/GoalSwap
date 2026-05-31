"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { mainnet } from "wagmi/chains";
import { http } from "wagmi";
import { xLayerTestnet, defaultChain } from "@/lib/contracts";

// ── RainbowKit + Wagmi Config ──
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "d9662c1615f3a097262077e3831b64cb";

const config = getDefaultConfig({
  appName: "GoalSwap Arena",
  projectId,
  chains: [xLayerTestnet, mainnet],
  transports: {
    [xLayerTestnet.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#22c55e",
            accentColorForeground: "#000",
            borderRadius: "medium",
            fontStack: "system",
          })}
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
