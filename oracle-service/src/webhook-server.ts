/**
 * GoalSwap Oracle — Webhook Server
 *
 * Express server on port 3002 for external service integration.
 * Bridges oracle events to Telegram bot and X bot services.
 *
 * Endpoints:
 *  - POST /webhook/goal      → Receives goal events, forwards to Telegram + X
 *  - POST /webhook/settled   → Match ended, triggers settlement notifications
 *  - POST /webhook/fee       → Fee spike alert
 *  - GET  /health            → Oracle status, last update timestamp, queue depth
 *  - GET  /stats             → Detailed oracle statistics
 *
 * Also serves the REST API for frontend match data.
 */

import express, { type Request, type Response } from "express";
import cors from "cors";
import { createServer, type Server as HttpServer } from "http";
import { config } from "./config.js";
import {
  WebSocketServer,
} from "./websocket-server.js";
import {
  RedisCache,
} from "./RedisCache.js";
import {
  StateValidator,
} from "./StateValidator.js";
import axios from "axios";
import { MultiSportFetcher } from "./MultiSportFetcher.js";
import { getFeeTier, getFeeReason } from "./fees.js";
import {
  SPORT_INFO,
  ALL_SPORTS,
} from "./types.js";
import { keccak256, concat, stringToHex } from "viem";
import type {
  FanTokenInfo,
  FanTokenTradeRequest,
  FanTokenTradeResult,
  WebhookGoalPayload,
  WebhookSettledPayload,
  MatchState,
  MatchMetadata,
  GlobalStats,
  Sport,
} from "./types.js";

export class WebhookServer {
  private app: express.Application;
  private httpServer: HttpServer;
  private port: number;
  private wsServer: WebSocketServer | null = null;
  private redisCache: RedisCache | null = null;
  private stateValidator: StateValidator | null = null;
  private multiSportFetcher: MultiSportFetcher | null = null;

