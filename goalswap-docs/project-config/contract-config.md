# GoalSwap Contract Configuration

> Contract addresses, deployment config, and network settings for GoalSwap Arena.

## Deployed Contracts

| Contract | Network | Address | Purpose |
|----------|---------|---------|---------|
| WorldCupArenaHook | X Layer Testnet | `TBD` | Main hook — dynamic fees, match state |
| OutcomeTokenFactory | X Layer Testnet | `TBD` | Creates outcome token pairs |
| FanTokenLauncher | X Layer Testnet | `TBD` | Fan token bonding curve |
| GoalSwapTrophies | X Layer Testnet | `TBD` | Soulbound trophies (SBT) |
| BracketNFT | X Layer Testnet | `TBD` | Tournament bracket NFTs |

## Network Configuration

### X Layer Testnet
- **Chain ID:** `1952`
- **RPC:** `https://testrpc.xlayer.tech/terigon`
- **Explorer:** `https://www.okx.com/web3/explorer/xlayer-test`
- **Gas Token:** OKB (testnet — get from [faucet](https://www.okx.com/xlayer/faucet))
- **USDC:** No native USDC on testnet — use mock USDC or deploy test token

### X Layer Mainnet
- **Chain ID:** `196`
- **RPC:** `https://rpc.xlayer.tech`
- **Explorer:** `https://www.okx.com/web3/explorer/xlayer`
- **Gas Token:** OKB
- **USDC:** `0x74b7F16337b8972027F6196A17a631aC6dE26d22`

## Foundry Config

`foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
evm_version = "cancun"

[rpc_endpoints]
xlayer_testnet = "https://testrpc.xlayer.tech/terigon"
xlayer_mainnet = "https://rpc.xlayer.tech"

[etherscan]
xlayer = { key = "", chain = 1952, url = "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayerTestnet" }
```

## Hardhat Config

```javascript
module.exports = {
  networks: {
    xlayerTestnet: {
      url: "https://testrpc.xlayer.tech/terigon",
      chainId: 1952,
      accounts: [process.env.PRIVATE_KEY],
    },
    xlayerMainnet: {
      url: "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

## Deployment Order

1. **OutcomeTokenFactory** — no dependencies
2. **FanTokenLauncher** — no dependencies
3. **GoalSwapTrophies** — no dependencies
4. **WorldCupArenaHook** — depends on V4 PoolManager, references factory/trophies
5. **BracketNFT** — depends on hook for settlement

## Post-Deployment Steps

1. Set oracle address in Hook: `addOracle(<oracle_wallet>)`
2. Verify all contracts on Oklink
3. Fund oracle wallet with OKB for gas
4. Deploy test USDC token (testnet only)
5. Create initial outcome token pairs for World Cup matches
