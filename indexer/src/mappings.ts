import {
  BigInt,
  BigDecimal,
  Bytes,
  Address,
  log,
  store,
} from "@graphprotocol/graph-ts";
import {
  MatchStateUpdated as MatchStateUpdatedEvent,
  GoalScored as GoalScoredEvent,
  MatchSettled as MatchSettledEvent,
  TrophyMinted as HookTrophyMintedEvent,
  PoolRegistered as PoolRegisteredEvent,
  OracleAuthorized as OracleAuthorizedEvent,
  OracleDeauthorized as OracleDeauthorizedEvent,
  OracleUpdated as OracleUpdatedEvent,
} from "../generated/WorldCupArenaHook/WorldCupArenaHook";
import {
  MatchTokensCreated as MatchTokensCreatedEvent,
} from "../generated/OutcomeTokenFactory/OutcomeTokenFactory";
import {
  Settled as OutcomeTokenSettledEvent,
  Redeemed as RedeemedEvent,
  LosingTokensBurned as LosingTokensBurnedEvent,
  Transfer as OutcomeTokenTransferEvent,
} from "../generated/OutcomeToken/OutcomeToken";
import {
  TrophyMinted as TrophyMintedEvent,
} from "../generated/GoalSwapTrophies/GoalSwapTrophies";
import {
  TokensPurchased as TokensPurchasedEvent,
  TokensSold as TokensSoldEvent,
  V4PoolCreated as V4PoolCreatedEvent,
} from "../generated/FanToken/FanToken";
import {
  BracketMinted as BracketMintedEvent,
  BracketValidated as BracketValidatedEvent,
} from "../generated/BracketNFT/BracketNFT";
import { OutcomeTokenTemplate, FanTokenTemplate } from "../generated/templates";
import {
  Match,
  Pool,
  User,
  Trophy,
  OutcomeToken,
  FanToken,
  Bracket,
  MarketEvent,
  OracleUpdate,
  GlobalStat,
  MarketType,
} from "../generated/schema";

// ─── Constants ──────────────────────────────────────────────────────────────────

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const ONE_BI = BigInt.fromI32(1);
const BI_18 = BigInt.fromI32(10).pow(18);

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getOrCreateUser(address: Address): User {
  let id = address.toHexString();
  let user = User.load(id);
  if (user == null) {
    user = new User(id);
    user.totalVolumeUSD = ZERO_BD;
    user.totalPnL = ZERO_BD;
    user.xp = ZERO_BI;
    user.streak = 0;
    user.trophyCount = 0;
    user.firstSeenAt = ZERO_BI;
    user.lastSeenAt = ZERO_BI;
    user.swapCount = 0;
    user.matchVolumes = "{}";
    user.save();

    // Update global user count
    let global = getOrCreateGlobalStat();
    global.totalUsers += 1;
    global.save();
  }
  return user;
}

function getOrCreateGlobalStat(): GlobalStat {
  let global = GlobalStat.load("global");
  if (global == null) {
    global = new GlobalStat("global");
    global.totalVolumeUSD = ZERO_BD;
    global.totalSwaps = 0;
    global.totalUsers = 0;
    global.totalMatches = 0;
    global.totalTrophies = 0;
    global.totalBrackets = 0;
    global.xpLeaderboard = "[]";
    global.lastUpdatedAt = ZERO_BI;
    global.save();
  }
  return global;
}

function getMatchOrCreate(matchId: Bytes): Match {
  let id = matchId.toHexString();
  let match = Match.load(id);
  if (match == null) {
    match = new Match(id);
    match.homeScore = 0;
    match.awayScore = 0;
    match.minute = 0;
    match.redCards = 0;
    match.penaltyShootout = false;
    match.isFinished = false;
    match.lastGoalTimestamp = ZERO_BI;
    match.lastUpdateBlock = ZERO_BI;
    match.feeTier = 0;
    match.feeReason = "";
    match.lastOracle = null;
    match.lastUpdatedAt = ZERO_BI;
    match.status = "NS";
    match.volumeUSD = ZERO_BD;
    match.traderCount = 0;
    match.tokensCreatedAt = null;
    match.settledAt = null;
    match.save();

    let global = getOrCreateGlobalStat();
    global.totalMatches += 1;
    global.save();
  }
  return match;
}

