/**
 * GoalSwap Oracle — RedisCache
 *
 * Caches match states for WebSocket replay (new clients get instant state).
 * Stores oracle metrics for health monitoring.
 *
 * Key format:
 *  - `goalswap:match:{matchId}:state`    → JSON MatchState
 *  - `goalswap:match:{matchId}:metadata` → JSON MatchMetadata
 *  - `goalswap:match:{matchId}:lastUpdate` → ISO timestamp
 *  - `goalswap:oracle:txCount:today`     → number
 *  - `goalswap:oracle:errors:today`      → number
 *  - `goalswap:matches:active`           → Set of active matchIds
 */

import Redis from "ioredis";
import { config } from "./config.js";
import type { MatchState, MatchMetadata, FanTokenInfo } from "./types.js";

interface CacheEntry<T> {
  data: T;
  updatedAt: string;
  version: number;
}

export class RedisCache {
  private client: Redis;
  private prefix: string;

  constructor() {
    this.prefix = config.redis.prefix;
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // give up
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: true,
    });

    this.client.on("error", (err) => {
      console.warn("[RedisCache] Connection error:", err.message);
    });

    this.client.on("connect", () => {
      console.log("[RedisCache] Connected to Redis");
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Match State
  // ═══════════════════════════════════════════════════════════════

  /**
   * Store match state in cache.
   */
  async setMatchState(matchId: string, state: MatchState): Promise<void> {
    const entry: CacheEntry<MatchState> = {
      data: state,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    await this.client.setex(
      this._key(`match:${matchId}:state`),
      config.redis.matchStateTtl,
      JSON.stringify(entry),
    );

    // Track active match
    await this.client.sadd(this._key("matches:active"), matchId);
    await this.client.setex(
      this._key(`match:${matchId}:lastUpdate`),
      config.redis.matchStateTtl,
      new Date().toISOString(),
    );
  }

  /**
   * Get cached match state.
   * Returns null if not found or expired.
   */
  async getMatchState(matchId: string): Promise<MatchState | null> {
    try {
      const raw = await this.client.get(this._key(`match:${matchId}:state`));
      if (!raw) return null;

      const entry: CacheEntry<MatchState> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Get all cached match states for active matches.
   */
  async getAllMatchStates(): Promise<Map<string, MatchState>> {
    const activeMatches = await this.client.smembers(this._key("matches:active"));
    const states = new Map<string, MatchState>();

    for (const matchId of activeMatches) {
      const state = await this.getMatchState(matchId);
      if (state) {
        states.set(matchId, state);
      } else {
        // Clean up stale entry
        await this.client.srem(this._key("matches:active"), matchId);
      }
    }

    return states;
  }

  /**
   * Get list of active match IDs.
   */
  async getActiveMatchIds(): Promise<string[]> {
    return this.client.smembers(this._key("matches:active"));
  }

  // ═══════════════════════════════════════════════════════════════
  //  Match Metadata
  // ═══════════════════════════════════════════════════════════════

  /**
   * Store match metadata (team names, logos, etc.)
   */
  async setMatchMetadata(matchId: string, metadata: MatchMetadata): Promise<void> {
    await this.client.setex(
      this._key(`match:${matchId}:metadata`),
      config.redis.matchStateTtl * 7, // 7 days for metadata
      JSON.stringify(metadata),
    );
  }

  /**
   * Get cached match metadata.
   */
  async getMatchMetadata(matchId: string): Promise<MatchMetadata | null> {
    try {
      const raw = await this.client.get(this._key(`match:${matchId}:metadata`));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Get all match metadata for active matches.
   */
  async getAllMatchMetadata(): Promise<MatchMetadata[]> {
    const activeMatches = await this.getActiveMatchIds();
    const metadata: MatchMetadata[] = [];

    for (const matchId of activeMatches) {
      const meta = await this.getMatchMetadata(matchId);
      if (meta) metadata.push(meta);
    }

    return metadata;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Oracle Metrics
  // ═══════════════════════════════════════════════════════════════

  /**
   * Increment today's transaction count.
   */
  async incrementTxCount(): Promise<number> {
    const key = this._key(`oracle:txCount:${this._today()}`);
    const count = await this.client.incr(key);
    await this.client.expire(key, 86_400); // 24h
    return count;
  }

  /**
   * Get today's transaction count.
   */
  async getTxCount(): Promise<number> {
    const val = await this.client.get(this._key(`oracle:txCount:${this._today()}`));
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Increment today's error count.
   */
  async incrementErrorCount(): Promise<number> {
    const key = this._key(`oracle:errors:${this._today()}`);
    const count = await this.client.incr(key);
    await this.client.expire(key, 86_400);
    return count;
  }

  /**
   * Get today's error count.
   */
  async getErrorCount(): Promise<number> {
    const val = await this.client.get(this._key(`oracle:errors:${this._today()}`));
    return val ? parseInt(val, 10) : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Health & Stats
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if Redis is connected and responsive.
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics for health monitoring.
   */
  async getStats(): Promise<Record<string, number>> {
    const activeCount = await this.client.scard(this._key("matches:active"));
    const txCount = await this.getTxCount();
    const errorCount = await this.getErrorCount();

    return {
      activeMatches: activeCount,
      todayTxCount: txCount,
      todayErrorCount: errorCount,
    };
  }

  /**
   * Wait for Redis to be ready (connected + operational).
   */
  async waitForReady(): Promise<void> {
    if (this.client.status === "ready") return;
    if (this.client.status === "connect" || this.client.status === "connecting") {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Redis connection timeout")), 5000);
        this.client.once("ready", () => { clearTimeout(timeout); resolve(); });
      });
      return;
    }
    // If status is something else (e.g. close, end, wait), try connecting
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Redis connection timeout")), 5000);
      this.client.once("ready", () => { clearTimeout(timeout); resolve(); });
    });
  }

  /**
   * Clean shut down Redis connection.
   */
  async shutdown(): Promise<void> {
    await this.client.quit();
  }

  // ═══════════════════════════════════════════════════════════════
  //  Fan Token State
  // ═══════════════════════════════════════════════════════════════

  async setFanToken(token: FanTokenInfo): Promise<void> {
    const entry: CacheEntry<FanTokenInfo> = {
      data: token,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    await this.client.set(
      this._key(`token:${token.symbol}`),
      JSON.stringify(entry),
    );
    await this.client.sadd(this._key("tokens:active"), token.symbol);
  }

  async getFanToken(symbol: string): Promise<FanTokenInfo | null> {
    try {
      const raw = await this.client.get(this._key(`token:${symbol}`));
      if (!raw) return null;
      const entry: CacheEntry<FanTokenInfo> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  }

  async getAllFanTokens(): Promise<FanTokenInfo[]> {
    const symbols = await this.client.smembers(this._key("tokens:active"));
    if (symbols.length === 0) return [];
    const tokens: FanTokenInfo[] = [];
    for (const sym of symbols) {
      const t = await this.getFanToken(sym);
      if (t) tokens.push(t);
    }
    return tokens;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal
  // ═══════════════════════════════════════════════════════════════

  private _key(suffix: string): string {
    return `${this.prefix}:${suffix}`;
  }

  private _today(): string {
    return new Date().toISOString().split("T")[0];
  }
}
