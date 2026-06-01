/**
 * GoalSwap Telegram Bot — Oracle API Client
 *
 * Communicates with the oracle webhook-server REST API.
 * All endpoints are served from the webhook-server (port 3002).
 */

import axios from "axios";
import type {
  MatchSummary,
  MatchDetail,
  LeaderboardEntry,
  UserPortfolio,
  OracleHealth,
  OracleStats,
} from "../types.js";

class OracleApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://goalswap.onrender.com") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Matches
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch all matches, optionally filtered by status.
   */
  async getMatches(status: "live" | "finished" | "all" = "all"): Promise<MatchSummary[]> {
    try {
      const { data } = await axios.get<{ matches: MatchSummary[]; count: number }>(
        `${this.baseUrl}/api/matches`,
        { params: { status }, timeout: 5000 },
      );
      return data.matches;
    } catch (err) {
      console.warn("[API] getMatches failed:", (err as Error).message);
      return [];
    }
  }

  /**
   * Fetch detailed match state by matchId.
   */
  async getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    try {
      const { data } = await axios.get<MatchDetail>(
        `${this.baseUrl}/api/match/${encodeURIComponent(matchId)}`,
        { timeout: 5000 },
      );
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      console.warn(`[API] getMatchDetail(${matchId}) failed:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Search matches by team name (client-side filter from all matches).
   */
  async searchMatches(query: string): Promise<MatchSummary[]> {
    const all = await this.getMatches("all");
    const q = query.toLowerCase().trim();
    return all.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.matchId.toLowerCase().includes(q),
    );
  }

  /**
   * Get live matches only.
   */
  async getLiveMatches(): Promise<MatchSummary[]> {
    return this.getMatches("live");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Leaderboard
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch leaderboard entries.
   */
  async getLeaderboard(type: "volume" | "pnl" | "streak" | "trophies" = "volume"): Promise<LeaderboardEntry[]> {
    try {
      const { data } = await axios.get<{ type: string; entries: LeaderboardEntry[] }>(
        `${this.baseUrl}/api/leaderboard/${type}`,
        { timeout: 5000 },
      );
      return data.entries ?? [];
    } catch (err) {
      console.warn(`[API] getLeaderboard(${type}) failed:`, (err as Error).message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  User Portfolio
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch user portfolio by wallet address.
   */
  async getUserPortfolio(address: string): Promise<UserPortfolio | null> {
    try {
      const { data } = await axios.get<UserPortfolio>(
        `${this.baseUrl}/api/user/${encodeURIComponent(address)}`,
        { timeout: 5000 },
      );
      return data;
    } catch (err) {
      console.warn(`[API] getUserPortfolio(${address.slice(0, 8)}...) failed:`, (err as Error).message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Health & Stats
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check oracle service health.
   */
  async getHealth(): Promise<OracleHealth | null> {
    try {
      const { data } = await axios.get<OracleHealth>(
        `${this.baseUrl}/health`,
        { timeout: 5000 },
      );
      return data;
    } catch (err) {
      console.warn("[API] getHealth failed:", (err as Error).message);
      return null;
    }
  }

  /**
   * Fetch global platform stats.
   */
  async getStats(): Promise<OracleStats | null> {
    try {
      const { data } = await axios.get<OracleStats>(
        `${this.baseUrl}/api/stats/global`,
        { timeout: 5000 },
      );
      return data;
    } catch (err) {
      console.warn("[API] getStats failed:", (err as Error).message);
      return null;
    }
  }

  /**
   * Fetch detailed oracle stats.
   */
  async getDetailedStats(): Promise<OracleStats | null> {
    try {
      const { data } = await axios.get<OracleStats>(
        `${this.baseUrl}/api/stats/detailed`,
        { timeout: 5000 },
      );
      return data;
    } catch (err) {
      console.warn("[API] getDetailedStats failed:", (err as Error).message);
      return null;
    }
  }
}

export const api = new OracleApiClient(process.env.ORACLE_API_URL ?? "https://goalswap.onrender.com");
