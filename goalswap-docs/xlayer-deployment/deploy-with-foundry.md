# Deploying GoalSwap Contracts with Foundry

> X Layer is EVM-equivalent — Foundry works out of the box.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) installed
- Wallet funded with testnet OKB (see [faucet.md](./faucet.md))
- X Layer testnet RPC: `https://testrpc.xlayer.tech/terigon`

## Foundry Setup

```bash
# Init project (if not already done)
forge init contracts
cd contracts

# Install Uniswap V4 periphery
forge install Uniswap/v4-periphery --no-commit

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Compile

```bash
forge build
```

## Deploy to X Layer Testnet

```bash
forge create \
  --rpc-url https://testrpc.xlayer.tech/terigon \
  --private-key YOUR_PRIVATE_KEY \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --constructor-args <args>
```

### Using a .env file

Create `.env`:
```bash
XLAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon
XLAYER_MAINNET_RPC=https://rpc.xlayer.tech
PRIVATE_KEY=0x...
```

Deploy:
```bash
source .env
forge create \
  --rpc-url $XLAYER_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --constructor-args <args>
```

## Deploy to X Layer Mainnet

```bash
forge create \
  --rpc-url https://rpc.xlayer.tech \
  --private-key YOUR_PRIVATE_KEY \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --constructor-args <args>
```

## Verify Contracts

> See [verify-contracts.md](./verify-contracts.md) for detailed verification guide.

```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayer
```

## Interact with Deployed Contracts

```bash
# Call a read function
cast call <CONTRACT_ADDRESS> "matchStates(bytes32)(uint8,uint8,uint16)" <MATCH_ID> \
  --rpc-url $XLAYER_TESTNET_RPC

# Send a transaction
cast send <CONTRACT_ADDRESS> "updateMatchState(bytes32,uint8,uint8,uint16,uint8,bool,uint256,bytes)" \
  <ARGS> --rpc-url $XLAYER_TESTNET_RPC --private-key $PRIVATE_KEY
```

## Key Differences from Ethereum

- **Gas token:** OKB (not ETH)
- **Block time:** ~1 second (vs ~12s on Ethereum L1)
- **Gas costs:** Negligible (fractions of a cent)
- **Chain ID:** 1952 (testnet), 196 (mainnet)
