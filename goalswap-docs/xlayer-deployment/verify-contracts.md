# Verifying Contracts on X Layer

> Use Oklink (OKX's block explorer) to verify contracts on X Layer.

## Prerequisites

- Contract deployed on X Layer (mainnet or testnet)
- Wait **at least 1 minute** after deployment before verifying

## Verify with Foundry

### Get Chain Short Name

Find the `chainShortName` from [Oklink supported chains](https://www.oklink.com/docs/en/#quickstart-guide-supported-chains).

| Network | chainShortName |
|---------|---------------|
| X Layer Mainnet | `xlayer` |
| X Layer Testnet | `xlayerTestnet` |

### Verify Command

```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayerTestnet \
  --constructor-args $(cast abi-encode "constructor(...)" <ARGS>) \
  --watch
```

For mainnet:
```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/WorldCupArenaHook.sol:WorldCupArenaHook \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayer \
  --constructor-args $(cast abi-encode "constructor(...)" <ARGS>) \
  --watch
```

### Check Verification Status

```bash
forge verify-check --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayerTestnet \
  <GUID>
```

## Verify with Hardhat

Add to `hardhat.config.js`:
```javascript
module.exports = {
  networks: {
    xlayer: {
      url: "https://testrpc.xlayer.tech/terigon",
      accounts: [privateKey],
    },
  },
  etherscan: {
    apiKey: {
      xlayer: "YOUR_OKLINK_API_KEY",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/xlayerTestnet",
          browserURL: "https://www.okx.com/web3/explorer/xlayer-test",
        },
      },
    ],
  },
};
```

Then run:
```bash
npx hardhat verify --network xlayer <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Block Explorers

- **Mainnet:** [https://www.okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer)
- **Testnet:** [https://www.okx.com/web3/explorer/xlayer-test](https://www.okx.com/web3/explorer/xlayer-test)