function getPoolOrCreate(poolId: string): Pool {
  let pool = Pool.load(poolId);
  if (pool == null) {
    pool = new Pool(poolId);
    pool.match = "";
    pool.marketType = "MATCH_PREDICTION";
    pool.currency0 = Bytes.empty();
    pool.currency1 = Bytes.empty();
    pool.tickSpacing = 0;
    pool.dynamicFee = true;
    pool.isSettled = false;
    pool.volumeUSD = ZERO_BD;
    pool.swapCount = 0;
    pool.createdAtBlock = ZERO_BI;
    pool.registeredAtBlock = ZERO_BI;
    pool.save();
  }
  return pool;
}

// ─── 1. WorldCupArenaHook Handlers ──────────────────────────────────────────────

export function handleMatchStateUpdated(event: MatchStateUpdatedEvent): void {
  let match = getMatchOrCreate(event.params.matchId);

  let prevHomeScore = match.homeScore;
  let prevAwayScore = match.awayScore;

  match.homeScore = event.params.homeScore;
  match.awayScore = event.params.awayScore;
  match.minute = event.params.minute;
  match.lastOracle = event.params.oracle;
  match.lastUpdatedAt = event.params.timestamp;
  match.lastUpdateBlock = event.block.number;
  match.status = "LIV";

  // Detect if a goal was scored (for fee calculation tracking)
  let goalScored = event.params.homeScore > prevHomeScore || event.params.awayScore > prevAwayScore;
  if (goalScored) {
    match.lastGoalTimestamp = event.block.timestamp;
  }

  match.save();
}

export function handleGoalScored(event: GoalScoredEvent): void {
  let match = getMatchOrCreate(event.params.matchId);

  match.homeScore = event.params.homeScore;
  match.awayScore = event.params.awayScore;
  match.minute = event.params.minute;
  match.lastGoalTimestamp = event.params.timestamp;
  match.lastUpdateBlock = event.block.number;
  match.status = "LIV";
  match.save();

  // Create market event
  let eventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketEvent = new MarketEvent(eventId);
  marketEvent.match = match.id;
  marketEvent.eventType = "GOAL_RECORDED";
  marketEvent.minute = event.params.minute;
  marketEvent.homeScore = event.params.homeScore;
  marketEvent.awayScore = event.params.awayScore;
  marketEvent.blockNumber = event.block.number;
  marketEvent.timestamp = event.params.timestamp;
  marketEvent.txHash = event.transaction.hash;
  marketEvent.save();
}

export function handleMatchSettled(event: MatchSettledEvent): void {
  let match = getMatchOrCreate(event.params.matchId);
  match.isFinished = true;
  match.status = "FT";
  match.homeScore = event.params.homeScore;
  match.awayScore = event.params.awayScore;
  match.settledAt = event.block.timestamp;
  match.save();

  // Create market event
  let eventId = event.transaction.hash.toHexString() + "-settled";
  let marketEvent = new MarketEvent(eventId);
  marketEvent.match = match.id;
  marketEvent.eventType = "MATCH_FINISHED";
  marketEvent.minute = match.minute;
  marketEvent.homeScore = event.params.homeScore;
  marketEvent.awayScore = event.params.awayScore;
  marketEvent.blockNumber = event.block.number;
  marketEvent.timestamp = event.block.timestamp;
  marketEvent.txHash = event.transaction.hash;
  marketEvent.save();
}

export function handleHookTrophyMinted(event: HookTrophyMintedEvent): void {
  let user = getOrCreateUser(event.params.user);
  let match = getMatchOrCreate(event.params.matchId);

  // The hook emits TrophyMinted with (user, tier, matchId)
  // The actual trophy NFT is minted in GoalSwapTrophies
  user.trophyCount += 1;
  user.lastSeenAt = event.block.timestamp;
  user.save();
}

