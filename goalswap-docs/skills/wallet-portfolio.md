# OKX Wallet Portfolio — GoalSwap Integration

> Check wallet balances, token holdings, and portfolio value for any address on X Layer.

## Overview

The Wallet Portfolio skill lets you check token holdings and portfolio value for any wallet address on X Layer and other chains. This is useful for display on the GoalSwap leaderboard and user profiles.

## Key Commands

### Check Address Portfolio

```bash
# Full portfolio across all chains
onchainos wallet portfolio --address <WALLET_ADDRESS>

# X Layer specific portfolio
onchainos wallet portfolio --address <WALLET_ADDRESS> --chain xlayer
```

### Check Specific Token

```bash
# Check USDC balance on X Layer
onchainos wallet portfolio \
  --address <WALLET_ADDRESS> \
  --chain xlayer \
  --token-address 0x74b7f16337b8972027f6196a17a631ac6de26d22
```

## For GoalSwap Use Cases

| Use Case | Description |
|----------|-------------|
| View user portfolio on `/profile` page | Check tokens + total value on X Layer |
| Leaderboard display | Show top traders' portfolio values |
| Verify user has funds before trading | Check USDC balance on X Layer |
| Monitor LP positions | Check token holdings in V4 pools |

## Important Notes

- Works with any wallet address — no login required for public queries (use OKX Agentic Wallet for private wallet)
- X Layer chain name: `xlayer`, chainIndex: `196`
- USDC address on X Layer mainnet: `0x74b7F16337b8972027F6196A17a631aC6dE26d22`

> **Full reference:** See [Wallet Portfolio CLI Reference](https://github.com/okx/onchainos-skills) for complete command parameters.
