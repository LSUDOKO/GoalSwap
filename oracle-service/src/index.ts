#!/usr/bin/env tsx
/**
 * GoalSwap Arena — Oracle Service
 *
 * Main entry point. Orchestrates the full data pipeline:
 *
 *   API-Football → DataFetcher → StateValidator → BlockchainWriter (on-chain)
 *                                                      ├── RedisCache (caching)
 *                                                      ├── WebSocket (broadcast)
 *                                                      └── Webhook (notifications)
 *
 * Run: tsx src/index.ts
 * Env: See .env.example for required variables.
 */

import { config, validateConfig } from "./config.js";
import { DataFetcher } from "./DataFetcher.js";
import { MultiSportFetcher } from "./MultiSportFetcher.js";
import { StateValidator } from "./StateValidator.js";
import { BlockchainWriter } from "./BlockchainWriter.js";
import { RedisCache } from "./RedisCache.js";
import { WebSocketServer } from "./websocket-server.js";
import { WebhookServer } from "./webhook-server.js";
import { XBot } from "./XBot.js";
import { getFeeTier } from "./fees.js";
import { keccak256, stringToHex } from "viem";
import { ChangeType, ALL_SPORTS } from "./types.js";
import type { MatchState, StateChange, MatchUpdate, MatchMetadata, Sport } from "./types.js";

console.log(`
╔══════════════════════════════════════════════════════════╗
║              GoalSwap Arena — Oracle Service             ║
║  Real-data pipeline: API-Football → Hook → WS → Frontend ║
╚══════════════════════════════════════════════════════════╝
`);

// ── Validate Configuration ──
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.warn("⚠️  Configuration warnings:");
  configErrors.forEach((err) => console.warn(`   • ${err}`));
  console.warn("   Some features will be in dry-run mode.\n");
}

// ── Initialize Components ──
const dataFetcher = new DataFetcher();
const multiSportFetcher = new MultiSportFetcher();
const stateValidator = new StateValidator();
const blockchainWriter = new BlockchainWriter();
const redisCache = new RedisCache();
const webhookServer = new WebhookServer();

// On Render, both HTTP (Express) and WebSocket (Socket.IO) must share the same PORT.
// WebSocketServer receives the webhook server's HTTP server to avoid port conflicts.
const wsServer = new WebSocketServer(webhookServer.getHttpServer());

const xBot = new XBot();

// Wire dependencies
webhookServer.setDependencies(wsServer, redisCache, stateValidator, multiSportFetcher);

// ── App State ──
let isRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let startupTime = Date.now();

/**
 * Main poll cycle:
 * 1. Fetch live matches from ALL sports via MultiSportFetcher + legacy DataFetcher
 * 2. Validate state changes
 * 3. For each change: write to blockchain, cache in Redis, broadcast via WS
 */
async function pollCycle(): Promise<void> {
  if (!isRunning) return;

  try {
    // Step 1: Fetch from ALL sports in parallel
    const [multiResult, legacyResult] = await Promise.allSettled([
      multiSportFetcher.fetchAllSports(),
      dataFetcher.fetchLiveMatches(),
    ]);

    let matches: MatchUpdate[] = [];
    const metadata = new Map<string, MatchMetadata>();

    if (multiResult.status === "fulfilled") {
      matches.push(...multiResult.value.matches);
      for (const [key, meta] of multiResult.value.metadata) {
        metadata.set(key, meta);
      }
    }
    if (legacyResult.status === "fulfilled") {
      matches.push(...legacyResult.value.matches);
      for (const [key, meta] of legacyResult.value.metadata) {
        metadata.set(key, meta);
      }
    }

    if (matches.length === 0) {
      const cachedCount = stateValidator.getAllMatchIds().length;
      console.log(`[Oracle] No live matches found (active: ${cachedCount} cached)`);
      return;
    }

    console.log(`[Oracle] Fetched ${matches.length} live matches across all sports (${allSportsSummary(matches)})`);

    // Step 2: Validate state changes
    const changes = stateValidator.validateUpdates(matches);
    const meaningfulChanges = changes.filter((c) => c.hasChanged);

    if (meaningfulChanges.length > 0) {
      console.log(`[Oracle] ${meaningfulChanges.length} state changes detected:`);
      for (const change of meaningfulChanges) {
        console.log(`   • [${change.changeType}] ${change.description}`);
      }
    }

    // Step 3: Process each change
    for (const change of meaningfulChanges) {
      const meta = Array.from(metadata.values()).find((m) => m.matchId === change.matchId);

      await redisCache.setMatchState(change.matchId, change.newState);
      if (meta) {
        await redisCache.setMatchMetadata(change.matchId, meta);
      }

      _broadcastWsEvent(change, meta?.homeTeam ?? "Unknown", meta?.awayTeam ?? "Unknown", meta?.sport);

      // XBot: post match updates to X/Twitter
      xBot.onStateChange(change, meta).catch(() => {});

      blockchainWriter.queueUpdate(
        change.matchId,
        change.previousState,
        change.newState,
      ).then((log) => {
        console.log(`[Oracle] ✅ On-chain update: match=${change.matchId.slice(0, 10)}... tx=${log.txHash.slice(0, 10)}...`);
        redisCache.incrementTxCount().catch(() => {});
      }).catch((err) => {
        console.error(`[Oracle] ❌ On-chain update failed:`, err.message);
        redisCache.incrementErrorCount().catch(() => {});
      });
    }

    // Periodic summary tweet + mention check
    xBot.postSummary().catch(() => {});
    xBot.checkMentions().catch(() => {});

    printStats();
  } catch (err) {
    console.error("[Oracle] Poll cycle failed:", (err as Error).message);
  }
}

