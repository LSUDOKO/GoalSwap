# Uniswap Integration — GoalSwap

## Why Uniswap for GoalSwap?

GoalSwap uses **Uniswap V4** as its underlying AMM engine. Match outcome tokens (e.g., BRA-win, FRA-win, DRAW) are traded as ERC-20 tokens through Uniswap V4 pools with **dynamic fee hooks**. The `WorldCupArenaHook.sol` contract adjusts swap fees in real-time based on live match data from the oracle.

## Integration Layers

GoalSwap integrates with Uniswap at **three levels**:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contract** | Uniswap V4 Hooks + Universal Router | Dynamic fee logic, pool creation, swap execution on-chain |
| **Frontend** | Uniswap Trading API | Fetch quotes, build swap transactions, display pricing in UI |
| **Backend** | Universal Router SDK | Automated market making, arbitrage detection, bot operations |

## Architecture Diagram

```
User (Frontend)
    │
    ├──► Trading API (quote/swap/check_approval)
    │       │
    │       └──► Universal Router (executes swap)
    │               │
    │               └──► V4 Pool [with WorldCupArenaHook]
    │                       │
    │                       ├──► beforeSwap() → dynamic fee adjustment
    │                       └──► afterSwap() → state update
    │
    └──► WorldCupArenaHook (direct read)
            │
            └──► Oracle feed → match state → fee tier → pool
```

## Key Components

### WorldCupArenaHook.sol
- Uniswap V4 **beforeSwap** hook — reads match state from oracle, adjusts swap fee dynamically
- Manages match state: `NOT_STARTED`, `LIVE`, `FINISHED`, `CANCELLED`
- Fees correlate with match events (goals → higher volatility → higher fees)
- Deployed alongside OutcomeTokenFactory on X Layer

### OutcomeTokenFactory.sol
- Creates match outcome tokens (e.g., BRA-win at `0x...`, FRA-win at `0x...`)
- Creates V4 pools for each outcome pair
- Mints/burns tokens based on match resolution

### Trading API (Frontend)
- **Recommended** for frontend integration — handles routing optimization automatically
- 3-step flow: `check_approval` → `quote` → `swap`
- Returns ready-to-sign transaction objects
- Requires CORS proxy when used from browser

### Universal Router (Direct)
- Use for backend/script automation
- Supports V4_SWAP command via SDK
- Permit2 for gas-efficient approvals

## X Layer Support

> ⚠️ **Important**: Uniswap Universal Router and Trading API have chain-specific support. Verify X Layer support at the [official docs](https://api-docs.uniswap.org/guides/supported_chains). If X Layer is not natively supported:
> - Deploy your own Universal Router instance
> - Or use direct pool interaction via `IPoolManager` on V4
> - The Trading API may still work if X Layer is in their supported chain list

## Quick Reference

| What you need | Where to find it |
|--------------|-----------------|
| Trading API endpoints & auth | [Trading API Guide](./trading-api.md) |
| Universal Router addresses & commands | [Universal Router Guide](./universal-router.md) |
| Frontend setup (CORS, wagmi, polyfills) | [Frontend Setup Guide](./frontend-setup.md) |
| Permit2 approvals | [Permit2 Guide](./permit2-approvals.md) |
| Uniswap V4 Hook contract patterns | [about.md](../../about.md) — Hook architecture section |
| Chainlink price feeds on X Layer | [Oracle Integration](../oracle-integration/chainlink-price-feeds.md) |

## Prerequisites

- **API Key**: Register at [Uniswap Developer Portal](https://developers.uniswap.org/) for Trading API access
- **V4 Periphery**: Foundry project with `v4-periphery` dependency for Hook development
- **X Layer RPC**: Configured in your project (see [Network Info](../xlayer-deployment/network-info.md))
