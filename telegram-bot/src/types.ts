/**
 * GoalSwap Telegram Bot — Shared Types
 */

// ═══════════════════════════════════════════════════════════════════
//  Telegram User
// ═══════════════════════════════════════════════════════════════════

export interface TelegramUser {
  userId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  language: string;
  walletAddress?: string;
  createdAt: string;
  lastActive: string;

  // Notification preferences
  goalAlerts: boolean;
  feeSpikeAlerts: boolean;
  settlementAlerts: boolean;
  dailySummary: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Subscriptions
// ═══════════════════════════════════════════════════════════════════

export type AlertType = "goal" | "price" | "fee" | "settlement";

export interface Subscription {
  id: string;
  userId: number;
  matchId: string;
  teamToken?: string;
  alertType: AlertType;
  /** For price/fee thresholds — e.g. target price in USDC or fee % */
  alertValue?: number;
  isActive: boolean;
  createdAt: string;
  /** Optional human-readable match label for display */
  matchLabel?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Notifications
// ═══════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  userId: number;
  matchId: string;
  type: AlertType;
  title: string;
  message: string;
  sentAt: string;
  delivered: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Match Types (mirrors oracle REST API response)
// ═══════════════════════════════════════════════════════════════════

export interface MatchSummary {
  matchId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  redCards: number;
  penaltyShootout: boolean;
  isFinished: boolean;
  status: "FT" | "LIV" | "NS";
  startTime: string;
}

export interface MatchDetail {
  matchId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
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
  volume: string;
  pnl: string;
  trophies: number;
  xp: number;
}

export interface UserPortfolio {
  address: string;
  positions: Array<{
    matchId: string;
    team?: string;
    market?: string;
    amount: string;
    currentValue: string;
    pnl: string;
  }>;
  pnl: string;
  totalVolume?: string;
  trophies: number | Array<{
    tier: number;
    name: string;
    matchId: string;
    timestamp: string;
  }>;
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
  todayTxCount?: number;
  todayErrorCount?: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Fee display helpers
// ═══════════════════════════════════════════════════════════════════

export function formatFeePct(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}

export function getFeeEmoji(fee: number): string {
  if (fee === 0) return "⚪";    // Settlement
  if (fee <= 3000) return "🟢"; // Kickoff / Low
  if (fee <= 10000) return "🟡"; // Normal
  if (fee <= 30000) return "🟠"; // Post-goal
  if (fee <= 50000) return "🔴"; // Red card / Final
  return "🟣";                   // Penalty shootout
}
