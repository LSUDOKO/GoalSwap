import "dotenv/config";

/**
 * GoalSwap Oracle — Central Configuration
 * Loads from environment variables with sensible defaults.
 */
export const config = {
  // ── Chain ──
  chain: {
    rpcUrl: process.env.X_LAYER_RPC ?? "https://testrpc.xlayer.tech",
    chainId: Number(process.env.CHAIN_ID ?? 1952),
  },

  // ── Oracle Wallet ──
  oracle: {
    privateKey: process.env.ORACLE_PRIVATE_KEY ?? "",
  },

  // ── Contract Addresses ──
  contracts: {
    hook: (process.env.HOOK_CONTRACT ?? "") as `0x${string}`,
    outcomeFactory: (process.env.OUTCOME_FACTORY ?? "") as `0x${string}`,
    trophyNft: (process.env.TROPHY_NFT ?? "") as `0x${string}`,
    bracketNft: (process.env.BRACKET_NFT ?? "") as `0x${string}`,
  },

  // ── Sports APIs ──
  // Primary: api-sports.io (all 10+ sports using shared RapidAPI key)
  // Fallback: The Odds API, football-data.org, TheSportsDB, SportAPI7, Sportmonks
  sportsApi: {
    // ── Primary APIs (api-sports.io) ──
    football: {
      key: process.env.API_FOOTBALL_KEY ?? process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v3.football.api-sports.io",
      pollingIntervalMs: 30_000,
      rateLimitPerDay: 100,
      dedupWindowMs: 15_000,
    },
    basketball: {
      key: process.env.API_BASKETBALL_KEY ?? process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.basketball.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    nba: {
      key: process.env.API_NBA_KEY ?? process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v2.nba.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    afl: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.afl.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    baseball: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.baseball.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    formula1: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.formula-1.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    handball: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.handball.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    hockey: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.hockey.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    mma: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.mma.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    americanfootball: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.american-football.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    rugby: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.rugby.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    volleyball: {
      key: process.env.API_SPORTS_KEY ?? "",
      baseUrl: "https://v1.volleyball.api-sports.io",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },

    // ── Fallback / Secondary APIs ──
    sportsdb: {
      key: process.env.SPORTSDB_KEY ?? "",
      baseUrl: "https://www.thesportsdb.com/api/v1/json/3",
      pollingIntervalMs: 60_000,
    },
    sportmonks: {
      key: process.env.SPORTMONKS_KEY ?? "",
      token: process.env.SPORTMONKS_TOKEN ?? "",
      baseUrl: "https://api.sportmonks.com/v3",
      livescoresUrl: "/football/livescores/inplay",
      roundsUrl: "/football/rounds",
      teamsUrl: "/football/teams",
      squadsUrl: "/football/squads/teams",
      pollingIntervalMs: 20_000,
      rateLimitPerDay: 10000,
    },
    golf: {
      key: process.env.RAPIDAPI_KEY ?? "",
      baseUrl: "https://live-golf-data.p.rapidapi.com",
      pollingIntervalMs: 300_000,
      rateLimitPerDay: 500,
    },
    oddsApi: {
      key: process.env.ODDS_API_KEY ?? "",
      baseUrl: "https://api.the-odds-api.com/v4",
      pollingIntervalMs: 300_000,
      rateLimitPerDay: 1000,
    },
    footballData: {
      key: process.env.FOOTBALL_DATA_KEY ?? "",
      baseUrl: "https://api.football-data.org/v4",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 100,
    },
    sportapi7: {
      key: process.env.RAPIDAPI_KEY ?? "",
      baseUrl: "https://sportapi7.p.rapidapi.com/api/v1",
      pollingIntervalMs: 60_000,
      rateLimitPerDay: 500,
    },
  },

  // ── X (Twitter) Bot ──
  twitter: {
    rapidApiKey: process.env.RAPIDAPI_KEY ?? "",
    apiBaseUrl: "https://twitter241.p.rapidapi.com",
  },

  // ── Redis ──
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    matchStateTtl: 86_400,           // 24h
    prefix: "goalswap",
  },

  // ── WebSocket ──
  ws: {
    port: Number(process.env.WS_PORT ?? process.env.PORT ?? 8080),
    heartbeatIntervalMs: 30_000,     // ping every 30s
    disconnectTimeoutMs: 90_000,     // disconnect after 90s inactive
    maxConnectionsPerIp: 10,
  },

  // ── Webhook (HTTP/REST) ──
  webhook: {
    port: Number(process.env.WEBHOOK_PORT ?? process.env.PORT ?? 3002),
  },

  // ── Blockchain Writer ──
  blockchain: {
    gasBufferPercent: 20,            // 20% over estimateGas
    txSpacingMs: 2_000,              // 2s between txs to avoid nonce collisions
    maxRetries: 3,
    retryDelayMs: 5_000,
  },

  // ── Polling ──
  polling: {
    maxBackoffMs: 60_000,            // exponential backoff cap
    initialBackoffMs: 1_000,
    backoffMultiplier: 2,
  },

  // ── World Cup 2026 ──
  worldCup: {
    // The 48-team World Cup has 12 groups of 4
    // Tournament dates: June 8 – July 19, 2026
    // Current date: May 28, 2026 — friendlies season
    season: "2026",  // Free tier: 2022-2024 only. Paid tier: use 2026 for live World Cup.
    leagueId: 1,                      // API-Football league ID 1 = World Cup
    friendliesLeagueId: 10,           // International Friendlies
    seasonFixtureId: 2026,
  },

  // ── Current Date ──
  date: {
    today: new Date().toISOString().split("T")[0],
  },
} as const;

export type Config = typeof config;

// Validate critical config at startup
export function validateConfig(): string[] {
  const errors: string[] = [];
  if (!config.contracts.hook) errors.push("HOOK_CONTRACT not set");
  if (!config.oracle.privateKey) errors.push("ORACLE_PRIVATE_KEY not set");
  if (!config.sportsApi.football.key) errors.push("API_FOOTBALL_KEY not set");
  return errors;
}