export function handlePoolRegistered(event: PoolRegisteredEvent): void {
  // poolKey is indexed (struct → keccak256 hash), so it's Bytes
  let poolId = event.params.poolKey.toHexString();
  let pool = getPoolOrCreate(poolId);

  // matchId is indexed bytes32 → also Bytes
  let match = getMatchOrCreate(event.params.matchId);
  pool.match = match.id;

  // MarketType is the 2nd param (uint8, not indexed) — decoded directly
  pool.marketType = event.params.marketType == 0
    ? "MATCH_PREDICTION"
    : event.params.marketType == 1
      ? "FAN_TOKEN"
      : "META_MARKET";

  pool.dynamicFee = true;
  pool.registeredAtBlock = event.block.number;

  // teamToken is the 4th param (address, not indexed)
  let teamToken = event.params.teamToken;
  pool.teamToken = teamToken;

  // If this is a fan token pool, spawn the template and init the FanToken entity
  if (event.params.marketType == 1) {
    // FAN_TOKEN
    FanTokenTemplate.create(teamToken);

    let ft = FanToken.load(teamToken.toHexString());
    if (ft == null) {
      ft = new FanToken(teamToken.toHexString());
      ft.teamName = "";
      ft.symbol = "";
      ft.bondingCurveProgress = 0;
      ft.totalMinted = ZERO_BI;
      ft.maxSupply = ZERO_BI;
      ft.currentPrice = ZERO_BI;
      ft.totalVolume = ZERO_BI;
      ft.jackpotBalance = ZERO_BI;
      ft.poolCreated = false;
      ft.tradeCount = 0;
      ft.holderCount = 0;
    }
    ft.match = match.id;
    ft.save();
  }

  pool.save();
}

export function handleOracleAuthorized(event: OracleAuthorizedEvent): void {
  let update = new OracleUpdate(
    event.transaction.hash.toHexString() + "-auth-" + event.params.oracle.toHexString()
  );
  update.oracle = event.params.oracle;
  update.updateType = "AUTHORIZED";
  update.targetOracle = event.params.oracle;
  update.blockNumber = event.block.number;
  update.timestamp = event.block.timestamp;
  update.txHash = event.transaction.hash;
  update.save();
}

export function handleOracleDeauthorized(event: OracleDeauthorizedEvent): void {
  let update = new OracleUpdate(
    event.transaction.hash.toHexString() + "-deauth-" + event.params.oracle.toHexString()
  );
  update.oracle = event.params.oracle;
  update.updateType = "DEAUTHORIZED";
  update.targetOracle = event.params.oracle;
  update.blockNumber = event.block.number;
  update.timestamp = event.block.timestamp;
  update.txHash = event.transaction.hash;
  update.save();
}

export function handleOracleUpdated(event: OracleUpdatedEvent): void {
  let update = new OracleUpdate(
    event.transaction.hash.toHexString() + "-updated"
  );
  update.oracle = event.params.oldOracle;
  update.updateType = "UPDATED";
  update.targetOracle = event.params.newOracle;
  update.blockNumber = event.block.number;
  update.timestamp = event.block.timestamp;
  update.txHash = event.transaction.hash;
  update.save();
}

// ─── 2. OutcomeTokenFactory Handlers ────────────────────────────────────────────

export function handleMatchTokensCreated(event: MatchTokensCreatedEvent): void {
  let match = getMatchOrCreate(event.params.matchId);
  match.homeWinToken = event.params.homeWinToken;
  match.drawToken = event.params.drawToken;
  match.awayWinToken = event.params.awayWinToken;
  match.tokensCreatedAt = event.block.timestamp;
  match.save();

  // Create OutcomeToken entities and spawn data source templates
  let outcomes: Array<Bytes> = [
    event.params.homeWinToken,
    event.params.drawToken,
    event.params.awayWinToken
  ];
  let outcomeNames: Array<string> = [
    "Home Win",
    "Draw",
    "Away Win"
  ];
  let outcomeSymbols: Array<string> = [
    "HW",
    "DRW",
    "AW"
  ];

  for (let i = 0; i < 3; i++) {
    let tokenAddr = outcomes[i];
    let token = new OutcomeToken(tokenAddr.toHexString());
    token.name = outcomeNames[i];
    token.symbol = outcomeSymbols[i];
    token.match = match.id;
    token.outcomeIndex = i;
    token.isSettled = false;
    token.isWinner = false;
    token.totalSupply = ZERO_BI;
    token.burnedSupply = ZERO_BI;
    token.holderCount = 0;
    token.save();

    // Spawn dynamic data source to track this OutcomeToken's events
    OutcomeTokenTemplate.create(tokenAddr);
  }
}

