# Trading API — GoalSwap Integration

## Overview

The Uniswap Trading API handles routing optimization automatically. Use it for the GoalSwap frontend to get quotes and execute swaps on match outcome tokens.

**Base URL**: `https://trade-api.gateway.uniswap.org/v1`

**Authentication**: `x-api-key: <your-api-key>` header (get from [Uniswap Developer Portal](https://developers.uniswap.org/))

## 3-Step Swap Flow

```
POST /check_approval  →  POST /quote  →  POST /swap
```

### Required Headers (All Requests)

```json
{
  "Content-Type": "application/json",
  "x-api-key": "<your-api-key>",
  "x-universal-router-version": "2.0"
}
```

---

### Step 1: Check Approval

Check if the user has approved enough tokens for the swap.

```bash
POST /check_approval
```

**Request Body**:
```json
{
  "walletAddress": "0xUserWallet...",
  "token": "0xOutcomeTokenAddress...",
  "amount": "1000000000",
  "chainId": 196
}
```

> **X Layer Chain ID**: `196` (mainnet) or `195` (testnet)

**Response**:
```json
{
  "approval": {
    "to": "0x...",
    "from": "0x...",
    "data": "0x...",
    "value": "0",
    "chainId": 196
  }
}
```

If `approval` is `null`, the token is already approved — skip to Step 2.

---

### Step 2: Get Quote

```bash
POST /quote
```

**Request Body** (GoalSwap example — trading BRA-win for USDC):
```json
{
  "swapper": "0xUserWallet...",
  "tokenIn": "0xBRAWinToken...",
  "tokenOut": "0xUSDC_XLAYER...",
  "tokenInChainId": "196",
  "tokenOutChainId": "196",
  "amount": "1000000000000000000",
  "type": "EXACT_INPUT",
  "slippageTolerance": 0.5,
  "routingPreference": "BEST_PRICE",
  "protocols": ["V3", "V4"]
}
```

**Key Parameters**:

| Parameter | Description | GoalSwap Tip |
|-----------|-------------|--------------|
| `type` | `EXACT_INPUT` or `EXACT_OUTPUT` | Use `EXACT_INPUT` for buying, `EXACT_OUTPUT` for selling |
| `slippageTolerance` | 0-100 percentage | Higher for live matches (volatility); 0.5-1.0 for settled matches |
| `protocols` | `["V2", "V3", "V4"]` | Include `"V4"` to route through V4 hooks |
| `routingPreference` | `BEST_PRICE`, `FASTEST`, `CLASSIC` | `BEST_PRICE` during active matches |
| `autoSlippage` | `true` for automatic calculation | Recommended during high-volatility World Cup moments |
| `urgency` | `normal` or `fast` | `fast` for time-sensitive match event trades |

> ⚠️ **Critical**: `tokenInChainId` and `tokenOutChainId` must be **strings** (e.g., `"196"`), not numbers.

**Response** (CLASSIC routing example):
```json
{
  "routing": "CLASSIC",
  "quote": {
    "input": { "token": "0x...", "amount": "1000000000000000000" },
    "output": { "token": "0x...", "amount": "999000000" },
    "slippage": 0.5,
    "route": [],
    "gasFee": "5000000000000000",
    "gasFeeUSD": "0.01",
    "gasUseEstimate": "150000"
  },
  "permitData": null
}
```

> For UniswapX (DUTCH_V2/V3) responses, use `quote.orderInfo.outputs[0].startAmount` for output amount — there is no `quote.output.amount`.

---

### Step 3: Execute Swap

```bash
POST /swap
```

**Critical — Spread quote response, don't wrap it**:
```typescript
// ✅ CORRECT: Spread the full quote response
const { permitData, permitTransaction, ...cleanQuote } = quoteResponse;
const swapRequest = { ...cleanQuote };

// ❌ WRONG: Don't wrap in { quote: ... }
```

**Permit2 handling by routing type**:

| Routing | `signature` | `permitData` |
|---------|------------|--------------|
| CLASSIC | Required (if using Permit2) | **Required** (if using Permit2) |
| DUTCH_V2/V3/PRIORITY | Required | **Omit** — schema rejects it |

**Response** (ready-to-sign transaction):
```json
{
  "swap": {
    "to": "0x...",
    "from": "0x...",
    "data": "0x...",
    "value": "0",
    "chainId": 196
  }
}
```

---

## TypeScript Types for GoalSwap

```typescript
// GoalSwap-specific types
interface GoalSwapQuoteParams {
  swapper: `0x${string}`;
  tokenIn: `0x${string}`;  // e.g., outcome token
  tokenOut: `0x${string}`; // e.g., USDC
  tokenInChainId: string;   // "196" for X Layer
  tokenOutChainId: string;
  amount: string;           // in wei
  type: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  slippageTolerance: number;
  protocols?: ('V2' | 'V3' | 'V4')[];
  routingPreference?: 'BEST_PRICE' | 'FASTEST' | 'CLASSIC';
}

type ClassicQuoteResponse = {
  routing: 'CLASSIC' | 'WRAP' | 'UNWRAP';
  quote: {
    input: { token: string; amount: string };
    output: { token: string; amount: string };
    slippage: number;
    route: unknown[];
    gasFee: string;
    gasFeeUSD: string;
    gasUseEstimate: string;
  };
  permitData: Record<string, unknown> | null;
};

type UniswapXQuoteResponse = {
  routing: 'DUTCH_V2' | 'DUTCH_V3' | 'PRIORITY';
  quote: {
    orderInfo: {
      outputs: Array<{
        token: string;
        startAmount: string;  // best-case fill
        endAmount: string;    // floor after auction decay
        recipient: string;
      }>;
      input: { token: string; startAmount: string; endAmount: string };
      deadline: number;
      nonce: string;
    };
    encodedOrder: string;
    orderHash: string;
  };
  permitData: Record<string, unknown> | null;
};

type QuoteResponse = ClassicQuoteResponse | UniswapXQuoteResponse;
```

## Response Validation

Always validate before broadcasting:
```typescript
function validateSwapBeforeBroadcast(swap: {
  data?: string;
  to?: string;
  from?: string;
  value?: string;
}): void {
  if (!swap?.data || swap.data === '' || swap.data === '0x') {
    throw new Error('swap.data empty — quote expired. Re-fetch.');
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(swap.to || '') ||
      !/^0x[a-fA-F0-9]{40}$/.test(swap.from || '')) {
    throw new Error('Invalid address in swap response');
  }
  if (swap.value === undefined || swap.value === null) {
    throw new Error('swap.value is missing');
  }
}
```

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/check_approval` | ~10 req/s |
| `/quote` | ~10 req/s |
| `/swap` | ~10 req/s |

Implement exponential backoff with jitter for 429 responses:
```typescript
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    if (response.status !== 429 && response.status < 500) return response;
    const delay = Math.min(200 * Math.pow(2, attempt) + Math.random() * 100, 10000);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Failed after retries');
}
```

## Quote Freshness

- Quotes expire in ~30 seconds
- Re-fetch if user takes time to review
- Always re-fetch before `/swap` if >20 seconds have passed
