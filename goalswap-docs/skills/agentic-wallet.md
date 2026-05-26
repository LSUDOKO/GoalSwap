# OKX Agentic Wallet — GoalSwap Integration

> Wallet operations for GoalSwap users: login, balances, sending tokens, and contract calls on X Layer.

## Overview

The OKX Agentic Wallet enables GoalSwap users to manage their wallet directly from the CLI — check balances, send USDC, approve token spending, and interact with the Hook contract.

## Key Commands for GoalSwap

### Authentication

```bash
# Login with email
onchainos wallet login <email> --locale en_US
# Verify OTP code
onchainos wallet verify <code>

# Or login with API Key (from env: OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE)
onchainos wallet login
```

### Check Status

```bash
onchainos wallet status
onchainos wallet addresses
onchainos wallet chains
```

### Balance Queries

```bash
# Full portfolio
onchainos wallet balance

# X Layer balance
onchainos wallet balance --chain xlayer

# Specific token on X Layer
onchainos wallet balance --chain xlayer --token-address 0x74b7f16337b8972027f6196a17a631ac6de26d22
```

### Send Tokens

```bash
# Send native OKB
onchainos wallet send --chain xlayer --readable-amount 0.1 --recipient <address>

# Send USDC (ERC-20)
onchainos wallet send --chain xlayer --readable-amount 100 --recipient <address> --contract-token --token-address 0x74b7f16337b8972027f6196a17a631ac6de26d22
```

### Contract Calls

```bash
# Call Hook contract (e.g., updateMatchState)
onchainos wallet contract-call --chain xlayer --to <HOOK_CONTRACT> --input-data <encoded_call>

# Approve USDC for Hook
onchainos wallet contract-call --chain xlayer --to 0x74b7f16337b8972027f6196a17a631ac6de26d22 --input-data <approve_encoded>
```

## For GoalSwap Use Cases

| Use Case | Command |
|----------|---------|
| Check wallet balance before trading | `wallet balance --chain xlayer` |
| Approve USDC for Hook contract | `wallet contract-call --chain xlayer` with approve ABI |
| Send match winnings (USDC) | `wallet send --chain xlayer --contract-token` |
| View transaction history | `wallet history --chain xlayer` |

## Important Notes

- **X Layer gas-free**: Zero gas fees on X Layer — no OKB needed for transactions!
- **Never** set unlimited token approvals — always cap to exact amount needed
- TEE signing means private keys never leave the secure enclave
- XKO address format (`XKO...`) is not supported — use standard `0x` addresses

## Gas Station

The Agentic Wallet supports paying gas with stablecoins (USDT/USDC) via EIP-7702. On X Layer this is less relevant since gas fees are minimal, but enabled automatically when needed.

```bash
# Check gas station status
onchainos wallet gas-station status --chain xlayer

# Setup gas station (if needed)
onchainos wallet gas-station setup --chain xlayer --gas-token-address <addr> --relayer-id <id>
```

> **Full reference:** See [Agentic Wallet CLI Reference](https://www.okx.com/web3/onchainos) for complete command parameters.
