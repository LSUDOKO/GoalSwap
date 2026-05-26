# Universal Router — GoalSwap Smart Contract Integration

## Overview

The Uniswap Universal Router is a unified smart contract interface for executing swaps across V2, V3, and V4 pools. For GoalSwap, V4 is the primary target since our `WorldCupArenaHook.sol` operates on V4 pools.

## Universal Router Addresses

The Universal Router (v4, via `@uniswap/universal-router-sdk`) is deployed on supported chains:

| Chain | Chain ID | Universal Router (v4) |
|-------|----------|----------------------|
| Ethereum | 1 | `0x66a9893cc07d91d95644aedd05d03f95e1dba8af` |
| Base | 8453 | `0x6ff5693b99212da76ad316178a184ab56d299b43` |
| Arbitrum | 42161 | `0xa51afafe0263b40edaef0df8781ea9aa03e381a3` |
| Optimism | 10 | `0x851116d9223fabed8e56c0e6b8ad0c31d98b3507` |
| Polygon | 137 | `0x1095692a6237d83c6a72f3f5efedb9a670c49223` |

> **X Layer**: If X Layer (chain 196) is not yet in the official Universal Router deployments, you may need to deploy your own Universal Router or interact with V4 pools directly via `IPoolManager`.

## V4_SWAP Command

The V4_SWAP command (code `0x10`) routes through Uniswap V4 pools — this is the path that triggers your **WorldCupArenaHook**.

```typescript
import { CommandType } from '@uniswap/universal-router-sdk';

// V4_SWAP command parameters:
planner.addCommand(CommandType.V4_SWAP, [
  recipient: Address,       // who receives the output tokens
  currencyIn: Address,      // input token (e.g., USDC or outcome token)
  amountIn: bigint,         // exact input amount
  amountOutMin: bigint,     // minimum output (slippage protection)
  poolKey: V4PoolKey,       // identifies the V4 pool
  zeroForOne: boolean,      // direction: true = token0→token1
  hookData: Hex,            // optional data passed to hook
]);
```

> ⚠️ The `hookData` parameter is crucial for GoalSwap — it allows passing match context data to your `WorldCupArenaHook`.

## SDK Integration (Backend/Node.js)

### Installation
```bash
npm install @uniswap/universal-router-sdk @uniswap/sdk-core @uniswap/v3-sdk viem
```

### Basic Swap Pattern

> ⚠️ **V4 vs V3**: The example below uses V3 SDK patterns (`Pool` from `@uniswap/v3-sdk`) which is the standard approach in the Universal Router SDK. For V4-specific pool reads (what GoalSwap primarily uses), you would interact with `IPoolManager` from `v4-periphery` to fetch pool state. The Universal Router handles both V3 and V4 routing — the `CommandType.V4_SWAP` in the RoutePlanner section below is the V4-specific path.

```typescript
import { SwapRouter } from '@uniswap/universal-router-sdk';
import { Trade as RouterTrade } from '@uniswap/router-sdk';
import { TradeType, Percent } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';

// 1. Fetch pool data (V3 example — for V4 pools use IPoolManager)
const slot0 = await publicClient.readContract({
  address: poolAddress,
  abi: slot0Abi,
  functionName: 'slot0',
});
const liquidity = await publicClient.readContract({
  address: poolAddress,
  abi: liquidityAbi,
  functionName: 'liquidity',
});

// 2. Build pool and route
const pool = new Pool(tokenIn, tokenOut, fee, slot0[0].toString(), liquidity.toString(), slot0[1]);
const route = new V3Route([pool], tokenIn, tokenOut);

// 3. Build trade
const trade = RouterTrade.createUncheckedTrade({
  route,
  inputAmount: amountIn,
  outputAmount: expectedOut,
  tradeType: TradeType.EXACT_INPUT,
});

// 4. Get calldata
const { calldata, value } = SwapRouter.swapCallParameters(trade, {
  slippageTolerance: new Percent(50, 10000), // 0.5%
  recipient: walletAddress,
  deadline: Math.floor(Date.now() / 1000) + 1800,
});

// 5. Execute
const hash = await walletClient.sendTransaction({
  to: UNIVERSAL_ROUTER_ADDRESS,
  data: calldata,
  value: BigInt(value),
});
```

