# X Layer Network Information

> Network configuration for GoalSwap Arena deployment.

## Mainnet

| Property | Value |
|----------|-------|
| Network Name | X Layer mainnet |
| RPC URL | `https://rpc.xlayer.tech` |
| RPC URL (alt) | `https://xlayerrpc.okx.com` |
| Chain ID | `196` (0xC4) |
| Token Symbol | OKB |
| Block Explorer | `https://www.okx.com/web3/explorer/xlayer` |
| Flashblocks RPC | `https://rpc.xlayer.tech/flashblocks` |

## Testnet

| Property | Value |
|----------|-------|
| Network Name | X Layer testnet |
| RPC URL | `https://testrpc.xlayer.tech/terigon` |
| RPC URL (alt) | `https://xlayertestrpc.okx.com/terigon` |
| Chain ID | `1952` (0x7A0) |
| Token Symbol | OKB |
| Block Explorer | `https://www.okx.com/web3/explorer/xlayer-test` |
| Gas Station | `https://testrpc.xlayer.tech/terigon/gasstation` |

## Rate Limits

- **100 requests/second/IP** on both mainnet and testnet.
- For dedicated RPC, use providers: QuickNode, Blockdaemon, Getblock, ZAN, Chainstack, BlockPI.

## Adding to MetaMask

Use [Chainlist](https://chainlist.org/chain/195) for testnet, or add manually:
- Testnet: Chain ID 1952, RPC `https://testrpc.xlayer.tech/terigon`

## Usage in wagmi/viem

```typescript
import { defineChain } from 'viem';

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech/terigon'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://www.okx.com/web3/explorer/xlayer-test' },
  },
  testnet: true,
});

export const xLayerMainnet = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' },
  },
});
```
