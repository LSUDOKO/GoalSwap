# OKX DEX Swap — GoalSwap Integration

> Token swap execution on X Layer for trading match outcomes, fan tokens, etc.

## Overview

The OKX DEX Swap skill enables token-to-token swaps on X Layer. For GoalSwap, this is used by users who want to swap USDC for outcome tokens or fan tokens.

## Key Commands

### Check Supported Chains

```bash
onchainos dex swap chains
```

### Search Tokens on X Layer

```bash
# Search for tokens
onchainos token search --query "USDC" --chains xlayer

# Token price info
onchainos token price-info --chain xlayer --token-address 0x74b7f16337b8972027f6196a17a631ac6de26d22
```

### Get Swap Quote

```bash
# Quote for swapping USDC → OutcomeToken on X Layer
onchainos dex swap quote \
  --from 0x74b7f16337b8972027f6196a17a631ac6de26d22 \
  --to <OUTCOME_TOKEN_ADDRESS> \
  --amount 100 \
  --chain xlayer \
  --slippage 1.0 \
  --wallet <WALLET_ADDRESS>
```

### Execute Swap

```bash
# Execute swap
onchainos dex swap execute \
  --from 0x74b7f16337b8972027f6196a17a631ac6de26d22 \
  --to <OUTCOME_TOKEN_ADDRESS> \
  --amount 100 \
  --chain xlayer \
  --slippage 1.0 \
  --wallet <WALLET_ADDRESS>
```

## For GoalSwap Use Cases

| Use Case | Description |
|----------|-------------|
| Buy match outcome | Swap USDC → Team Win/Draw outcome token |
| Sell match outcome | Swap outcome token → USDC |
| Buy fan token | Swap USDC → FanToken via bonding curve |
| Sell fan token | Swap FanToken → USDC |

## Important Notes

- **USDC** (`0x74b7F16337b8972027F6196A17a631aC6dE26d22`) is the base currency on X Layer mainnet
- Always run `security token-scan` before swapping an unknown token
- X Layer has near-zero gas fees
- Slippage default: 1% (adjustable on user request)

> **Full reference:** See [DEX Swap CLI Reference](https://github.com/okx/onchainos-skills) for complete command parameters.
