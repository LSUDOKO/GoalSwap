# Frontend Setup — Uniswap Swap Integration

## Overview

The GoalSwap frontend (Next.js 16 + wagmi + RainbowKit) needs these setup steps to integrate Uniswap swaps:

1. **Buffer polyfill** — Required by viem/wagmi for browser compatibility
2. **CORS proxy** — Trading API rejects browser preflight requests
3. **Swap hook** — React hook for the 3-step flow
4. **Wagmi v2 patterns** — Pitfalls to avoid

---

## 1. Buffer Polyfill

Install and configure Buffer for the browser environment:

```bash
npm install buffer
```

**`next.config.ts`** (add to your existing config):
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer'),
    };
    return config;
  },
};

export default nextConfig;
```

**`app/layout.tsx`** — add before other imports:
```typescript
import { Buffer } from 'buffer';
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
```

---

## 2. CORS Proxy Setup

The Trading API returns `415 Unsupported Media Type` on browser OPTIONS preflight requests. You **must** proxy through your Next.js server.

**`next.config.ts`** — add the rewrite rule:
```typescript
const nextConfig: NextConfig = {
  // ... existing config
  async rewrites() {
    return [
      {
        source: '/api/uniswap/:path*',
        destination: 'https://trade-api.gateway.uniswap.org/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
```

Then in your frontend code, use:
```typescript
const API_URL = '/api/uniswap'; // instead of full Trading API URL
```

---

## 3. React Swap Hook

A complete swap hook tailored for GoalSwap's match outcome trading:

```typescript
// hooks/useGoalSwap.ts
'use client';

import { useWalletClient } from 'wagmi';
import { getWalletClient, getPublicClient, switchChain } from '@wagmi/core';
import { useCallback, useState } from 'react';
import { isAddress, isHex, type Address, type Hex } from 'viem';
import { config } from '@/lib/wagmi'; // your wagmi config

const API_URL = '/api/uniswap';
const API_KEY = process.env.NEXT_PUBLIC_UNISWAP_API_KEY!;

interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amount: string;       // in wei
  chainId: number;       // 196 for X Layer
  slippage?: number;     // default 0.5
  type?: 'EXACT_INPUT' | 'EXACT_OUTPUT';
}

interface SwapState {
  quote: any | null;
  loading: boolean;
  error: string | null;
}

export function useGoalSwap() {
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<SwapState>({ quote: null, loading: false, error: null });

  // ⚠️ Before calling getQuote, ensure token approval is sufficient.
  // Use /check_approval to verify — see permit2-approvals.md for the approval flow.
  const getQuote = useCallback(async (params: SwapParams) => {
    setState({ quote: null, loading: true, error: null });

    try {
      // Validate inputs
      if (!isAddress(params.tokenIn)) throw new Error('Invalid tokenIn address');
      if (!isAddress(params.tokenOut)) throw new Error('Invalid tokenOut address');

      const response = await fetch(`${API_URL}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-universal-router-version': '2.0',
        },
        body: JSON.stringify({
          swapper: walletClient?.account?.address,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          tokenInChainId: String(params.chainId),
          tokenOutChainId: String(params.chainId),
          amount: params.amount,
          type: params.type || 'EXACT_INPUT',
          slippageTolerance: params.slippage ?? 0.5,
          routingPreference: 'BEST_PRICE',
          protocols: ['V4', 'V3'], // Prefer V4 for hook-based pools
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Quote failed');

      setState({ quote: data, loading: false, error: null });
      return data;
    } catch (err: any) {
      setState({ quote: null, loading: false, error: err.message });
      return null;
    }
  }, [walletClient]);

  const executeSwap = useCallback(async (chainId: number, permit2Signature?: string) => {
    if (!state.quote) throw new Error('No quote available. Call getQuote first.');

    // Prepare swap request body
    const { permitData, permitTransaction, ...cleanQuote } = state.quote;
    const swapRequest: Record<string, unknown> = { ...cleanQuote };

    // Route-specific permitData handling
    const isUniswapX =
      state.quote.routing === 'DUTCH_V2' ||
      state.quote.routing === 'DUTCH_V3' ||
      state.quote.routing === 'PRIORITY';

    if (isUniswapX) {
      // UniswapX: signature only, permitData stays local
      if (permit2Signature) swapRequest.signature = permit2Signature;
    } else {
      // CLASSIC: both signature and permitData, or neither
      if (permit2Signature && permitData && typeof permitData === 'object') {
        swapRequest.signature = permit2Signature;
        swapRequest.permitData = permitData;
      }
    }

    const response = await fetch(`${API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-universal-router-version': '2.0',
      },
      body: JSON.stringify(swapRequest),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Swap failed');

    // Validate swap response
    if (!data.swap?.data || data.swap.data === '' || data.swap.data === '0x') {
      throw new Error('Empty swap data — quote may have expired. Refresh and retry.');
    }

    // Execute via wagmi with chain handling
    const walletClient = await getWalletClient(config, { chainId });
    await switchChain(config, { chainId });
    const tx = await walletClient.sendTransaction({
      to: data.swap.to as Address,
      data: data.swap.data as Hex,
      value: BigInt(data.swap.value || '0'),
    });

    const publicClient = getPublicClient(config, { chainId });
    return publicClient!.waitForTransactionReceipt({ hash: tx });
  }, [state.quote]);

  return {
    ...state,
    getQuote,
    executeSwap,
  };
}
```

---

## 4. Wagmi v2 Pitfalls

| Issue | Solution |
|-------|----------|
| `useWalletClient()` returns `undefined` even when connected | Use `getWalletClient(config, { chainId })` from `@wagmi/core` at swap time instead |
| Chain mismatch errors | Call `switchChain(config, { chainId })` before sending transaction |
| Missing `chain` on wallet client | Always pass `chainId` to `getWalletClient()` |

**Recommended pattern for swap execution**:
```typescript
import { getWalletClient, getPublicClient, switchChain } from '@wagmi/core';
import { config } from '@/lib/wagmi';

async function executeSwapOnChain(chainId: number, swapTx: SwapTransaction) {
  // 1. Ensure correct chain
  await switchChain(config, { chainId });

  // 2. Get client with explicit chain
  const walletClient = await getWalletClient(config, { chainId });

  // 3. Execute
  const hash = await walletClient.sendTransaction({
    to: swapTx.to,
    data: swapTx.data,
    value: BigInt(swapTx.value || '0'),
  });

  // 4. Wait for confirmation
  const publicClient = getPublicClient(config, { chainId });
  return publicClient!.waitForTransactionReceipt({ hash });
}
```

---

## 5. Displaying Gas Costs

- **CLASSIC routes**: Use `gasFeeUSD` from quote response directly — it's a string with the USD value
- **UniswapX routes**: Gasless for the swapper (filler pays gas)
- **Do NOT** manually convert `gasFee` (wei) using a hardcoded ETH price — leads to wildly inaccurate estimates
