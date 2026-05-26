# OKX Onchain Gateway — GoalSwap Integration

> Transaction broadcasting, gas estimation, and status tracking on X Layer.

## Overview

The Onchain Gateway skill handles raw transaction operations — broadcasting signed transactions, estimating gas, simulating transactions, and checking transaction status.

## Key Commands

### Get Gas Price

```bash
# X Layer mainnet
onchainos gateway gas-price --chain xlayer

# X Layer testnet
onchainos gateway gas-price --chain 1952
```

### Estimate Gas

```bash
onchainos gateway estimate-gas \
  --chain xlayer \
  --to <CONTRACT_ADDRESS> \
  --data <ENCODED_CALLDATA> \
  --from <SENDER_ADDRESS>
```

### Simulate Transaction

```bash
onchainos gateway simulate \
  --chain xlayer \
  --to <CONTRACT_ADDRESS> \
  --data <ENCODED_CALLDATA> \
  --from <SENDER_ADDRESS> \
  --value 0
```

### Broadcast Transaction

```bash
onchainos gateway broadcast \
  --chain xlayer \
  --signed-tx <SIGNED_TX_HEX>
```

### Check Transaction Status

```bash
onchainos gateway tx-status \
  --chain xlayer \
  --tx-hash <TX_HASH>
```

## For GoalSwap Use Cases

| Use Case | Description |
|----------|-------------|
| Oracle broadcasts match state update | `gateway broadcast --chain xlayer --signed-tx <tx>` |
| Estimate gas for hook swap | `gateway estimate-gas --chain xlayer --to <HOOK>` |
| Simulate oracle update | `gateway simulate --chain xlayer --to <HOOK> --data <calldata>` |
| Check if tx confirmed | `gateway tx-status --chain xlayer --tx-hash <hash>` |

## Important Notes

- X Layer has near-zero gas fees — `gas-price` returns very low values
- The gateway is used by the Oracle service (BlockchainWriter.ts) for `updateMatchState()` calls
- Always simulate before broadcasting for oracle updates
- Gas estimation + 20% buffer is the recommended strategy for oracle transactions

> **Full reference:** See [Onchain Gateway CLI Reference](https://github.com/okx/onchainos-skills) for complete command parameters.