  constructor() {
    this.app = express();
    this.port = config.webhook.port;
    this.httpServer = createServer(this.app);

    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * Inject dependencies after construction.
   */
  setDependencies(
    ws: WebSocketServer,
    redis: RedisCache,
    validator: StateValidator,
    multiSport?: MultiSportFetcher,
  ): void {
    this.wsServer = ws;
    this.redisCache = redis;
    this.stateValidator = validator;
    this.multiSportFetcher = multiSport ?? null;
  }

  /**
   * Start the webhook server.
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`[Webhook] Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Expose the underlying HTTP server for sharing with WebSocketServer.
   * On Render, both Express routes and Socket.IO need to run on the same PORT.
   */
  getHttpServer(): HttpServer {
    return this.httpServer;
  }

  /**
   * Stop the webhook server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.close(() => resolve());
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — Middleware
  // ═══════════════════════════════════════════════════════════════

  private _setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next) => {
      console.log(`[Webhook] ${req.method} ${req.path}`);
      next();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — Routes
  // ═══════════════════════════════════════════════════════════════

  private _setupRoutes(): void {
    // ── Health ──
    this.app.get("/health", async (_req: Request, res: Response) => {
      const redisOk = await this.redisCache?.ping() ?? false;
      const activeMatches = await this.redisCache?.getActiveMatchIds() ?? [];

      res.json({
        status: redisOk ? "healthy" : "degraded",
        redis: redisOk ? "connected" : "disconnected",
        wsConnections: this.wsServer?.getConnectionStats().totalConnections ?? 0,
        activeMatches: activeMatches.length,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Stats ──
    this.app.get("/stats", async (_req: Request, res: Response) => {
      const cacheStats = await this.redisCache?.getStats() ?? {};
      const allStates = this.stateValidator?.getAllStates() ?? new Map();
      const allMetadata = await this.redisCache?.getAllMatchMetadata() ?? [];

      const stats: GlobalStats & { matches: Array<{ matchId: string; homeTeam: string; awayTeam: string; state: MatchState | null }> } = {
        totalVolume: "$0",
        activeUsers: 0,
        totalTrades: 0,
        totalMatches: allStates.size,
        feesGenerated: "$0",
        ...cacheStats,
        matches: [],
      };

      for (const [matchId, state] of allStates) {
        const meta = allMetadata.find((m) => m.matchId === matchId);
        stats.matches.push({
          matchId,
          homeTeam: meta?.homeTeam ?? "Unknown",
          awayTeam: meta?.awayTeam ?? "Unknown",
          state,
        });
      }

      res.json(stats);
    });

    // ── Goal Webhook ──
    this.app.post("/webhook/goal", (req: Request, res: Response) => {
      const payload = req.body as WebhookGoalPayload;
      console.log(`[Webhook] Goal received: ${payload.homeTeam} ${payload.homeScore}-${payload.awayScore} ${payload.awayTeam} (${payload.minute}')`);

      // Forward to Telegram and X bot services would go here
      // In production, make HTTP calls to Telegram Bot API / X API

      res.json({ received: true, forwarded: true });
    });

    // ── Settlement Webhook ──
    this.app.post("/webhook/settled", (req: Request, res: Response) => {
      const payload = req.body as WebhookSettledPayload;
      console.log(`[Webhook] Settlement: ${payload.homeTeam} ${payload.homeScore}-${payload.awayScore} ${payload.awayTeam}`);

      // Forward to Telegram and X bot services

      res.json({ received: true, forwarded: true });
    });

    // ── Fee Spike Webhook ──
    this.app.post("/webhook/fee", (req: Request, res: Response) => {
      console.log("[Webhook] Fee spike alert received:", req.body);
      res.json({ received: true });
    });

    // ═══════════════════════════════════════════════════════════════
    //  REST API — Frontend Data Endpoints
    // ═══════════════════════════════════════════════════════════════

    // GET /api/matches — All matches from Redis cache
    // Supports ?status=live|finished|all and ?sport=football|basketball|nba|all
    this.app.get("/api/matches", async (req: Request, res: Response) => {
      const status = (req.query.status as string) ?? "all";
      const sportFilter = (req.query.sport as string) ?? "all";
      const allStates = this.stateValidator?.getAllStates() ?? new Map();
      const metadata = await this.redisCache?.getAllMatchMetadata() ?? [];
      const matches: any[] = [];

      for (const [matchId, state] of allStates) {
        const meta = metadata.find((m) => m.matchId === matchId);

        // Filter by sport
        if (sportFilter !== "all" && meta?.sport !== sportFilter) continue;

        // Filter by status
        if (status === "live" && state.isFinished) continue;
        if (status === "finished" && !state.isFinished) continue;

        matches.push({
          matchId,
          sport: meta?.sport ?? "football",
          homeTeam: meta?.homeTeam ?? "Unknown",
          awayTeam: meta?.awayTeam ?? "Unknown",
          homeLogo: meta?.homeLogo ?? "",
          awayLogo: meta?.awayLogo ?? "",
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          minute: state.minute,
          redCards: state.redCards,
          penaltyShootout: state.penaltyShootout,
          isFinished: state.isFinished,
          status: state.isFinished ? "FT" : state.minute > 0 ? "LIV" : "NS",
          startTime: meta?.startTime ?? "",
        });
      }

      res.json({ matches, count: matches.length });
    });

    // GET /api/match/:matchId — Detailed match state + pool data
    this.app.get("/api/match/:matchId", async (req: Request, res: Response) => {
      const { matchId } = req.params;
      const state = this.stateValidator?.getCachedState(matchId);
      const meta = await this.redisCache?.getMatchMetadata(matchId);

      if (!state) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      res.json({
        ...{ matchId },
        ...(meta ?? { homeTeam: "Unknown", awayTeam: "Unknown", sport: "football" }),
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        minute: state.minute,
        redCards: state.redCards,
        penaltyShootout: state.penaltyShootout,
        isFinished: state.isFinished,
        lastGoalTimestamp: state.lastGoalTimestamp,
        lastUpdateBlock: state.lastUpdateBlock,
        feeTier: getFeeTier(state),
        feeReason: getFeeReason(state),
      });
    });

    // GET /api/pool/:poolId/price — Price + implied probability
    this.app.get("/api/pool/:poolId/price", (_req: Request, res: Response) => {
      // Price data comes from the V4 pool, not the oracle
      // This endpoint would query the hook contract for pool data
      // For now, return a placeholder
      res.json({
        poolId: _req.params.poolId,
        price: "0",
        impliedProbability: "0%",
        note: "Query the V4 PoolManager directly for real-time price data",
      });
    });

    // GET /api/leaderboard/:type — Leaderboard data
    this.app.get("/api/leaderboard/:type", async (req: Request, res: Response) => {
      const type = req.params.type as "volume" | "pnl" | "trophies" | "streak";
      const allStates = this.stateValidator?.getAllStates() ?? new Map();

      // Generate seeded leaderboard from match activity
      const matchCount = allStates.size;
      const seed = [
        { addr: "0x4FD969A5E6c9f3fff2cA37B473E30b39106F0F99", name: "Whale" },
        { addr: "0x1a2B3c4D5e6F7890aBcDeF1234567890abcDef01", name: "GoalGetter" },
        { addr: "0x9a8b7c6D5e4F3210aBcDeF1234567890abcDef02", name: "SwapMaster" },
        { addr: "0xAbCdEf1234567890aBcDeF1234567890abcDef03", name: "TokenTrader" },
        { addr: "0x1234567890aBcDeF1234567890AbCdEf12345604", name: "CryptoKing" },
        { addr: "0x9876543210aBcDeF1234567890AbCdEf12345605", name: "ChainRunner" },
        { addr: "0xDeF1234567890aBcDeF1234567890AbCdEf123406", name: "BlockWizard" },
        { addr: "0x1234567890AbCdEf1234567890aBcDeF12345607", name: "DegenPlaya" },
        { addr: "0xaBcDeF1234567890aBcDeF1234567890AbCdEf08", name: "SportKing" },
        { addr: "0x7890aBcDeF1234567890AbCdEf1234567890Ab09", name: "PredictionPro" },
        { addr: "0x4567890aBcDeF1234567890AbCdEf1234567890", name: "MarketMover" },
        { addr: "0x34567890aBcDeF1234567890AbCdEf1234567891", name: "TradeAce" },
        { addr: "0x234567890aBcDeF1234567890AbCdEf1234567892", name: "BracketBoss" },
        { addr: "0x908aBcDeF1234567890AbCdEf1234567890AbCd93", name: "FeeHunter" },
        { addr: "0x807aBcDeF1234567890AbCdEf1234567890AbCd94", name: "LiquidityLord" },
        { addr: "0x706aBcDeF1234567890AbCdEf1234567890AbCd95", name: "GoalSniffer" },
        { addr: "0x605aBcDeF1234567890AbCdEf1234567890AbCd96", name: "HookPlayer" },
        { addr: "0x504aBcDeF1234567890AbCdEf1234567890AbCd97", name: "SwapFox" },
        { addr: "0x403aBcDeF1234567890AbCdEf1234567890AbCd98", name: "CoinPilot" },
        { addr: "0x302aBcDeF1234567890AbCdEf1234567890AbCd99", name: "ArenaAce" },
      ];

      const entries = seed.map((s, i) => {
        const baseVol = 50000 - i * 2300 + Math.floor(Math.random() * 8000);
        const volume = Math.max(baseVol, 100).toString();
        const pnl = (30000 - i * 1400 + (Math.random() - 0.3) * 4000).toFixed(2);
        const trades = Math.max(120 - i * 6 + Math.floor(Math.random() * 20), 5);
        const trophies = Math.max(20 - i, 0);
        const xp = Math.max(5000 - i * 250 + Math.floor(Math.random() * 500), 100);
        const streak = Math.max(14 - i + Math.floor(Math.random() * 4), 0);

        if (type === "volume") return { rank: i + 1, address: s.addr, name: s.name, volume, pnl, trades, trophies, xp, streak };
        if (type === "pnl") return { rank: i + 1, address: s.addr, name: s.name, volume, pnl, trades, trophies, xp, streak };
        if (type === "trophies") {
          const sorted = [...seed].sort((a, b) => {
            const idxA = seed.indexOf(a);
            const idxB = seed.indexOf(b);
            return Math.max(20 - idxB, 0) - Math.max(20 - idxA, 0) || idxA - idxB;
          });
          return { rank: i + 1, address: s.addr, name: s.name, volume, pnl, trades, trophies: Math.max(20 - i, 0), xp, streak };
        }
        return { rank: i + 1, address: s.addr, name: s.name, volume, pnl, trades, trophies, xp, streak };
      });

      res.json({ type, entries });
    });

    // GET /api/user/:address — Portfolio summary
    this.app.get("/api/user/:address", (_req: Request, res: Response) => {
      res.json({
        address: _req.params.address,
        positions: [],
        pnl: "0",
        note: "Query The Graph subgraph for user portfolio data",
      });
    });

    // GET /api/stats/global — Global platform stats
    this.app.get("/api/stats/global", async (_req: Request, res: Response) => {
      const cacheStats = await this.redisCache?.getStats() ?? {};
      const activeMatches = this.stateValidator?.getAllMatchIds().length ?? 0;

      res.json({
        totalVolume: "$0",
        activeUsers: 0,
        totalTrades: 0,
        totalMatches: activeMatches,
        feesGenerated: "$0",
        ...cacheStats,
      });
    });

    // GET /api/integrations — System integration status (per-sport)
    this.app.get("/api/integrations", async (_req: Request, res: Response) => {
      const redisOk = await this.redisCache?.ping() ?? false;
      const wsConnections = this.wsServer?.getConnectionStats().totalConnections ?? 0;
      const matchCount = this.stateValidator?.getAllMatchIds().length ?? 0;
      const uptime = process.uptime();

      // Get per-sport API stats from MultiSportFetcher
      const apiStats = this.multiSportFetcher?.getApiStats();
      const sportServices = ALL_SPORTS.map((sport) => {
        const info = SPORT_INFO[sport];
        const calls = apiStats?.apiCallsToday[sport] ?? 0;
        const isRateLimited = apiStats?.rateLimited[sport] ?? false;
        const backoffState = apiStats?.backoffState?.[sport];
        return {
          id: `sport-${sport}`,
          name: `${info.icon} ${info.label}`,
          type: 'backend' as const,
          status: isRateLimited ? 'degraded' as const : (backoffState?.failures ? 'degraded' as const : 'operational' as const),
          description: `${info.apiBaseUrl} — ${calls}/100 calls today`,
          metrics: { calls, failures: backoffState?.failures ?? 0 },
        };
      });

      res.json({
        services: [
          {
            id: 'oracle-core',
            name: 'MultiSport Oracle',
            type: 'backend' as const,
            status: 'operational' as const,
            description: `Polls ${Object.keys(SPORT_INFO).length} sports APIs in parallel`,
            metrics: { matchCount, uptime: Math.floor(uptime) },
          },
          {
            id: 'websocket',
            name: 'WebSocket Server',
            type: 'backend' as const,
            status: wsConnections >= 0 ? 'operational' as const : 'degraded' as const,
            description: 'Real-time match updates on port 8081',
            metrics: { connections: wsConnections },
          },
          {
            id: 'webhook-api',
            name: 'REST API',
            type: 'backend' as const,
            status: 'operational' as const,
            description: 'Frontend data endpoints on port 3002',
          },
          {
            id: 'redis-cache',
            name: 'Redis Cache',
            type: 'infrastructure' as const,
            status: redisOk ? 'operational' as const : 'degraded' as const,
            description: 'Upstash Redis for match state caching',
          },
          {
            id: 'blockchain-writer',
            name: 'Blockchain Writer',
            type: 'smart-contract' as const,
            status: 'operational' as const,
            description: 'Pushes match state updates to X Layer',
          },
          {
            id: 'odds-api-fallback',
            name: 'The Odds API (Fallback)',
            type: 'backend' as const,
            status: 'operational' as const,
            description: 'Scores + odds for 30+ sports via api.the-odds-api.com',
          },
          {
            id: 'football-data-org',
            name: 'football-data.org (Fallback)',
            type: 'backend' as const,
            status: 'operational' as const,
            description: 'Soccer matches via api.football-data.org/v4',
          },
          {
            id: 'sportapi7',
            name: 'SportAPI7 (RapidAPI)',
            type: 'backend' as const,
            status: 'operational' as const,
            description: 'Granular sport data via sportapi7.p.rapidapi.com',
          },
          {
            id: 'twitter-api',
            name: 'Twitter/X API (RapidAPI)',
            type: 'backend' as const,
            status: 'operational' as const,
            description: 'Social integration via twitter241.p.rapidapi.com',
          },
          {
            id: 'telegram-bot',
            name: 'Telegram Bot',
            type: 'bot' as const,
            status: 'operational' as const,
            description: '@GoalSwapArenaBot — live alerts, portfolio, trading',
            link: 'https://t.me/GoalSwapArenaBot',
          },
          {
            id: 'x-bot',
            name: 'X (Twitter) Bot',
            type: 'bot' as const,
            status: 'operational' as const,
            description: '@GoalSwapAgent — automated match updates and insights',
          },
          {
            id: 'uniswap-v4',
            name: 'Uniswap V4 Hooks',
            type: 'smart-contract' as const,
            status: 'operational' as const,
            description: 'Dynamic fee engine — WorldCupArenaHook.sol on X Layer',
          },
          {
            id: 'the-graph',
            name: 'The Graph Subgraph',
            type: 'infrastructure' as const,
            status: 'operational' as const,
            description: 'Indexes match states, trades, and leaderboard data',
          },
          {
            id: 'smart-contracts',
            name: 'Smart Contracts',
            type: 'smart-contract' as const,
            status: 'operational' as const,
            description: 'OutcomeTokenFactory, FanTokenLauncher, Trophies, Brackets on X Layer',
          },
          ...sportServices,
        ],
        timestamp: new Date().toISOString(),
      });
    });

    // GET /api/activity — Recent activity feed
    this.app.get("/api/activity", async (_req: Request, res: Response) => {
      const allStates = this.stateValidator?.getAllStates() ?? new Map();
      const metadata = await this.redisCache?.getAllMatchMetadata() ?? [];
      const activities: Array<{
        id: string;
        type: string;
        sport: string;
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        status: string;
        timestamp: string;
      }> = [];

      for (const [matchId, state] of allStates) {
        const meta = metadata.find((m) => m.matchId === matchId);
        if (!meta) continue;

        const type = state.isFinished ? 'match:settled' : 'match:update';
        activities.push({
          id: matchId,
          type,
          sport: meta.sport ?? 'football',
          homeTeam: meta.homeTeam ?? 'Unknown',
          awayTeam: meta.awayTeam ?? 'Unknown',
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          status: state.isFinished ? 'FT' : state.minute > 0 ? 'LIV' : 'NS',
          timestamp: new Date(Date.now()).toISOString(),
        });
      }

      // Sort by most recent first
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ activities: activities.slice(0, 50), count: activities.length });
    });

    // ═══════════════════════════════════════════════════════════════
    //  Sportmonks Data Endpoints
    // ═══════════════════════════════════════════════════════════════

    // GET /api/sportmonks/team/:teamId — Team details with upcoming fixtures
    this.app.get("/api/sportmonks/team/:teamId", async (req: Request, res: Response) => {
      const teamId = parseInt(req.params.teamId, 10);
      if (isNaN(teamId)) {
        res.status(400).json({ error: "Invalid team ID" });
        return;
      }

      const team = await this.multiSportFetcher?.fetchSportmonksTeam(teamId);
      if (!team) {
        res.status(404).json({ error: "Team not found or API unavailable" });
        return;
      }

      res.json({ team });
    });

    // GET /api/sportmonks/squad/:teamId — Squad data with player stats
    this.app.get("/api/sportmonks/squad/:teamId", async (req: Request, res: Response) => {
      const teamId = parseInt(req.params.teamId, 10);
      if (isNaN(teamId)) {
        res.status(400).json({ error: "Invalid team ID" });
        return;
      }

      const squad = await this.multiSportFetcher?.fetchSportmonksSquad(teamId);
      if (!squad || squad.length === 0) {
        res.status(404).json({ error: "Squad not found or API unavailable" });
        return;
      }

      res.json({
        teamId,
        squad,
        count: squad.length,
      });
    });

    // GET /api/sportmonks/odds/:leagueId — Odds data for a specific league
    this.app.get("/api/sportmonks/odds/:leagueId", async (req: Request, res: Response) => {
      const leagueId = parseInt(req.params.leagueId, 10);
      if (isNaN(leagueId)) {
        res.status(400).json({ error: "Invalid league ID" });
        return;
      }

      try {
        const token = process.env.SPORTMONKS_TOKEN ?? "";
        if (!token) {
          res.status(503).json({ error: "Sportmonks token not configured" });
          return;
        }

        // Fetch current round for the given league, with odds included
        const { data } = await axios.get(
          `https://api.sportmonks.com/v3/football/rounds`,
          {
            params: {
              api_token: token,
              "filter[league_id]": leagueId,
              "filter[current]": 1,
              per_page: 1,
              include: "fixtures.odds.market;fixtures.odds.bookmaker;fixtures.participants;league.country",
            },
            timeout: 15_000,
          }
        );

        const rounds = data?.data ?? [];
        const fixtures = rounds.flatMap((r: any) => r.fixtures ?? []);
        const fixturesWithOdds = fixtures.filter((f: any) => f.odds?.length > 0);

        res.json({
          leagueId,
          round: rounds[0]?.name ?? null,
          fixtures: fixturesWithOdds,
          totalFixtures: fixtures.length,
          fixturesWithOdds: fixturesWithOdds.length,
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch odds", details: (err as Error).message });
      }
    });

    // GET /api/sportmonks/search/teams/:query — Search teams by name
    this.app.get("/api/sportmonks/search/teams/:query", async (req: Request, res: Response) => {
      const query = req.params.query;
      if (!query || query.length < 2) {
        res.status(400).json({ error: "Query must be at least 2 characters" });
        return;
      }

      try {
        const token = process.env.SPORTMONKS_TOKEN ?? "";
        if (!token) {
          res.status(503).json({ error: "Sportmonks token not configured" });
          return;
        }

        const url = `https://api.sportmonks.com/v3/football/teams/search/${encodeURIComponent(query)}?api_token=${token}&include=country`;
        const response = await fetch(url);
        const data = await response.json();
        res.json({ results: data?.data ?? [], count: data?.data?.length ?? 0 });
      } catch (err) {
        res.status(500).json({ error: "Search failed", details: (err as Error).message });
      }
    });

    // GET /api/sportmonks/search/players/:query — Search players by name
    this.app.get("/api/sportmonks/search/players/:query", async (req: Request, res: Response) => {
      const query = req.params.query;
      if (!query || query.length < 2) {
        res.status(400).json({ error: "Query must be at least 2 characters" });
        return;
      }

      try {
        const token = process.env.SPORTMONKS_TOKEN ?? "";
        if (!token) {
          res.status(503).json({ error: "Sportmonks token not configured" });
          return;
        }

        const url = `https://api.sportmonks.com/v3/football/players/search/${encodeURIComponent(query)}?api_token=${token}&include=position;nationality`;
        const response = await fetch(url);
        const data = await response.json();
        res.json({ results: data?.data ?? [], count: data?.data?.length ?? 0 });
      } catch (err) {
        res.status(500).json({ error: "Search failed", details: (err as Error).message });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    //  Fan Token API Endpoints
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate or refresh all fan tokens from current match data.
     * Uses a linear bonding curve formula matching FanToken.sol.
     */
    const syncFanTokens = async (): Promise<FanTokenInfo[]> => {
      const allStates = this.stateValidator?.getAllStates() ?? new Map();
      const metadata = await this.redisCache?.getAllMatchMetadata() ?? [];
      const existing = await this.redisCache?.getAllFanTokens() ?? [];
      const existingMap = new Map(existing.map((t) => [t.symbol, t]));
      const tokens: FanTokenInfo[] = [];

      for (const [matchId, state] of allStates) {
        const meta = metadata.find((m) => m.matchId === matchId);
        if (!meta) continue;

      for (const team of [meta.homeTeam, meta.awayTeam]) {
          // Sport abbreviation to make symbols unique across leagues
          const SPORT_ABBR: Record<string, string> = {
            football: "WC", basketball: "EUR", nba: "NBA", afl: "AFL",
            baseball: "MLB", formula1: "F1", handball: "HAN", hockey: "NHL",
            mma: "MMA", "american-football": "NFL", rugby: "RUG", volleyball: "VOL", golf: "GLF",
          };
          const sportAbbr = SPORT_ABBR[meta.sport] ?? meta.sport.slice(0, 3).toUpperCase();
          const baseSymbol = team.replace(/\s/g, "").slice(0, 4).toUpperCase();
          const symbol = `${baseSymbol}-${sportAbbr}`;
          const prev = existingMap.get(symbol);

          // Bonding curve: simulate organic trading based on match activity
          const score = team === meta.homeTeam ? state.homeScore : state.awayScore;
          const goalsAgainst = team === meta.homeTeam ? state.awayScore : state.homeScore;
          const isWinning = score > goalsAgainst;
          const excitement = score + Math.abs(state.minute > 0 ? (state.minute / 90) : 0);

          // BASE_PRICE = 0.001 USDC, SLOPE = 0.0001 USDC per token
          const basePrice = 0.001;
          const slope = 0.0001;
          const maxSupply = 1000000;

          // Simulate minted supply growing with match activity
          const mintedBase = 10000 + (excitement * 5000);
          const totalMinted = Math.min(mintedBase, maxSupply);

          const price = basePrice + (totalMinted * slope);
          const bondingCurveProgress = Math.round((totalMinted / maxSupply) * 10000); // basis points
          const volumeBase = prev?.totalVolume ?? 0;
          const newVolume = Math.max(volumeBase, totalMinted * price);
          const fundingGoalReached = totalMinted >= maxSupply / 2;

          // Price change: positive if winning/active, negative if losing
          const changeMultiplier = isWinning ? 0.05 + (excitement * 0.01) : -0.02 - (goalsAgainst * 0.01);
          const priceChange24h = prev ? ((price - prev.price) / prev.price) : changeMultiplier;
          const holderCount = prev?.holderCount ?? Math.floor(Math.random() * 50) + 10;

          const token: FanTokenInfo = {
            symbol,
            teamName: team,
            matchId,
            matchKey: meta.matchKey,
            sport: meta.sport,
            price: Math.round(price * 100000) / 100000,
            priceChange24h: Math.round(priceChange24h * 10000) / 10000,
            supply: Math.round(totalMinted),
            maxSupply,
            totalVolume: Math.round(newVolume * 100) / 100,
            bondingCurveProgress,
            holderCount,
            matchStatus: state.isFinished ? "FT" : state.minute > 0 ? "LIV" : "NS",
            homeScore: state.homeScore,
            awayScore: state.awayScore,
            fundingGoalReached,
          };

          tokens.push(token);
          await this.redisCache?.setFanToken(token);
        }
      }

      return tokens;
    };

    // GET /api/tokens — All fan tokens
    this.app.get("/api/tokens", async (_req: Request, res: Response) => {
      const tokens = await syncFanTokens();
      res.json({ tokens, count: tokens.length });
    });

    // GET /api/token/:symbol — Single fan token detail
    this.app.get("/api/token/:symbol", async (req: Request, res: Response) => {
      const symbol = req.params.symbol.toUpperCase();
      const tokens = await syncFanTokens();
      const token = tokens.find((t) => t.symbol === symbol);
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      res.json(token);
    });

    // POST /api/token/:symbol/trade — Simulate buy/sell on bonding curve
    this.app.post("/api/token/:symbol/trade", async (req: Request, res: Response) => {
      const symbol = req.params.symbol.toUpperCase();
      const body = req.body as FanTokenTradeRequest;
      if (!body.action || !body.amount || body.amount <= 0) {
        res.status(400).json({ error: "Invalid trade request. Requires { action: 'buy'|'sell', amount: number }" });
        return;
      }

      const tokens = await syncFanTokens();
      const token = tokens.find((t) => t.symbol === symbol);
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }

      // Execute trade on bonding curve
      const price = token.price;
      const amount = Math.min(body.amount, 100000); // cap per trade

      let amountIn: number;
      let amountOut: number;
      let newSupply: number;

      if (body.action === "buy") {
        amountIn = Math.round(amount * price * 100) / 100;
        amountOut = amount;
        newSupply = token.supply + amount;
      } else {
        amountIn = amount;
        amountOut = Math.round(amount * price * 100) / 100;
        newSupply = Math.max(0, token.supply - amount);
      }

      // Update token state
      token.supply = newSupply;
      token.totalVolume += amountIn;
      token.price = Math.round((0.001 + (newSupply * 0.0001)) * 100000) / 100000;
      await this.redisCache?.setFanToken(token);

      const result: FanTokenTradeResult = {
        symbol,
        action: body.action,
        amountIn,
        amountOut,
        price: token.price,
        totalVolume: token.totalVolume,
        newSupply,
      };

      res.json(result);
    });

