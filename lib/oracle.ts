/**
 * GoalSwap Arena — Oracle REST API Client
 *
 * Fetches match data, leaderboard, and user portfolio from the
 * oracle webhook-server (port 3002).
 */

export interface MatchSummary {
  matchId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  redCards: number;
  penaltyShootout: boolean;
  isFinished: boolean;
  status: "LIV" | "FT" | "NS";
  startTime: string;
}

export interface MatchDetail {
  matchId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  redCards: number;
  penaltyShootout: boolean;
  isFinished: boolean;
  lastGoalTimestamp: number;
  lastUpdateBlock: number;
  feeTier: number;
  feeReason: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  name?: string;
  volume: string;
  pnl: string;
  trades: number;
  trophies: number;
  xp: number;
  streak?: number;
}

export interface UserPortfolio {
  address: string;
  positions: Array<{
    matchId: string;
    market: string;
    amount: string;
    entryPrice: string;
    currentValue: string;
    pnl: string;
  }>;
  pnl: string;
  totalVolume: string;
  trophies: number;
}

export interface OracleHealth {
  status: string;
  redis: string;
  wsConnections: number;
  activeMatches: number;
  timestamp: string;
}

export interface OracleStats {
  totalVolume: string;
  activeUsers: number;
  totalTrades: number;
  totalMatches: number;
  feesGenerated: string;
  txCount?: number;
  errorCount?: number;
}

/** Fan token info from oracle backend */
export interface FanTokenInfo {
  symbol: string;
  teamName: string;
  matchId: string;
  sport: string;
  price: number;
  priceChange24h: number;
  supply: number;
  maxSupply: number;
  totalVolume: number;
  bondingCurveProgress: number;
  holderCount: number;
  matchStatus: string;
  homeScore: number;
  awayScore: number;
  fundingGoalReached: boolean;
}

/** Result of a buy/sell trade */
export interface FanTokenTradeResult {
  symbol: string;
  action: "buy" | "sell";
  amountIn: number;
  amountOut: number;
  price: number;
  totalVolume: number;
  newSupply: number;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`[Oracle API] ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[Oracle API] Fetch failed: ${path}`, err);
    return null;
  }
}

export const oracleApi = {
  /** Fetch all matches, optionally filtered by status */
  getMatches(status: "live" | "finished" | "all" = "all"): Promise<MatchSummary[]> {
    return fetchJson<{ matches: MatchSummary[] }>(
      `/api/matches?status=${status}`,
    ).then((r) => r?.matches ?? []);
  },

  /** Fetch match detail by ID */
  getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    return fetchJson<MatchDetail>(`/api/match/${encodeURIComponent(matchId)}`);
  },

  /** Search matches by team name */
  async searchMatches(query: string): Promise<MatchSummary[]> {
    const all = await this.getMatches("all");
    const q = query.toLowerCase().trim();
    return all.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.matchId.toLowerCase().includes(q),
    );
  },

  /** Get live matches */
  getLiveMatches(): Promise<MatchSummary[]> {
    return this.getMatches("live");
  },

  /** Get leaderboard */
  getLeaderboard(type: "volume" | "pnl" | "streak" | "trophies" = "volume"): Promise<LeaderboardEntry[]> {
    return fetchJson<{ type: string; entries: LeaderboardEntry[] }>(
      `/api/leaderboard/${type}`,
    ).then((r) => r?.entries ?? []);
  },

  /** Get user portfolio */
  getUserPortfolio(address: string): Promise<UserPortfolio | null> {
    return fetchJson<UserPortfolio>(`/api/user/${encodeURIComponent(address)}`);
  },

  /** Get oracle health */
  getHealth(): Promise<OracleHealth | null> {
    return fetchJson<OracleHealth>("/health");
  },

  /** Get global stats */
  getStats(): Promise<OracleStats | null> {
    return fetchJson<OracleStats>("/api/stats/global");
  },

  /** Get all fan tokens */
  getTokens(): Promise<FanTokenInfo[]> {
    return fetchJson<{ tokens: FanTokenInfo[] }>("/api/tokens").then(
      (r) => r?.tokens ?? [],
    );
  },

  /** Get single fan token by symbol */
  getTokenDetail(symbol: string): Promise<FanTokenInfo | null> {
    return fetchJson<FanTokenInfo>(
      `/api/token/${encodeURIComponent(symbol)}`,
    );
  },

  /** Buy or sell fan tokens on the bonding curve */
  tradeToken(
    symbol: string,
    action: "buy" | "sell",
    amount: number,
  ): Promise<FanTokenTradeResult | null> {
    return fetchJson<FanTokenTradeResult>(
      `/api/token/${encodeURIComponent(symbol)}/trade`,
      {
        method: "POST",
        body: JSON.stringify({ action, amount }),
      },
    );
  },
};
