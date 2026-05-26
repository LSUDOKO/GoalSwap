# OKX DEX Bridge — GoalSwap Integration

> Cross-chain bridging to/from X Layer for user onboarding and withdrawals.

## Overview

Users can bridge USDC from Ethereum, BSC, Polygon, Arbitrum, Base, etc. to X Layer using the OKX DEX Cross-Chain Bridge skill.

## Supported Chains for Bridging to X Layer

X Layer (chainIndex: 196) is supported for cross-chain bridging with Ethereum, BSC, Polygon, Arbitrum, Base, Optimism, Avalanche, and others.

## Key Commands

### List Available Bridges

```bash
# Bridges that can reach X Layer
onchainos cross-chain bridges --to-chain xlayer

# Bridges on specific source chain → X Layer
onchainos cross-chain bridges --from-chain ethereum --to-chain xlayer
```

### List Bridgeable Tokens

```bash
# Tokens that can be bridged to X Layer
onchainos cross-chain tokens --to-chain xlayer

# Tokens from Ethereum that can go to X Layer
onchainos cross-chain tokens --from-chain ethereum --to-chain xlayer
```

### Get a Quote

```bash
# Quote: Bridge USDC from Ethereum to X Layer
onchainos cross-chain quote \
  --from usdc \
  --to usdc \
  --from-chain ethereum \
  --to-chain xlayer \
  --readable-amount 100 \
  --wallet <WALLET_ADDRESS> \
  --check-approve \
  --receive-address <WALLET_ADDRESS>
```

### Execute Bridge

```bash
# One-shot: quote → approve (if needed) → swap → broadcast
onchainos cross-chain execute \
  --from usdc \
  --to usdc \
  --from-chain ethereum \
  --to-chain xlayer \
  --readable-amount 100 \
  --wallet <WALLET_ADDRESS> \
  --receive-address <WALLET_ADDRESS>
```

### Check Bridge Status

```bash
onchainos cross-chain status \
  --tx-hash <SOURCE_TX_HASH> \
  --bridge-id <BRIDGE_ID> \
  --from-chain 1
```

## For GoalSwap Use Cases

| Use Case | Command Pattern |
|----------|----------------|
| User bridges USDC → X Layer to trade | `cross-chain execute --from usdc --to usdc --from-chain ethereum --to-chain xlayer` |
| Bridge winnings back to Ethereum | `cross-chain execute --from usdc --to usdc --from-chain xlayer --to-chain ethereum` |
| Check if bridge arrived | `cross-chain status --tx-hash ... --bridge-id ... --from-chain ...` |

## Important Notes

- **USDC** (`0x74b7F16337b8972027F6196A17a631aC6dE26d22`) is the recommended token on X Layer
- Native token shortcut: `usdc`, `usdt`, `eth`, `okb`
- Cross-chain transfers are NOT atomic — funds may be in transit for seconds to minutes
- Always check destination balance if `status` is stuck at PENDING
- X Layer has near-zero gas fees

> **Full reference:** See [DEX Bridge CLI Reference](https://github.com/okx/onchainos-skills) for complete command parameters.
