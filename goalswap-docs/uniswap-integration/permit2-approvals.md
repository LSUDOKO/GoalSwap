# Permit2 Approvals — GoalSwap Integration

## Overview

Permit2 is Uniswap's token approval system that enables **one-time approval, signature-based per-swap authorization**. For GoalSwap, this means users approve their USDC and outcome tokens once, then each trade only requires a wallet signature (not an on-chain approve transaction).

## Approval Targets

| Approach | Approve To | Per-Swap Auth | Best For |
|----------|-----------|---------------|----------|
| **Permit2** (recommended) | Permit2 contract | EIP-712 signature | Frontend users, web app |
| **Legacy** (direct approve) | Universal Router | None (pre-approved) | Backend services, bots, smart accounts |

## Permit2 Address

| Chain | Address |
|-------|---------|
| All chains | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

## Integration Pattern

### Step 1: Check Allowance

```typescript
import { createPublicClient, http } from 'viem';

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const XLAYER_CHAIN_ID = 196;

// Check if Permit2 has sufficient allowance
const allowance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress, PERMIT2_ADDRESS],
});
```

### Step 2: Approve (One-Time)

If allowance is insufficient, send an approve transaction:

```typescript
import { maxUint256 } from 'viem';

const hash = await walletClient.writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [PERMIT2_ADDRESS, maxUint256],
});
await publicClient.waitForTransactionReceipt({ hash });
```

> ⚠️ For GoalSwap, users should approve **both** their USDC and the outcome tokens they want to trade. This is a one-time setup.

### Step 3: Sign Permit for Each Swap

For CLASSIC routes via Trading API, sign the permit from the quote response:

```typescript
async function signPermit(quoteResponse: ClassicQuoteResponse, walletClient: any) {
  if (!quoteResponse.permitData) return undefined;

  const signature = await walletClient.signTypedData({
    domain: quoteResponse.permitData.domain,
    types: quoteResponse.permitData.types,
    primaryType: 'PermitTransferFrom',
    message: quoteResponse.permitData.values,
  });

  return signature;
}
```

## Token Approval Checklist (GoalSwap)

| Token | Approve to Permit2? | Notes |
|-------|--------------------|-------|
| USDC (X Layer) | ✅ Yes | Base currency for all match trading |
| BRA-win (match token) | ✅ Yes | If user wants to sell |
| FRA-win (match token) | ✅ Yes | If user wants to sell |
| DRAW (match token) | ✅ Yes | If user wants to sell |
| ETH (native) | ❌ No | Not an ERC-20 |

## Using the Trading API for Approvals

The Trading API's `/check_approval` endpoint handles this automatically:

```typescript
const approvalRes = await fetch(`${API_URL}/check_approval`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
    'x-universal-router-version': '2.0',
  },
  body: JSON.stringify({
    walletAddress: userAddress,
    token: tokenAddress,
    amount: swapAmount,
    chainId: 196, // X Layer
  }),
});

const approvalData = await approvalRes.json();

if (approvalData.approval) {
  // Send the approval transaction
  const hash = await walletClient.sendTransaction({
    to: approvalData.approval.to,
    data: approvalData.approval.data,
    value: BigInt(approvalData.approval.value || '0'),
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
// If approval is null, skip — already approved
```

## Permit2 + UniswapX Handling

For UniswapX routes (DUTCH_V2/V3/PRIORITY):

1. `/quote` returns `permitData` (EIP-712 typed data for **the Dutch order**, not Permit2)
2. User signs `permitData` locally → produces `signature`
3. `/swap` body includes **only** `signature` — DO NOT send `permitData`
4. The order is already encoded in `quote.encodedOrder`

| Route | Sign `permitData`? | Send `permitData` to `/swap`? | Send `signature` to `/swap`? |
|-------|-------------------|------------------------------|------------------------------|
| CLASSIC | Yes | **Yes** (router needs it) | Yes (if using Permit2) |
| DUTCH_V2/V3/PRIORITY | Yes | **No** (schema rejects it) | Yes |

## Legacy Approval (Backend/Bots)

For automated systems that cannot sign EIP-712 messages:

```typescript
// Approve token directly to Universal Router (one-time)
const hash = await walletClient.writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [UNIVERSAL_ROUTER_ADDRESS, maxUint256],
});
await publicClient.waitForTransactionReceipt({ hash });
```

Each subsequent swap only needs a `sendTransaction` call — no signing step required.
