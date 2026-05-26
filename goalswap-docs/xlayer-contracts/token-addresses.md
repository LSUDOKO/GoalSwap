# Token Addresses on X Layer

> Critical addresses for GoalSwap — USDC is the base currency for all pools.

## Mainnet Token Addresses

| Token | Address | Notes |
|-------|---------|-------|
| **USDC** | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | ✅ **Base currency for GoalSwap — USE THIS** |
| USDC.e (bridged) | `0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035` | Legacy bridged USDC — avoid |
| WOKB | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | Wrapped OKB |
| WETH | `0x5A77f1443D16ee5761d310e38b62f77f726bC71c` | Wrapped ETH |
| USDT | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | Tether |
| USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` | USDT0 (bridged) |
| WBTC | `0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1` | Wrapped BTC |
| DAI | `0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4` | Maker DAI |
| xBTC | `0xb7C00000bcDEeF966b20B3D884B98E64d2b06b4f` | X Layer BTC |
| USDG | `0x4ae46a509F6b1D9056937BA4500cb143933D2dc8` | USD Gemini |

## Testnet Token Addresses

| Token | Address |
|-------|---------|
| WETH | `0xBec7859BC3d0603BeC454F7194173E36BF2Aa5C8` |

## USDC Decision (from about.md)

> **USDC** (native, `0x74b7F...`) is the base currency for all GoalSwap pools:
> - All pools settle in USDC — simple, no native token price risk
> - Outcome tokens redeem 1:1 for USDC
> - Fan tokens are priced in USDC via bonding curves

## For GoalSwap Contract Development

```solidity
// In WorldCupArenaHook.sol
address constant USDC = 0x74b7F16337b8972027F6196A17a631aC6dE26d22;
// Testnet USDC address may differ — use a mock or deployed testnet USDC
```