/**
 * Broadcast WebSocket events for a state change.
 */
function _broadcastWsEvent(
  change: StateChange,
  homeTeam: string,
  awayTeam: string,
  sport?: string,
): void {
  const matchId = change.matchId;
  const state = change.newState;
  const prev = change.previousState;

  switch (change.changeType) {
    case ChangeType.GOAL:
      wsServer.emitGoalScored({
        matchId,
        sport,
        homeTeam,
        awayTeam,
        team: state.homeScore > prev.homeScore ? homeTeam : awayTeam,
        scorer: "Unknown",
        minute: state.minute,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        newFee: getFeeTier(state),
        priceImpact: "+25%",
      });
      break;

    case ChangeType.SETTLEMENT:
      wsServer.emitMatchSettled({
        matchId,
        homeTeam,
        awayTeam,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        winner: state.homeScore > state.awayScore ? "home" : state.awayScore > state.homeScore ? "away" : "draw",
        settlementTxHash: "pending",
        sport,
      });
      break;

    case ChangeType.RED_CARD:
    case ChangeType.PENALTY_SHOOTOUT:
    case ChangeType.MINUTE_ADVANCE:
    case ChangeType.STATUS_CHANGE:
      wsServer.emitFeeChanged({
        matchId,
        oldFee: getFeeTier(prev),
        newFee: getFeeTier(state),
        reason: change.description,
      });
      wsServer.emitMatchUpdate(matchId, {
        matchId,
        sport,
        homeTeam,
        awayTeam,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        minute: state.minute,
        status: state.isFinished ? "FT" : "LIV",
        feeTier: getFeeTier(state),
        feeReason: change.description,
      });
      break;

    default:
      wsServer.emitMatchUpdate(matchId, {
        matchId,
        sport,
        homeTeam,
        awayTeam,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        minute: state.minute,
        status: state.isFinished ? "FT" : "LIV",
        feeTier: getFeeTier(state),
        feeReason: "Normal play",
      });
  }
}

/** Helper: count matches per sport for logging */
function allSportsSummary(matches: { sport: string }[]): string {
  const counts: Record<string, number> = {};
  for (const m of matches) counts[m.sport] = (counts[m.sport] ?? 0) + 1;
  return Object.entries(counts).map(([s, c]) => `${s}:${c}`).join(', ');
}

/**
 * Print oracle statistics periodically.
 */
