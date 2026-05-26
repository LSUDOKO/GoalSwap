# Getting Testnet OKB for X Layer

> GoalSwap contracts need OKB for gas on X Layer testnet.

## Official Faucet

The X Layer testnet faucet provides **0.2 OKB per day** per user.

**URL:** [https://www.okx.com/xlayer/faucet](https://www.okx.com/xlayer/faucet)

### Steps

1. Go to [https://www.okx.com/xlayer/faucet](https://www.okx.com/xlayer/faucet)
2. Connect your wallet (MetaMask, OKX Wallet, etc.)
3. Click "Get 0.2 OKB" button
4. OKB is sent directly to your wallet on X Layer testnet

### Limits

- **Max:** 0.2 OKB per day per address
- **Network:** X Layer testnet (Chain ID: 1952)

## Bridging from Sepolia

If you need more testnet OKB, you can bridge from Ethereum Sepolia:

1. Get SepoliaETH from a faucet
2. Use [X Layer Bridge](https://www.okx.com/xlayer/bridge-test) to bridge to X Layer testnet
3. Swap SepoliaETH for OKB via a DEX on X Layer testnet

## For GoalSwap

The oracle wallet and deployer wallet both need OKB for gas:

```
Deployer Wallet: Need ~0.1 OKB for contract deployment
Oracle Wallet: Need ~0.05 OKB for updateMatchState() calls
```
