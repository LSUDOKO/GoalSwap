# OKX Security — GoalSwap Integration

> Transaction safety, token risk scanning, DApp phishing detection for GoalSwap users.

## Overview

The Security skill provides pre-execution safety checks for all on-chain operations. Before any swap, approve, or contract interaction on GoalSwap, run a security scan.

## Key Commands

### Token Scan (Honeypot Detection)

```bash
# Check if a token is safe on X Layer
onchainos security token-scan \
  --chain xlayer \
  --token-address <TOKEN_ADDRESS>
```

### DApp/URL Scan (Phishing Detection)

```bash
# Check if a URL is safe
onchainos security dapp-scan --url https://goalswap.xyz

# Check a contract address
onchainos security dapp-scan --address <CONTRACT_ADDRESS>
```

### Transaction Scan (Pre-Execution)

```bash
# Check swap tx before broadcasting
onchainos security tx-scan \
  --chain xlayer \
  --to <RECIPIENT> \
  --data <ENCODED_CALLDATA> \
  --from <SENDER> \
  --value 0
```

### Signature Scan

```bash
# Check EIP-712 signature safety
onchainos security sig-scan \
  --chain xlayer \
  --from <SENDER> \
  --type eip712 \
  --data <JSON_MESSAGE>
```

### Approval Management

```bash
# List all approvals
onchainos security approvals \
  --chain xlayer \
  --wallet <WALLET_ADDRESS>

# Revoke risky approval
onchainos security approvals \
  --chain xlayer \
  --wallet <WALLET_ADDRESS> \
  --revoke --token-address <TOKEN> --spender <SPENDER>
```

## Risk Levels

| Level | Buy Action | Sell Action |
|-------|------------|-------------|
| CRITICAL | ❌ Block — refuse to buy | ⚠️ Warn — allow sell (stop-loss) |
| HIGH | ⚠️ Require explicit confirmation | ⚠️ Warn — allow sell |
| MEDIUM | ℹ️ Info notice, continue | ℹ️ Info notice, continue |
| LOW | ✅ Safe — proceed | ✅ Safe — proceed |

## For GoalSwap Use Cases

| Use Case | Command |
|----------|---------|
| Check outcome token safety | `security token-scan --chain xlayer --token-address <addr>` |
| Verify Hook contract is safe | `security dapp-scan --address <HOOK_ADDRESS>` |
| Pre-check a swap tx | `security tx-scan --chain xlayer --to <HOOK> --data <calldata>` |
| Check token approvals | `security approvals --chain xlayer --wallet <addr>` |
| Revoke unnecessary approvals | `security approvals --chain xlayer --wallet <addr> --revoke` |

## Important Notes

- Always run `token-scan` before buying an unknown outcome token or fan token
- `dapp-scan` can verify the GoalSwap frontend URL and Hook contract address
- Approvals should never be set to unlimited amounts
- Security commands do NOT require wallet login

> **Full reference:** See references in `skills/okx-security/references/` for detailed risk detection rules.