let lastStatsPrinted = 0;
function printStats(): void {
  const now = Date.now();
  if (now - lastStatsPrinted < 60_000) return;
  lastStatsPrinted = now;

  const uptime = Math.floor((now - startupTime) / 1000);
  const wsStats = wsServer.getConnectionStats();
  const cachedMatches = stateValidator.getAllMatchIds().length;
  const apiStats = multiSportFetcher.getApiStats();

  // Multi-sport API stats from multiSportFetcher (13 sports)
  const msApiStats = multiSportFetcher.getApiStats();
  const sportEmojis: Record<string, string> = { football:'⚽', basketball:'🏀', nba:'🏀', afl:'🏉', baseball:'⚾', formula1:'🏎️', handball:'🤾', hockey:'🏒', mma:'🥊', 'american-football':'🏈', rugby:'🏉', volleyball:'🏐', golf:'⛳' };
  const calls = msApiStats.apiCallsToday as Record<string, number>;
  const limits = msApiStats.dailyLimits as Record<string, number>;
  const apiLines = Object.keys(sportEmojis).map(s => `${calls[s] ?? 0}/${limits[s] ?? 100}${sportEmojis[s]}`).join(' ');

  console.log(`
╔══ Oracle Status ═══════════════════════════════════════════════╗
║  Uptime:        ${String(uptime).padEnd(45)}║
║  Cached Matches: ${String(cachedMatches).padEnd(44)}║
║  WS Connections: ${String(wsStats.totalConnections).padEnd(44)}║
║  API Calls:      ${apiLines.padEnd(45)}║
║  Rate Limited:   ${Object.values(apiStats.rateLimited).some(Boolean) ? '⛔ YES' : '✅ No'.padEnd(44)}║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

// ── Signal Handling ──
async function shutdown(): Promise<void> {
  console.log("\n[Oracle] Shutting down...");
  isRunning = false;
  if (pollInterval) clearInterval(pollInterval);
  await wsServer.stop();
  await webhookServer.stop();
  await redisCache.shutdown();
  console.log("[Oracle] Shutdown complete.");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/**
 * Seed demo data from historical WC 2022 fixtures.
 * Uses hardcoded data to avoid API rate limits during demo.
 * Real data will replace this when live WC 2026 matches start.
 */
async function seedDemoData(): Promise<void> {
  if (stateValidator.getAllMatchIds().length > 0) return;

  // World Cup 2026 nations (48-team tournament — 12 groups of 4)
  // Simulated pre-tournament friendlies and qualifiers since WC starts June 8
  const DEMO_FIXTURES = [
    { id: 855736, home: "Brazil", away: "Argentina", homeScore: 2, awayScore: 1, homeId: 1032, awayId: 1065 },
    { id: 855735, home: "France", away: "England", homeScore: 3, awayScore: 1, homeId: 1027, awayId: 1144 },
    { id: 855734, home: "Germany", away: "Spain", homeScore: 2, awayScore: 2, homeId: 1055, awayId: 1031 },
    { id: 874646, home: "USA", away: "Mexico", homeScore: 1, awayScore: 0, homeId: 1067, awayId: 1059 },
    { id: 874649, home: "Argentina", away: "Uruguay", homeScore: 3, awayScore: 0, homeId: 1029, awayId: 1085 },
    { id: 874650, home: "Portugal", away: "Netherlands", homeScore: 1, awayScore: 1, homeId: 1040, awayId: 1060 },
    { id: 874653, home: "Italy", away: "Croatia", homeScore: 2, awayScore: 1, homeId: 1056, awayId: 1049 },
    { id: 874654, home: "Belgium", away: "Morocco", homeScore: 1, awayScore: 2, homeId: 1025, awayId: 1043 },
    { id: 874655, home: "Japan", away: "South Korea", homeScore: 1, awayScore: 0, homeId: 1054, awayId: 1033 },
    { id: 874656, home: "Senegal", away: "Cameroon", homeScore: 2, awayScore: 2, homeId: 1051, awayId: 1082 },
    { id: 874657, home: "Colombia", away: "Ecuador", homeScore: 1, awayScore: 0, homeId: 1090, awayId: 1091 },
    { id: 874658, home: "Nigeria", away: "Ghana", homeScore: 2, awayScore: 0, homeId: 1092, awayId: 1093 },
    { id: 874659, home: "Switzerland", away: "Denmark", homeScore: 0, awayScore: 0, homeId: 1094, awayId: 1095 },
    { id: 874660, home: "Australia", away: "Iran", homeScore: 1, awayScore: 1, homeId: 1096, awayId: 1097 },
    { id: 874661, home: "Poland", away: "Sweden", homeScore: 2, awayScore: 1, homeId: 1098, awayId: 1099 },
  ];

  console.log(`[Oracle] Seeding ${DEMO_FIXTURES.length} demo matches (WC 2026 friendlies)...`);

  for (const fixture of DEMO_FIXTURES) {
    const matchId = keccak256(
      stringToHex(`worldcup-${fixture.id}-${fixture.homeId}-${fixture.awayId}`),
    );

    const state: MatchState = {
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      minute: 90,
      redCards: 0,
      penaltyShootout: false,
      isFinished: true,
      lastGoalTimestamp: Math.floor(Date.now() / 1000) - 86_400_000,
      lastUpdateBlock: 0,
    };

    const matchKey = `${fixture.home.slice(0, 3).toLowerCase()}-${fixture.away.slice(0, 3).toLowerCase()}`;

    await redisCache.setMatchState(matchId, state);

    stateValidator.seedState(matchId, state, "FT");

    const meta: MatchMetadata = {
      matchId,
      sport: "football",
      matchKey,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeLogo: "",
      awayLogo: "",
      leagueId: 1,
      fixtureId: fixture.id,
      // Friendlies played 1-3 days ago
      startTime: new Date(Date.now() - (fixture.id % 3 + 1) * 86400000).toISOString(),
    };

    await redisCache.setMatchMetadata(matchId, meta);

    wsServer.emitMatchUpdate(matchId, {
      matchId,
      sport: "football",
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: 90,
      status: "FT",
      feeTier: getFeeTier(state),
      feeReason: "Match finished",
    });
  }

  console.log(`[Oracle] ✅ Seeded ${DEMO_FIXTURES.length} demo matches (WC 2026 friendlies)`);

  // ── Seed Basketball Demo Data ──
  const BASKETBALL_FIXTURES = [
    { id: 2001, home: "Real Madrid", away: "Barcelona", homeScore: 87, awayScore: 82, homeId: 201, awayId: 202 },
    { id: 2002, home: "Fenerbahçe", away: "Olympiacos", homeScore: 76, awayScore: 71, homeId: 203, awayId: 204 },
    { id: 2003, home: "Panathinaikos", away: "Maccabi Tel Aviv", homeScore: 91, awayScore: 88, homeId: 205, awayId: 206 },
    { id: 2004, home: "Monaco", away: "Anadolu Efes", homeScore: 84, awayScore: 86, homeId: 207, awayId: 208 },
    { id: 2005, home: "Virtus Bologna", away: "Crvena Zvezda", homeScore: 79, awayScore: 74, homeId: 209, awayId: 210 },
  ];

  console.log(`[Oracle] Seeding ${BASKETBALL_FIXTURES.length} demo basketball matches (EuroLeague)...`);

  for (const fixture of BASKETBALL_FIXTURES) {
    const matchId = keccak256(
      stringToHex(`basketball-${fixture.id}-${fixture.homeId}-${fixture.awayId}`),
    );

    const state: MatchState = {
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      minute: 40,
      redCards: 0,
      penaltyShootout: false,
      isFinished: true,
      lastGoalTimestamp: Math.floor(Date.now() / 1000) - 48 * 3600,
      lastUpdateBlock: 0,
    };

    const matchKey = `${fixture.home.slice(0, 3).toLowerCase()}-${fixture.away.slice(0, 3).toLowerCase()}`;

    await redisCache.setMatchState(matchId, state);
    stateValidator.seedState(matchId, state, "FT");

    const meta: MatchMetadata = {
      matchId,
      sport: "basketball",
      matchKey,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeLogo: "",
      awayLogo: "",
      leagueId: 100,
      fixtureId: fixture.id,
      startTime: "2026-05-25T19:00:00+00:00",
    };

    await redisCache.setMatchMetadata(matchId, meta);

    wsServer.emitMatchUpdate(matchId, {
      matchId,
      sport: "basketball",
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: 40,
      status: "FT",
      feeTier: getFeeTier(state),
      feeReason: "Match finished",
    });
  }

  console.log(`[Oracle] ✅ Seeded ${BASKETBALL_FIXTURES.length} demo matches from EuroLeague`);

  // ── Seed NBA Demo Data ──
  const NBA_FIXTURES = [
    { id: 3001, home: "Boston Celtics", away: "LA Lakers", homeScore: 112, awayScore: 107, homeId: 301, awayId: 302 },
    { id: 3002, home: "Golden State Warriors", away: "Denver Nuggets", homeScore: 98, awayScore: 104, homeId: 303, awayId: 304 },
    { id: 3003, home: "Miami Heat", away: "New York Knicks", homeScore: 95, awayScore: 88, homeId: 305, awayId: 306 },
    { id: 3004, home: "Milwaukee Bucks", away: "Philadelphia 76ers", homeScore: 121, awayScore: 115, homeId: 307, awayId: 308 },
    { id: 3005, home: "Oklahoma City Thunder", away: "Dallas Mavericks", homeScore: 103, awayScore: 99, homeId: 309, awayId: 310 },
    { id: 3006, home: "LA Clippers", away: "Phoenix Suns", homeScore: 108, awayScore: 112, homeId: 311, awayId: 312 },
  ];

  console.log(`[Oracle] Seeding ${NBA_FIXTURES.length} demo NBA matches...`);

  for (const fixture of NBA_FIXTURES) {
    const matchId = keccak256(
      stringToHex(`nba-${fixture.id}-${fixture.homeId}-${fixture.awayId}`),
    );

    const state: MatchState = {
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      minute: 48,
      redCards: 0,
      penaltyShootout: false,
      isFinished: true,
      lastGoalTimestamp: Math.floor(Date.now() / 1000) - 24 * 3600,
      lastUpdateBlock: 0,
    };

    const matchKey = `${fixture.home.slice(0, 3).toLowerCase()}-${fixture.away.slice(0, 3).toLowerCase()}`;

    await redisCache.setMatchState(matchId, state);
    stateValidator.seedState(matchId, state, "FT");

    const meta: MatchMetadata = {
      matchId,
      sport: "nba",
      matchKey,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeLogo: "",
      awayLogo: "",
      leagueId: 200,
      fixtureId: fixture.id,
      startTime: "2026-05-27T20:00:00+00:00",
    };

    await redisCache.setMatchMetadata(matchId, meta);

    wsServer.emitMatchUpdate(matchId, {
      matchId,
      sport: "nba",
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: 48,
      status: "FT",
      feeTier: getFeeTier(state),
      feeReason: "Match finished",
    });
  }

  console.log(`[Oracle] ✅ Seeded ${NBA_FIXTURES.length} demo NBA matches`);

  // ── Seed AFL Demo Data ──
  const AFL_FIXTURES = [
    { id: 4001, home: "Geelong Cats", away: "Collingwood Magpies", homeScore: 89, awayScore: 76, homeId: 401, awayId: 402 },
    { id: 4002, home: "Richmond Tigers", away: "Carlton Blues", homeScore: 102, awayScore: 95, homeId: 403, awayId: 404 },
    { id: 4003, home: "Sydney Swans", away: "Essendon Bombers", homeScore: 71, awayScore: 84, homeId: 405, awayId: 406 },
  ];
  await seedSportDemoData("afl", AFL_FIXTURES, 100, "2026-05-26T10:00:00+00:00");

  // ── Seed Baseball Demo Data ──
  const BASEBALL_FIXTURES = [
    { id: 5001, home: "NY Yankees", away: "Boston Red Sox", homeScore: 6, awayScore: 4, homeId: 501, awayId: 502 },
    { id: 5002, home: "LA Dodgers", away: "SF Giants", homeScore: 3, awayScore: 7, homeId: 503, awayId: 504 },
    { id: 5003, home: "Houston Astros", away: "Atlanta Braves", homeScore: 5, awayScore: 2, homeId: 505, awayId: 506 },
  ];
  await seedSportDemoData("baseball", BASEBALL_FIXTURES, 9, "2026-05-27T18:00:00+00:00");

  // ── Seed Formula 1 Demo Data ──
  const F1_FIXTURES = [
    { id: 6001, home: "Monaco GP", away: "Circuit de Monaco", homeScore: 1, awayScore: 0, homeId: 601, awayId: 602 },
    { id: 6002, home: "Italian GP", away: "Monza", homeScore: 1, awayScore: 0, homeId: 603, awayId: 604 },
  ];
  await seedSportDemoData("formula1", F1_FIXTURES, 999, "2026-05-24T14:00:00+00:00");

  // ── Seed Handball Demo Data ──
  const HANDBALL_FIXTURES = [
    { id: 7001, home: "Paris SG", away: "Barcelona", homeScore: 32, awayScore: 28, homeId: 701, awayId: 702 },
    { id: 7002, home: "THW Kiel", away: "Aalborg", homeScore: 27, awayScore: 29, homeId: 703, awayId: 704 },
    { id: 7003, home: "Veszprem", away: "PSG", homeScore: 31, awayScore: 30, homeId: 705, awayId: 706 },
  ];
  await seedSportDemoData("handball", HANDBALL_FIXTURES, 60, "2026-05-27T20:00:00+00:00");

  // ── Seed Hockey Demo Data ──
  const HOCKEY_FIXTURES = [
    { id: 8001, home: "Edmonton Oilers", away: "Toronto Maple Leafs", homeScore: 4, awayScore: 2, homeId: 801, awayId: 802 },
    { id: 8002, home: "Montreal Canadiens", away: "Vancouver Canucks", homeScore: 3, awayScore: 5, homeId: 803, awayId: 804 },
  ];
  await seedSportDemoData("hockey", HOCKEY_FIXTURES, 60, "2026-05-26T23:00:00+00:00");

  // ── Seed MMA Demo Data ──
  const MMA_FIXTURES = [
    { id: 9001, home: "Islam Makhachev", away: "Charles Oliveira", homeScore: 1, awayScore: 0, homeId: 901, awayId: 902, finishType: "Submission R3" },
    { id: 9002, home: "Alex Pereira", away: "Israel Adesanya", homeScore: 1, awayScore: 0, homeId: 903, awayId: 904, finishType: "KO R2" },
  ];
  await seedSportDemoData("mma", MMA_FIXTURES, 5, "2026-05-25T03:00:00+00:00");

  // ── Seed American Football Demo Data ──
  const AMFOOT_FIXTURES = [
    { id: 10001, home: "Kansas City Chiefs", away: "San Francisco 49ers", homeScore: 28, awayScore: 24, homeId: 1001, awayId: 1002 },
    { id: 10002, home: "Dallas Cowboys", away: "Philadelphia Eagles", homeScore: 21, awayScore: 17, homeId: 1003, awayId: 1004 },
    { id: 10003, home: "Buffalo Bills", away: "Cincinnati Bengals", homeScore: 31, awayScore: 27, homeId: 1005, awayId: 1006 },
  ];
  await seedSportDemoData("american-football", AMFOOT_FIXTURES, 60, "2026-05-25T21:00:00+00:00");

  // ── Seed Rugby Demo Data ──
  const RUGBY_FIXTURES = [
    { id: 11001, home: "New Zealand All Blacks", away: "South Africa Springboks", homeScore: 32, awayScore: 28, homeId: 1101, awayId: 1102 },
    { id: 11002, home: "England", away: "Ireland", homeScore: 24, awayScore: 27, homeId: 1103, awayId: 1104 },
    { id: 11003, home: "France", away: "Australia", homeScore: 35, awayScore: 19, homeId: 1105, awayId: 1106 },
  ];
  await seedSportDemoData("rugby", RUGBY_FIXTURES, 80, "2026-05-26T15:00:00+00:00");

  // ── Seed Volleyball Demo Data ──
  const VOLLEYBALL_FIXTURES = [
    { id: 12001, home: "Italy", away: "Poland", homeScore: 3, awayScore: 1, homeId: 1201, awayId: 1202 },
    { id: 12002, home: "Brazil", away: "USA", homeScore: 2, awayScore: 3, homeId: 1203, awayId: 1204 },
  ];
  await seedSportDemoData("volleyball", VOLLEYBALL_FIXTURES, 5, "2026-05-27T17:00:00+00:00");

  // ── Seed Golf Demo Data ──
  const GOLF_FIXTURES = [
    { id: 13001, home: "PGA Championship", away: "Valhalla GC", homeScore: 1, awayScore: 0, homeId: 1301, awayId: 1302 },
    { id: 13002, home: "The Memorial", away: "Muirfield Village", homeScore: 1, awayScore: 0, homeId: 1303, awayId: 1304 },
  ];
  await seedSportDemoData("golf", GOLF_FIXTURES, 999, "2026-05-23T12:00:00+00:00");

  // ── Seed LIVE matches (in-progress) ──
  const LIVE_FIXTURES = [
    { id: 32001, sport: "football" as Sport, home: "Brazil", away: "Argentina", homeScore: 1, awayScore: 0, minute: 67, homeId: 1101, awayId: 1102 },
    { id: 32002, sport: "basketball" as Sport, home: "LA Lakers", away: "Boston Celtics", homeScore: 78, awayScore: 71, minute: 38, homeId: 1201, awayId: 1202 },
    { id: 32003, sport: "american-football" as Sport, home: "Kansas City Chiefs", away: "Dallas Cowboys", homeScore: 14, awayScore: 10, minute: 42, homeId: 1301, awayId: 1302 },
    { id: 32004, sport: "hockey" as Sport, home: "Edmonton Oilers", away: "Toronto Maple Leafs", homeScore: 2, awayScore: 1, minute: 45, homeId: 1401, awayId: 1402 },
    { id: 32005, sport: "baseball" as Sport, home: "NY Yankees", away: "LA Dodgers", homeScore: 4, awayScore: 2, minute: 7, homeId: 1501, awayId: 1502 },
  ];

  console.log(`[Oracle] Seeding ${LIVE_FIXTURES.length} LIVE matches...`);

  for (const fixture of LIVE_FIXTURES) {
    const matchId = keccak256(
      stringToHex(`live-${fixture.sport}-${fixture.id}-${fixture.homeId}-${fixture.awayId}`),
    );

    const state: MatchState = {
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      minute: fixture.minute,
      redCards: 0,
      penaltyShootout: false,
      isFinished: false,
      lastGoalTimestamp: Math.floor(Date.now() / 1000) - 600,
      lastUpdateBlock: 0,
    };

    const matchKey = `${fixture.home.slice(0, 3).toLowerCase()}-${fixture.away.slice(0, 3).toLowerCase()}`;

    await redisCache.setMatchState(matchId, state);
    stateValidator.seedState(matchId, state, "LIV");

    const meta: MatchMetadata = {
      matchId,
      sport: fixture.sport,
      matchKey,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeLogo: "",
      awayLogo: "",
      leagueId: 0,
      fixtureId: fixture.id,
      startTime: new Date(Date.now() - 1800000).toISOString(), // started 30min ago
    };

    await redisCache.setMatchMetadata(matchId, meta);

    wsServer.emitMatchUpdate(matchId, {
      matchId,
      sport: fixture.sport,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: state.minute,
      status: "LIV",
      feeTier: getFeeTier(state),
      feeReason: "Match in progress",
    });
  }

  console.log(`[Oracle] ✅ Seeded ${LIVE_FIXTURES.length} LIVE matches across multiple sports`);

  console.log(`[Oracle] ✅ Seeded demo data for all ${ALL_SPORTS.length} sports`);
}

/**
 * Generic seed function for any sport's demo data.
 */
async function seedSportDemoData(
  sport: Sport,
  fixtures: Array<{ id: number; home: string; away: string; homeScore: number; awayScore: number; homeId: number; awayId: number }>,
  defaultMinute: number,
  startTime: string,
): Promise<void> {
  for (const fixture of fixtures) {
    const matchId = keccak256(
      stringToHex(`${sport}-${fixture.id}-${fixture.homeId}-${fixture.awayId}`),
    );

    const state: MatchState = {
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      minute: defaultMinute,
      redCards: 0,
      penaltyShootout: false,
      isFinished: true,
      lastGoalTimestamp: Math.floor(Date.now() / 1000) - 24 * 3600,
      lastUpdateBlock: 0,
    };

    const matchKey = `${fixture.home.slice(0, 3).toLowerCase()}-${fixture.away.slice(0, 3).toLowerCase()}`;

    await redisCache.setMatchState(matchId, state);
    stateValidator.seedState(matchId, state, "FT");

    const meta: MatchMetadata = {
      matchId,
      sport,
      matchKey,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeLogo: "",
      awayLogo: "",
      leagueId: 0,
      fixtureId: fixture.id,
      startTime,
    };

    await redisCache.setMatchMetadata(matchId, meta);

    wsServer.emitMatchUpdate(matchId, {
      matchId,
      sport,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: defaultMinute,
      status: "FT",
      feeTier: getFeeTier(state),
      feeReason: "Match finished",
    });
  }
}

// ── Start ──
async function main(): Promise<void> {
  try {
    // Start servers
    await wsServer.start();
    await webhookServer.start();

    // Wait for Redis to be ready before seeding data
    await redisCache.waitForReady();

    // Seed demo data from WC 2022
    await seedDemoData();

    // Start polling cycle
    isRunning = true;
    console.log(`[Oracle] Starting poll cycle every ${config.sportsApi.football.pollingIntervalMs / 1000}s\n`);

    // Run first cycle immediately
    await pollCycle();

    // Then poll on interval
    pollInterval = setInterval(pollCycle, config.sportsApi.football.pollingIntervalMs);

    console.log("[Oracle] ✅ Oracle service is running. Press Ctrl+C to stop.");
  } catch (err) {
    console.error("[Oracle] Failed to start:", err);
    process.exit(1);
  }
}

main();