// ─── 3. OutcomeToken Handlers ───────────────────────────────────────────────────

export function handleOutcomeTokenSettled(event: OutcomeTokenSettledEvent): void {
  let tokenAddress = event.address;
  let token = OutcomeToken.load(tokenAddress.toHexString());
  if (token == null) return;

  token.isSettled = true;
  token.isWinner = event.params.isWinner;
  token.settledAt = event.block.timestamp;
  token.save();
}

export function handleRedeemed(event: RedeemedEvent): void {
  let user = getOrCreateUser(event.params.user);
  // Track PnL from redemption
  // amount represents USDC received (1:1 for winning tokens)
  user.totalPnL = user.totalPnL.plus(event.params.amount.toBigDecimal());
  user.lastSeenAt = event.block.timestamp;
  user.save();
}

export function handleLosingTokensBurned(event: LosingTokensBurnedEvent): void {
  let tokenAddress = event.address;
  let token = OutcomeToken.load(tokenAddress.toHexString());
  if (token == null) return;

  token.burnedSupply = token.burnedSupply.plus(event.params.amount);
  token.totalSupply = token.totalSupply.minus(event.params.amount);
  token.save();
}

export function handleOutcomeTokenTransfer(event: OutcomeTokenTransferEvent): void {
  let tokenAddress = event.address;
  let token = OutcomeToken.load(tokenAddress.toHexString());
  if (token == null) return;

  // Update total supply
  let from = event.params.from;
  let to = event.params.to;
  let value = event.params.value;

  // Mint
  if (from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    token.totalSupply = token.totalSupply.plus(value);
  }

  // Burn
  if (to.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    token.totalSupply = token.totalSupply.minus(value);
    token.burnedSupply = token.burnedSupply.plus(value);
  }

  token.save();

  // Create/update users on their first transfer
  if (!from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    let fromUser = getOrCreateUser(from);
    fromUser.lastSeenAt = event.block.timestamp;
    fromUser.save();
  }
  if (!to.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    let toUser = getOrCreateUser(to);
    toUser.firstSeenAt = toUser.firstSeenAt.equals(ZERO_BI)
      ? event.block.timestamp
      : toUser.firstSeenAt;
    toUser.lastSeenAt = event.block.timestamp;
    toUser.save();
  }
}

// ─── 4. GoalSwapTrophies Handlers ───────────────────────────────────────────────

export function handleTrophyMinted(event: TrophyMintedEvent): void {
  let user = getOrCreateUser(event.params.user);

  let trophyId = event.params.tokenId.toString();
  let trophy = new Trophy(trophyId);
  trophy.owner = user.id;
  trophy.tier = event.params.tier.toI32();
  trophy.matchId = event.params.matchId;

  // Set tier name based on tier number
  let tier = event.params.tier.toI32();
  if (tier == 1) {
    trophy.tierName = "Lightning Reflex";
  } else if (tier == 2) {
    trophy.tierName = "Bronze Nostradamus";
  } else if (tier == 3) {
    trophy.tierName = "Silver Prophet";
  } else if (tier == 4) {
    trophy.tierName = "Golden Ball Trader";
  } else if (tier == 5) {
    trophy.tierName = "Arena Legend";
  } else {
    trophy.tierName = "Unknown Tier";
  }

  trophy.blockNumber = event.block.number;
  trophy.timestamp = event.block.timestamp;
  trophy.txHash = event.transaction.hash;

  // Link to match if match exists
  let matchId = event.params.matchId.toHexString();
  let match = Match.load(matchId);
  if (match != null) {
    trophy.match = matchId;
  }

  trophy.save();

  // Update user trophy count
  user.trophyCount += 1;
  user.lastSeenAt = event.block.timestamp;
  user.save();

  // Update global
  let global = getOrCreateGlobalStat();
  global.totalTrophies += 1;
  global.save();
}

// ─── 5. FanToken Handlers ───────────────────────────────────────────────────────

