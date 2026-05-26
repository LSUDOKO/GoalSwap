# X Layer Gas Station

> Gas price oracle for X Layer, currently available on testnet.

## Endpoint

**Testnet:** `GET https://testrpc.xlayer.tech/terigon/gasstation`

## Usage

```bash
curl https://testrpc.xlayer.tech/terigon/gasstation
```

## Response

```json
{
  "safeLow": 1,
  "standard": 1,
  "fast": 1,
  "fastest": 1,
  "blockTime": 2,
  "blockNumber": 308789
}
```

| Field | Description |
|-------|-------------|
| `safeLow` | Conservative gas price (Gwei) |
| `standard` | Standard gas price (Gwei) |
| `fast` | Fast gas price (Gwei) |
| `fastest` | Fastest gas price (Gwei) |
| `blockTime` | Average block time (seconds) |
| `blockNumber` | Latest mined block number |

## For GoalSwap Oracle

In the oracle's `BlockchainWriter.ts`, use the gas station to set optimal gas prices:

```typescript
async function getOptimalGasPrice(): Promise<bigint> {
  const response = await fetch('https://testrpc.xlayer.tech/terigon/gasstation');
  const data = await response.json();
  // Use 'fast' for time-sensitive match state updates
  return BigInt(data.fast) * 1_000_000_000n; // Convert Gwei to Wei
}
```

## Gas Strategy (from about.md)

- Use `estimateGas` + 20% buffer
- If gas estimation fails, skip update and alert admin
- Queue multiple match updates with 2-second spacing to avoid nonce collisions
