/**
 * GoalSwap Oracle — Shared Types
 *
 * Mirrors the on-chain structs from IWorldCupArenaHook.sol
 * and adds oracle-specific types for the service layer.
 */

// ═══════════════════════════════════════════════════════════════════
//  On-Chain Mirror Types
// ═══════════════════════════════════════════════════════════════════

export enum MarketType {
  MATCH_PREDICTION = 0,
  FAN_TOKEN = 1,
  META_MARKET = 2,
}

export interface MatchState {
  homeScore: number;
  awayScore: number;
  minute: number;
  redCards: number;
  penaltyShootout: boolean;
  isFinished: boolean;
  lastGoalTimestamp: number;
  lastUpdateBlock: number;
}

export interface PoolMetadata {
  marketType: MarketType;
  matchId: string;
  tournamentId: string;
  teamToken: string;
  isSettled: boolean;
}

export interface FanTokenState {
  bondingCurveProgress: number;
  jackpotBalance: bigint;
  totalVolume: bigint;
  fundingGoalReached: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Sports API Types
// ═══════════════════════════════════════════════════════════════════

/** Supported sports — all api-sports.io leagues + golf */
export type Sport =
  | "football"
  | "basketball"
  | "nba"
  | "afl"
  | "baseball"
  | "formula1"
  | "handball"
  | "hockey"
  | "mma"
  | "american-football"
  | "rugby"
  | "volleyball"
  | "golf";

/** All supported sports as an array for iteration */
export const ALL_SPORTS: Sport[] = [
  "football",
  "basketball",
  "nba",
  "afl",
  "baseball",
  "formula1",
  "handball",
  "hockey",
  "mma",
  "american-football",
  "rugby",
  "volleyball",
  "golf",
];

/** Sport display metadata for UI */
export interface SportInfo {
  id: Sport;
  label: string;
  icon: string;
  color: string;
  maxScore: number;
  maxMinute: number;
  apiBaseUrl: string;
}

export const SPORT_INFO: Record<Sport, SportInfo> = {
  football: { id: "football", label: "Football", icon: "⚽", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", maxScore: 50, maxMinute: 210, apiBaseUrl: "https://v3.football.api-sports.io" },
  basketball: { id: "basketball", label: "Basketball", icon: "🏀", color: "text-orange-400 border-orange-500/30 bg-orange-500/10", maxScore: 200, maxMinute: 65, apiBaseUrl: "https://v1.basketball.api-sports.io" },
  nba: { id: "nba", label: "NBA", icon: "🏀", color: "text-red-400 border-red-500/30 bg-red-500/10", maxScore: 250, maxMinute: 65, apiBaseUrl: "https://v2.nba.api-sports.io" },
  afl: { id: "afl", label: "AFL", icon: "🏉", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", maxScore: 200, maxMinute: 120, apiBaseUrl: "https://v1.afl.api-sports.io" },
  baseball: { id: "baseball", label: "Baseball", icon: "⚾", color: "text-red-400 border-red-500/30 bg-red-500/10", maxScore: 30, maxMinute: 15, apiBaseUrl: "https://v1.baseball.api-sports.io" },
  formula1: { id: "formula1", label: "Formula 1", icon: "🏎️", color: "text-red-400 border-red-500/30 bg-red-500/10", maxScore: 999, maxMinute: 999, apiBaseUrl: "https://v1.formula-1.api-sports.io" },
  handball: { id: "handball", label: "Handball", icon: "🤾", color: "text-green-400 border-green-500/30 bg-green-500/10", maxScore: 50, maxMinute: 70, apiBaseUrl: "https://v1.handball.api-sports.io" },
  hockey: { id: "hockey", label: "Hockey", icon: "🏒", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10", maxScore: 20, maxMinute: 70, apiBaseUrl: "https://v1.hockey.api-sports.io" },
  mma: { id: "mma", label: "MMA", icon: "🥊", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", maxScore: 10, maxMinute: 6, apiBaseUrl: "https://v1.mma.api-sports.io" },
  "american-football": { id: "american-football", label: "American Football", icon: "🏈", color: "text-brown-400 border-brown-500/30 bg-brown-500/10", maxScore: 70, maxMinute: 75, apiBaseUrl: "https://v1.american-football.api-sports.io" },
  rugby: { id: "rugby", label: "Rugby", icon: "🏉", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10", maxScore: 100, maxMinute: 90, apiBaseUrl: "https://v1.rugby.api-sports.io" },
  volleyball: { id: "volleyball", label: "Volleyball", icon: "🏐", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", maxScore: 200, maxMinute: 150, apiBaseUrl: "https://v1.volleyball.api-sports.io" },
  golf: { id: "golf", label: "Golf", icon: "⛳", color: "text-lime-400 border-lime-500/30 bg-lime-500/10", maxScore: 999, maxMinute: 999, apiBaseUrl: "https://live-golf-data.p.rapidapi.com" },
};

export type MatchStatus = "NS" | "LIV" | "FT" | "AET" | "PEN" | "SUSP" | "INT" | "PST" | "CANC";

/** Response from API-Football /v3/fixtures */
export interface ApiFootballFixture {
  fixture: {
    id: number;
    status: { short: MatchStatus };
    date: string;
    venue?: { name: string };
  };
  league: {
    id: number;
    season: number;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: ApiFootballEvent[];
}

/** A single match event from API-Football */
export interface ApiFootballEvent {
  time: { elapsed: number; extra?: number };
  team: { id: number; name: string };
  player: { id: number; name: string };
  type: "Goal" | "Card" | "subst" | "Var";
  detail: "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty" | "Red Card" | "Yellow Card" | "Yellow->Red";
  comments?: string;
}

/** Response wrapper from API-Football */
export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: string[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

/** Match event from TheSportsDB */
export interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string;
  intAwayScore: string;
  strStatus: string;
  dateEvent: string;
  strTime: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Oracle Pipeline Types
// ═══════════════════════════════════════════════════════════════════

export interface MatchUpdate {
  matchId: string;
  sport: Sport;
  homeScore: number;
  awayScore: number;
  minute: number;
  redCards: number;
  penaltyShootout: boolean;
  isFinished: boolean;
  timestamp: number;
  status: MatchStatus;
}

/** Result from StateValidator: what changed and what action to take */
export interface StateChange {
  matchId: string;
  matchKey: string;          // human-readable name for logs
  hasChanged: boolean;
  changeType: ChangeType;
  previousState: MatchState;
  newState: MatchState;
  /** Description for logging / notifications */
  description: string;
}

export enum ChangeType {
  NONE = "NONE",
  GOAL = "GOAL",
  STATUS_CHANGE = "STATUS_CHANGE",
  RED_CARD = "RED_CARD",
  PENALTY_SHOOTOUT = "PENALTY_SHOOTOUT",
  MINUTE_ADVANCE = "MINUTE_ADVANCE",
  SETTLEMENT = "SETTLEMENT",
}

// ═══════════════════════════════════════════════════════════════════
//  WebSocket Event Types
// ═══════════════════════════════════════════════════════════════════

export type WsEventType =
  | "match:update"
  | "goal:scored"
  | "match:settled"
  | "fee:changed"
  | "match:created";

export interface WsMatchUpdate {
  matchId: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: string;
  feeTier: number;
  feeReason: string;
}

export interface WsGoalScored {
  matchId: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  team: string;
  scorer: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  newFee: number;
  priceImpact: string;
}

export interface WsMatchSettled {
  matchId: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "draw";
  settlementTxHash: string;
}

export interface WsFeeChanged {
  matchId: string;
  oldFee: number;
  newFee: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Webhook Payloads
// ═══════════════════════════════════════════════════════════════════

export interface WebhookGoalPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  scorer: string;
  team: string;
  newFee: number;
}

export interface WebhookSettledPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Database / API Types
// ═══════════════════════════════════════════════════════════════════

export interface MatchMetadata {
  matchId: string;
  matchKey: string;         // e.g. "arg-bra-2026-06-15"
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  leagueId: number;
  fixtureId: number;
  startTime: string;        // ISO date string
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  volume: string;
  pnl: string;
  trophies: number;
  xp: number;
}

export interface GlobalStats {
  totalVolume: string;
  activeUsers: number;
  totalTrades: number;
  totalMatches: number;
  feesGenerated: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Fan Token Types
// ═══════════════════════════════════════════════════════════════════

export interface FanTokenInfo {
  symbol: string;
  teamName: string;
  matchId: string;
  matchKey: string;
  sport: Sport;
  price: number;
  priceChange24h: number;
  supply: number;
  maxSupply: number;
  totalVolume: number;
  bondingCurveProgress: number;
  holderCount: number;
  matchStatus: MatchStatus;
  homeScore: number;
  awayScore: number;
  fundingGoalReached: boolean;
}

export interface FanTokenTradeRequest {
  action: "buy" | "sell";
  amount: number;
}

export interface FanTokenTradeResult {
  symbol: string;
  action: "buy" | "sell";
  amountIn: number;
  amountOut: number;
  price: number;
  totalVolume: number;
  newSupply: number;
}
