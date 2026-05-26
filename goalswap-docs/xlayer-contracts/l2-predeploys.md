# X Layer L2 Predeployed Contracts

> System contracts predeployed on X Layer at deterministic addresses.

## L2 Predeploys

| Name | Address | Purpose |
|------|---------|---------|
| L2CrossDomainMessenger | `0x4200000000000000000000000000000000000007` | L2 side cross-domain message passing |
| L2ToL1MessagePasser | `0x4200000000000000000000000000000000000016` | Stores L2→L1 messages (customGasToken support) |
| L1Block | `0x4200000000000000000000000000000000000015` | Latest known L1 block info |
| GasPriceOracle | `0x420000000000000000000000000000000000000F` | L1 fee calculation & offline gas estimation |
| SequencerFeeVault | `0x4200000000000000000000000000000000000011` | Collects sequencer fees |
| BaseFeeVault | `0x4200000000000000000000000000000000000019` | Collects L2 base fees |
| L1FeeVault | `0x420000000000000000000000000000000000001a` | Collects L1 fee portion |
| ProxyAdmin | `0x4200000000000000000000000000000000000018` | Owner of all predeploy proxies |

## L1 Contract Addresses

### Mainnet (Ethereum)

| Contract | Address |
|----------|---------|
| SystemConfig | `0x5065809Af286321a05fBF85713B5D5De7C8f0433` |
| L1CrossDomainMessenger | `0xF94B553F3602a03931e5D10CaB343C0968D793e3` |
| OptimismPortal | `0x64057ad1DdAc804d0D26A7275b193D9DACa19993` |
| DisputeGameFactory | `0x9D4c8FAEadDdDeeE1Ed0c92dAbAD815c2484f675` |

### Testnet (Sepolia)

| Contract | Address |
|----------|---------|
| SystemConfig | `0x06BE4b4A9a28fF8EED6da09447Bc5DAA676efac3` |
| L1CrossDomainMessenger | `0xEf40d5432D37B3935a11710c73F395e2c9921295` |
| OptimismPortal | `0x1529a34331D7d85C8868Fc88EC730aE56d3Ec9c0` |
| DisputeGameFactory | `0x80388586ab4580936BCb409Cc2dC6BC0221e1B6F` |

## For GoalSwap

These contracts are important if you need:
- **GasPriceOracle** — estimating L1 data fees (not needed for basic trading)
- **L1Block** — accessing latest L1 block info for merge-dependent logic
- **L2CrossDomainMessenger** — sending messages back to L1 (for settlement finality)