### Low-Level RoutePlanner (Custom Flows)

For GoalSwap-specific flows (e.g., fee collection, match-state-dependent routing):

```typescript
import { RoutePlanner, CommandType, ROUTER_AS_RECIPIENT } from '@uniswap/universal-router-sdk';

// Special addresses for Universal Router
const MSG_SENDER = '0x0000000000000000000000000000000000000001';
const ADDRESS_THIS = '0x0000000000000000000000000000000000000002';

async function executeRoute(planner: RoutePlanner, options?: { value?: bigint }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const routerAddress = UNIVERSAL_ROUTER_ADDRESS('2.0', chainId);

  const { request } = await publicClient.simulateContract({
    address: routerAddress,
    abi: ROUTER_ABI,
    functionName: 'execute',
    args: [planner.commands, planner.inputs, deadline],
    account,
    value: options?.value ?? 0n,
  });

  return walletClient.writeContract(request);
}
```

## Contract-Level Integration (Solidity)

For on-chain composability — e.g., from the Hook contract or a keeper bot:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniversalRouter {
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external payable;
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract GoalSwapRouter {
    IUniversalRouter public immutable router;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    constructor(address _router) {
        router = IUniversalRouter(_router);
    }

    function executeSwap(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external payable {
        router.execute{value: msg.value}(commands, inputs, deadline);
    }

    // One-time Permit2 approval for outcome tokens
    function approveToken(address token) external {
        IERC20(token).approve(PERMIT2, type(uint256).max);
    }
}
```

## Command Cheat Sheet

| Command | Code | Parameters | GoalSwap Use |
|---------|------|-----------|--------------|
| V4_SWAP | `0x10` | (recipient, currencyIn, amountIn, amountOutMin, poolKey, zeroForOne, hookData) | **Primary** — swap through V4 hook pools |
| V3_SWAP_EXACT_IN | `0x00` | (recipient, amountIn, amountOutMin, path, payerIsUser) | Fallback for standard pools |
| V3_SWAP_EXACT_OUT | `0x01` | (recipient, amountOut, amountInMax, path, payerIsUser) | Selling exact amount of outcome tokens |
| WRAP_ETH | `0x0b` | (recipient, amount) | Wrap ETH to WETH for USDC pairs |
| UNWRAP_WETH | `0x0c` | (recipient, amountMin) | Unwrap WETH to native ETH |
| SWEEP | `0x04` | (token, recipient, amountMin) | Clear leftover tokens in router |
| PERMIT2_PERMIT | `0x0a` | (permit, signature) | Single Permit2 approval |
| PAY_PORTION | — | (token, recipient, bips) | Fee collection (e.g., protocol fee) |

## Fee Tiers

| Tier | Value | Percentage | GoalSwap Use Case |
|------|-------|-----------|-------------------|
| LOWEST | 100 | 0.01% | Stable pairs (USDC/USDT) |
| LOW | 500 | 0.05% | Settled match outcomes |
| MEDIUM | 3000 | 0.30% | **Default** — live match trading |
| HIGH | 10000 | 1.00% | High-volatility moments (goals, red cards) |

> GoalSwap's `WorldCupArenaHook` dynamically adjusts fee tier based on match state — these are the base tiers the hook selects from.

## Permit2

| Detail | Value |
|--------|-------|
| Address (all chains) | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Purpose | One-time approval, signature-based per-swap authorization |
| Alternative | Legacy direct approval to Universal Router (for bots/smart accounts) |

**Recommendation for GoalSwap**:
- **Frontend users**: Use Permit2 (one-time approve, EIP-712 signatures per swap)
- **Backend/bots**: Use legacy approval directly to Universal Router (simpler, no signing)