export function handleTokensPurchased(event: TokensPurchasedEvent): void {
  let tokenAddress = event.address;
  let fanToken = FanToken.load(tokenAddress.toHexString());
  if (fanToken == null) {
    fanToken = new FanToken(tokenAddress.toHexString());
    fanToken.teamName = "";
    fanToken.symbol = "";
    fanToken.match = "";
    fanToken.bondingCurveProgress = 0;
    fanToken.totalMinted = ZERO_BI;
    fanToken.maxSupply = ZERO_BI;
    fanToken.currentPrice = ZERO_BI;
    fanToken.totalVolume = ZERO_BI;
    fanToken.jackpotBalance = ZERO_BI;
    fanToken.poolCreated = false;
    fanToken.tradeCount = 0;
    fanToken.holderCount = 0;
  }

  fanToken.currentPrice = event.params.price;
  fanToken.totalMinted = fanToken.totalMinted.plus(event.params.tokenAmount);
  fanToken.totalVolume = fanToken.totalVolume.plus(event.params.usdcAmount);
  fanToken.tradeCount += 1;
  fanToken.save();

  // Track user
  let user = getOrCreateUser(event.params.buyer);
  user.totalVolumeUSD = user.totalVolumeUSD.plus(event.params.usdcAmount.toBigDecimal());
  user.lastSeenAt = event.block.timestamp;
  user.save();

  // Update global
  let global = getOrCreateGlobalStat();
  global.totalVolumeUSD = global.totalVolumeUSD.plus(event.params.usdcAmount.toBigDecimal());
  global.totalSwaps += 1;
  global.save();
}

export function handleTokensSold(event: TokensSoldEvent): void {
  let tokenAddress = event.address;
  let fanToken = FanToken.load(tokenAddress.toHexString());
  if (fanToken == null) return;

  fanToken.currentPrice = event.params.price;
  fanToken.totalMinted = fanToken.totalMinted.minus(event.params.tokenAmount);
  fanToken.totalVolume = fanToken.totalVolume.plus(event.params.usdcReturn);
  fanToken.tradeCount += 1;
  fanToken.save();

  // Track user
  let user = getOrCreateUser(event.params.seller);
  user.totalVolumeUSD = user.totalVolumeUSD.plus(event.params.usdcReturn.toBigDecimal());
  user.totalPnL = user.totalPnL.plus(event.params.usdcReturn.toBigDecimal());
  user.lastSeenAt = event.block.timestamp;
  user.save();

  // Update global
  let global = getOrCreateGlobalStat();
  global.totalVolumeUSD = global.totalVolumeUSD.plus(event.params.usdcReturn.toBigDecimal());
  global.totalSwaps += 1;
  global.save();
}

export function handleV4PoolCreated(event: V4PoolCreatedEvent): void {
  let tokenAddress = event.address;
  let fanToken = FanToken.load(tokenAddress.toHexString());
  if (fanToken == null) return;

  fanToken.poolCreated = true;
  fanToken.save();
}

// ─── 6. BracketNFT Handlers ─────────────────────────────────────────────────────

export function handleBracketMinted(event: BracketMintedEvent): void {
  let bracketId = event.params.tokenId.toString();
  let bracket = new Bracket(bracketId);

  bracket.owner = event.params.user;
  bracket.tokenId = event.params.tokenId;
  bracket.predictedPath = event.params.predictedPath;
  bracket.predictionHash = Bytes.empty(); // Computed on-chain, not emitted
  bracket.stakeAmount = event.params.stakeAmount;
  bracket.isValidated = false;
  bracket.isCorrect = false;
  bracket.matchCount = event.params.matchCount.toI32();
  bracket.createdAt = event.block.timestamp;
  bracket.blockNumber = event.block.number;
  bracket.txHash = event.transaction.hash;
  bracket.save();

  // Track user
  let user = getOrCreateUser(event.params.user);
  user.lastSeenAt = event.block.timestamp;
  user.save();

  // Update global
  let global = getOrCreateGlobalStat();
  global.totalBrackets += 1;
  global.save();
}

export function handleBracketValidated(event: BracketValidatedEvent): void {
  let bracketId = event.params.tokenId.toString();
  let bracket = Bracket.load(bracketId);
  if (bracket == null) return;

  bracket.isValidated = true;
  bracket.isCorrect = event.params.isCorrect;
  bracket.save();
}
