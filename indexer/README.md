# GoalSwap Arena — The Graph Subgraph

Indexes all on-chain events from the GoalSwap Arena smart contracts:
- **WorldCupArenaHook** — match state updates, goals, settlements, pool registrations, trophy mints, oracle management
- **OutcomeTokenFactory** — match token creation
- **OutcomeToken** — token settlement, redemption, transfers
- **GoalSwapTrophies** — SBT trophy minting
- **FanToken** — bonding curve purchases/sales, V4 pool creation
- **BracketNFT** — bracket minting and validation

## Entities

| Entity | Description |
|--------|-------------|
| `Match` | World Cup match with live state, scores, volume, associated tokens |
| `Pool` | Uniswap V4 pool linked to a match/market |
| `User` | Wallet with aggregated volume, PnL, XP, trophies |
| `Trophy` | Soulbound trophy NFT (5 tiers) |
| `OutcomeToken` | Match prediction token (Home Win / Draw / Away Win) |
| `FanToken` | Team fan token with bonding curve state |
| `Bracket` | Bracket prediction NFT |
| `MarketEvent` | On-chain match events (goals scored, match finished) |
| `OracleUpdate` | Oracle authorization/update history |
| `GlobalStat` | Singleton with aggregate platform stats |

## Setup

### 1. Generate ABI files

The `abis/` directory needs ABI JSON files for each contract. Generate them from the Foundry project:

```bash
# From the contracts directory
cd ../contracts
forge build

# Copy ABIs to indexer/abis/
cp out/WorldCupArenaHook.sol/WorldCupArenaHook.json ../indexer/abis/
cp out/OutcomeTokenFactory.sol/OutcomeTokenFactory.json ../indexer/abis/
cp out/OutcomeToken.sol/OutcomeToken.json ../indexer/abis/
cp out/GoalSwapTrophies.sol/GoalSwapTrophies.json ../indexer/abis/
cp out/FanToken.sol/FanToken.json ../indexer/abis/
cp out/BracketNFT.sol/BracketNFT.json ../indexer/abis/

# Also need ERC20 ABI for Transfer events
cp out/OutcomeToken.sol/OutcomeToken.json ../indexer/abis/ERC20.json
```

### 2. Install dependencies

```bash
npm install
```

### 3. Update contract addresses

Edit `subgraph.yaml` and replace the placeholder `0x0000...` addresses with the actual deployed contract addresses for each data source's `source.address`.

### 4. Set start block

Replace `startBlock: 0` with the block number where each contract was deployed. This speeds up indexing significantly.

### 5. Generate types and build

```bash
npm run codegen   # Generate AssemblyScript types from schema + ABIs
npm run build     # Compile the subgraph to WASM
```

### 6. Deploy

```bash
# To The Graph Studio (hosted service)
npm run deploy

# To a local graph-node
npm run create-local
npm run deploy-local
```

## Network

Default network is `xlayer` (Chain ID 196). For testnet, update `subgraph.yaml`:

```yaml
network: xlayer-testnet
```

## Schema Notes

### Populated Fields

| Entity | Fully Populated | Notes |
|--------|----------------|-------|
| Match | ❌ Partial | See below |
| Pool | ❌ Partial | Only match link, marketType, dynamicFee, registeredAtBlock |
| User | ✅ Full | All fields updated |
| Trophy | ✅ Full | Via GoalSwapTrophies.TrophyMinted |
| OutcomeToken | ✅ Full | Via template + all event handlers |
| FanToken | ❌ Partial | See below |
| Bracket | ✅ Full | All fields populated |
| MarketEvent | ✅ Full | Goals + match finish events |
| OracleUpdate | ✅ Full | Auth/deauth/update events |
| GlobalStat | ✅ Full | Singleton with aggregate data |

### Known Limitations

1. **`Pool.currency0`, `.currency1`, `.tickSpacing` are nullable** — The `PoolRegistered` event's `poolKey` parameter is `indexed` in Solidity, which keccak256-hashes the struct. Individual struct fields cannot be decoded. To populate these, add a separate PoolManager data source that listens to `Initialize` events.

2. **`Match.homeTeam`, `awayTeam` never populated** — The `MatchTokensCreated` event in `OutcomeTokenFactory` doesn't emit team name strings (the factory receives them as constructor params but the event only emits addresses). To fix: add `string homeTeam, string awayTeam` to the `MatchTokensCreated` event in `OutcomeTokenFactory.sol`.

3. **`Match.feeTier`, `feeReason` never populated** — The `MatchStateUpdated` event doesn't include the dynamic fee value. The fee is calculated in `beforeSwap` but not emitted. To fix: add `uint24 fee, string reason` to `MatchStateUpdated` event in `WorldCupArenaHook.sol`.

4. **`FanToken` template requires a factory event to spawn** — FanToken contracts are deployed per-team but there's no factory contract emitting a `FanTokenCreated` event. The FanToken template is defined but never instantiated. To fix any of the following:
   - Create a `FanTokenLauncher` contract with a `FanTokenCreated(address token, string teamName, bytes32 matchId)` event
   - **OR** add `address teamToken` to the `PoolRegistered` event in `WorldCupArenaHook.sol` (simpler)
   - **OR** deploy all FanToken addresses as static data sources in `subgraph.yaml`

5. **`Match.volumeUSD`, `Match.traderCount`, `Pool.volumeUSD`, `Pool.swapCount` never updated** — These require tracking swaps through a PoolManager data source. To populate, add a `PoolManager` data source listening to `Swap` events.

6. **Swap entities are not indexed** — Requires a PoolManager data source (Uniswap V4). Swap volume is tracked through OutcomeToken transfers and FanToken purchase/sale events in `GlobalStat.totalSwaps`.

7. **Missing events** — These admin events are not indexed (safe to ignore for MVP):
   - `WorldCupArenaHook.TrophyContractUpdated`
   - `GoalSwapTrophies.TierUpdated`
   - `BracketNFT.TournamentSet`

### Template Architecture

The subgraph uses **dynamic data source templates** for contracts deployed at multiple addresses:

- **`OutcomeTokenTemplate`** — Spawned by `handleMatchTokensCreated` for each of the 3 outcome tokens (Home Win, Draw, Away Win). See `src/mappings.ts` line 172 (`OutcomeTokenTemplate.create(tokenAddr)`).
- **`FanTokenTemplate`** — Defined but NOT yet instantiated (see limitation #4 above).

When you set up contract deployment, ensure the ABI JSON files for all 6 contracts exist in `abis/`. The `graph codegen` command will generate the template classes in `generated/templates/`.
