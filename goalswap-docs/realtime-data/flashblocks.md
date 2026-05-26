# Flashblocks on X Layer

> 200-millisecond preconfirmations for near-instant transaction feedback.
> Critical for GoalSwap — fast trading requires low latency.

## Overview

Flashblocks delivers **200ms preconfirmations** on X Layer, drastically reducing wait times for transaction feedback. This uses delta compression — only incremental changes are transmitted between successive flashblocks.

## RPC Endpoint

| Network | URL |
|---------|-----|
| Mainnet | `https://rpc.xlayer.tech/flashblocks` |

## Supported Methods with `pending` Tag

| Method | Description |
|--------|-------------|
| `eth_blockNumber` | Current flashblocks pending block height |
| `eth_call` | Execute call against pending state |
| `eth_estimateGas` | Estimate gas with pending state |
| `eth_getBalance` | Get balance from pending state |
| `eth_getTransactionCount` | Get nonce from pending state |
| `eth_getCode` | Get contract code from pending state |
| `eth_getStorageAt` | Get storage slot from pending state |
| `eth_getBlockByNumber` | Get pending block with `"pending"` param |
| `eth_getBlockByHash` | Get flashblock by hash |
| `eth_getBlockReceipts` | Get receipts for pending block |
| `eth_getTransactionByHash` | Get transaction by hash |
| `eth_getTransactionReceipt` | Get receipt by hash |

## Example: Send & Confirm in <500ms

```bash
curl https://rpc.xlayer.tech/flashblocks -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":["pending"],"id":1}'
```

## Using with Viem

```typescript
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const xlayerPreconf = defineChain({
  id: 196,
  name: 'X Layer Preconf',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech/flashblocks'] },
  },
});

const account = privateKeyToAccount(process.env.PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  chain: xlayerPreconf,
  transport: http('https://rpc.xlayer.tech/flashblocks'),
});

const publicClient = createPublicClient({
  chain: xlayerPreconf,
  transport: http('https://rpc.xlayer.tech/flashblocks'),
});

async function flashTrade() {
  const submissionTime = new Date();
  const hash = await walletClient.sendTransaction({
    to: '0x...', // Hook contract
    data: '0x...', // Swap calldata
    value: BigInt(0),
  });

  // Wait for receipt — should come in <200ms
  let receipt = null;
  while (!receipt) {
    try {
      receipt = await publicClient.getTransactionReceipt({ hash });
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  console.log(`Confirmed in ${Date.now() - submissionTime.getTime()}ms`);
}
```

## For GoalSwap

Flashblocks enables:
- **Sub-second swap confirmations** for match trading
- **Near-instant position updates** after goal events
- **Low-latency oracle updates** from BlockchainWriter
- **Real-time fee tier changes** visible immediately
