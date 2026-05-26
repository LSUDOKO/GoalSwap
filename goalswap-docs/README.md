# GoalSwap Arena — Documentation & Skills Reference

> Consolidated project documentation from X Layer developer docs, OKX Onchain OS skills, and GoalSwap project specs.

## 📁 Structure

```
goalswap-docs/
├── README.md                              # This file
├── xlayer-deployment/
│   ├── network-info.md                    # Chain IDs, RPC URLs, block explorers
│   ├── faucet.md                          # Getting testnet OKB tokens
│   ├── deploy-with-foundry.md             # Foundry deployment guide
│   ├── deploy-with-hardhat.md             # Hardhat deployment guide
│   ├── verify-contracts.md                # Contract verification (Foundry/Oklink)
│   └── gas-station.md                     # Gas price estimation
├── xlayer-contracts/
│   ├── token-addresses.md                 # USDC, WETH, USDT, WOKB addresses
│   ├── l2-predeploys.md                   # L2 predeployed contracts
│   └── safe-wallet.md                     # Safe multi-sig on X Layer
├── uniswap-integration/
│   ├── overview.md                        # GoalSwap + Uniswap V4 architecture
│   ├── trading-api.md                     # 3-step swap flow (check → quote → swap)
│   ├── universal-router.md                # V4 addresses, commands, SDK patterns
│   ├── frontend-setup.md                  # Next.js proxy, Buffer polyfill, swap hook
│   └── permit2-approvals.md               # Permit2 approval management
├── oracle-integration/
│   ├── chainlink-price-feeds.md           # Price feed addresses + usage
│   └── feed-registry.md                   # Feed registry setup
├── realtime-data/
│   ├── websocket-endpoints.md             # WSS RPC endpoints + eth_subscribe
│   └── flashblocks.md                     # 200ms preconfirmations
├── skills/
│   ├── agentic-wallet.md                  # OKX Agentic Wallet (send, balance, login)
│   ├── dex-swap.md                        # DEX Swap on X Layer
│   ├── dex-bridge.md                      # Cross-chain bridging to X Layer
│   ├── onchain-gateway.md                 # Transaction broadcasting, gas estimation
│   ├── security.md                        # Transaction & token security scanning
│   └── wallet-portfolio.md               # Wallet balance checking
└── project-config/
    ├── env-template.md                     # Full .env template from about.md
    └── contract-config.md                  # Contract addresses & deployment config
```

## 🔗 Quick Links

| Section | Description |
|---------|-------------|
| [Network Info](./xlayer-deployment/network-info.md) | X Layer mainnet/testnet RPC, chain IDs |
| [USDC Addresses](./xlayer-contracts/token-addresses.md) | USDC/USDC.e/WETH on X Layer |
| [Uniswap Overview](./uniswap-integration/overview.md) | V4 hooks + Trading API integration |
| [Trading API](./uniswap-integration/trading-api.md) | 3-step swap flow for frontend |
| [Universal Router](./uniswap-integration/universal-router.md) | Smart contract swap commands |
| [Frontend Setup](./uniswap-integration/frontend-setup.md) | Next.js proxy, swap hook, wagmi cfg |
| [Chainlink Feeds](./oracle-integration/chainlink-price-feeds.md) | Price feed addresses for swaps |
| [WebSocket](./realtime-data/websocket-endpoints.md) | Real-time data via eth_subscribe |
| [Flashblocks](./realtime-data/flashblocks.md) | 200ms preconfirmations |
| [Agentic Wallet](./skills/agentic-wallet.md) | OKX wallet operations |
| [DEX Swap](./skills/dex-swap.md) | Token swaps on X Layer |
| [DEX Bridge](./skills/dex-bridge.md) | Bridge assets to/from X Layer |
| [Security](./skills/security.md) | Transaction/token safety scanning |
| [ENV Template](./project-config/env-template.md) | Environment variables |