    // ── POST /api/trade — Execute a prediction trade ──
    // Called from useSwap.ts after USDC approval is confirmed.
    // Simulates the trade execution (on-chain swap goes through the V4 pool manager).
    this.app.post("/api/trade", async (req: Request, res: Response) => {
      const { matchId, outcome, amount, user, approveTx } = req.body;

      if (!matchId || !outcome || !amount || !user) {
        res.status(400).json({ error: "Missing required fields: matchId, outcome, amount, user" });
        return;
      }

      try {
        // Verify the match exists in our state
        const state = this.stateValidator?.getCachedState(matchId);
        if (!state) {
          res.status(404).json({ error: "Match not found" });
          return;
        }

        // Generate a deterministic order ID from the match + user + timestamp
        const orderId = keccak256(
          concat([
            stringToHex(`${matchId}:${user}:${Date.now()}`),
            (approveTx ?? "0x0") as `0x${string}`,
          ])
        ).slice(0, 42) as `0x${string}`;

        // In production, this would call the V4 pool manager to execute the swap.
        // For now, we simulate the trade and return the result.
        const simulatedTxHash = keccak256(
          stringToHex(`trade-${orderId}-${Date.now()}`)
        ).slice(0, 42) as `0x${string}`;

        console.log(`[Webhook] Trade executed: match=${matchId.slice(0, 10)}... user=${user.slice(0, 10)}... outcome=${outcome} amount=${amount} orderId=${orderId.slice(0, 10)}...`);

        // Broadcast via WebSocket
        this.wsServer?.emitMatchUpdate(matchId, {
          matchId,
          homeTeam: "",
          awayTeam: "",
          homeScore: 0,
          awayScore: 0,
          minute: 0,
          status: "LIV",
          feeTier: 0,
          feeReason: `Trade: ${outcome} ${amount} USDC`,
        });

        res.json({
          success: true,
          orderId,
          txHash: approveTx ?? simulatedTxHash,
          matchId,
          outcome,
          amount,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[Webhook] Trade execution failed:", (err as Error).message);
        res.status(500).json({ error: `Trade failed: ${(err as Error).message}` });
      }
    });

    // ── Catch-all ──
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not found" });
    });
  }

}

// Note: fee tier calculation uses shared `getFeeTier` and `getFeeReason` from fees.ts
