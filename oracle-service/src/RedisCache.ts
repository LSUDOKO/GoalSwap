/**
 * GoalSwap Oracle — RedisCache (with In-Memory Fallback)
 *
 * Caches match states for WebSocket replay (new clients get instant state).
 * Stores oracle metrics for health monitoring.
 * Falls back to in-memory storage if Redis is not available locally.
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
  private fallbackMode = false;
  
  // In-Memory Fallback Stores
  private memCache = new Map<string, string>();
  private memSets = new Map<string, Set<string>>();

  constructor() {
    this.prefix = config.redis.prefix;
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null; // give up quickly for fallback
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: false,
    });

    this.client.on("error", (err) => {
      if (!this.fallbackMode) {
        console.warn("[RedisCache] Connection error:", err.message);
      }
    });

    this.client.on("connect", () => {
      console.log("[RedisCache] Connected to Redis");
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Memory Fallback Helpers
  // ═══════════════════════════════════════════════════════════════

  private async _setex(key: string, ttl: number, val: string): Promise<void> {
    if (this.fallbackMode) {
      this.memCache.set(key, val);
      return;
    }
    try {
      await this.client.setex(key, ttl, val);
    } catch {
      this.fallbackMode = true;
      this.memCache.set(key, val);
    }
  }

  private async _get(key: string): Promise<string | null> {
    if (this.fallbackMode) return this.memCache.get(key) || null;
    try {
      return await this.client.get(key);
    } catch {
      this.fallbackMode = true;
      return this.memCache.get(key) || null;
    }
  }

  private async _sadd(key: string, val: string): Promise<void> {
    if (this.fallbackMode) {
      if (!this.memSets.has(key)) this.memSets.set(key, new Set());
      this.memSets.get(key)!.add(val);
      return;
    }
    try {
      await this.client.sadd(key, val);
    } catch {
      this.fallbackMode = true;
      if (!this.memSets.has(key)) this.memSets.set(key, new Set());
      this.memSets.get(key)!.add(val);
    }
  }

  private async _smembers(key: string): Promise<string[]> {
    if (this.fallbackMode) {
      return Array.from(this.memSets.get(key) || []);
    }
    try {
      return await this.client.smembers(key);
    } catch {
      this.fallbackMode = true;
      return Array.from(this.memSets.get(key) || []);
    }
  }

  private async _srem(key: string, val: string): Promise<void> {
    if (this.fallbackMode) {
      this.memSets.get(key)?.delete(val);
      return;
    }
    try {
      await this.client.srem(key, val);
    } catch {
      this.fallbackMode = true;
      this.memSets.get(key)?.delete(val);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Match State
  // ═══════════════════════════════════════════════════════════════

  async setMatchState(matchId: string, state: MatchState): Promise<void> {
    const entry: CacheEntry<MatchState> = {
      data: state,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    await this._setex(
      this._key(`match:${matchId}:state`),
      config.redis.matchStateTtl,
      JSON.stringify(entry),
    );

    await this._sadd(this._key("matches:active"), matchId);
    await this._setex(
      this._key(`match:${matchId}:lastUpdate`),
      config.redis.matchStateTtl,
      new Date().toISOString(),
    );
  }

  async getMatchState(matchId: string): Promise<MatchState | null> {
    const raw = await this._get(this._key(`match:${matchId}:state`));
    if (!raw) return null;
    try {
      const entry: CacheEntry<MatchState> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  }

  async getAllMatchStates(): Promise<Map<string, MatchState>> {
    const activeMatches = await this._smembers(this._key("matches:active"));
    const states = new Map<string, MatchState>();

    for (const matchId of activeMatches) {
      const state = await this.getMatchState(matchId);
      if (state) {
        states.set(matchId, state);
      } else {
        await this._srem(this._key("matches:active"), matchId);
      }
    }
    return states;
  }

  async getActiveMatchIds(): Promise<string[]> {
    return this._smembers(this._key("matches:active"));
  }

  // ═══════════════════════════════════════════════════════════════
  //  Match Metadata
  // ═══════════════════════════════════════════════════════════════

  async setMatchMetadata(matchId: string, metadata: MatchMetadata): Promise<void> {
    await this._setex(
      this._key(`match:${matchId}:metadata`),
      config.redis.matchStateTtl * 7,
      JSON.stringify(metadata),
    );
  }

  async getMatchMetadata(matchId: string): Promise<MatchMetadata | null> {
    const raw = await this._get(this._key(`match:${matchId}:metadata`));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

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

  async incrementTxCount(): Promise<number> {
    if (this.fallbackMode) return 0;
    try {
      const key = this._key(`oracle:txCount:${this._today()}`);
      const count = await this.client.incr(key);
      await this.client.expire(key, 86_400);
      return count;
    } catch { return 0; }
  }

  async getTxCount(): Promise<number> {
    if (this.fallbackMode) return 0;
    try {
      const val = await this.client.get(this._key(`oracle:txCount:${this._today()}`));
      return val ? parseInt(val, 10) : 0;
    } catch { return 0; }
  }

  async incrementErrorCount(): Promise<number> {
    if (this.fallbackMode) return 0;
    try {
      const key = this._key(`oracle:errors:${this._today()}`);
      const count = await this.client.incr(key);
      await this.client.expire(key, 86_400);
      return count;
    } catch { return 0; }
  }

  async getErrorCount(): Promise<number> {
    if (this.fallbackMode) return 0;
    try {
      const val = await this.client.get(this._key(`oracle:errors:${this._today()}`));
      return val ? parseInt(val, 10) : 0;
    } catch { return 0; }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Health & Stats
  // ═══════════════════════════════════════════════════════════════

  async ping(): Promise<boolean> {
    if (this.fallbackMode) return true;
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async getStats(): Promise<Record<string, number>> {
    const activeCount = (await this._smembers(this._key("matches:active"))).length;
    const txCount = await this.getTxCount();
    const errorCount = await this.getErrorCount();

    return {
      activeMatches: activeCount,
      todayTxCount: txCount,
      todayErrorCount: errorCount,
    };
  }

  async waitForReady(): Promise<void> {
    if (this.client.status === "ready") return;
    
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("\n[RedisCache] ⚠️  Redis connection timeout. Falling back to IN-MEMORY cache.");
        this.fallbackMode = true;
        resolve();
      }, 2000); // 2 second timeout to fallback quickly

      this.client.once("ready", () => { 
        clearTimeout(timeout); 
        resolve(); 
      });
      
      this.client.once("error", () => {
        clearTimeout(timeout);
        this.fallbackMode = true;
        console.warn("\n[RedisCache] ⚠️  Redis connection failed. Falling back to IN-MEMORY cache.");
        resolve();
      });
    });
  }

  async shutdown(): Promise<void> {
    if (!this.fallbackMode) {
      await this.client.quit();
    }
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
    await this._setex(
      this._key(`token:${token.symbol}`),
      0,
      JSON.stringify(entry),
    );
    await this._sadd(this._key("tokens:active"), token.symbol);
  }

  async getFanToken(symbol: string): Promise<FanTokenInfo | null> {
    const raw = await this._get(this._key(`token:${symbol}`));
    if (!raw) return null;
    try {
      const entry: CacheEntry<FanTokenInfo> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  }

  async getAllFanTokens(): Promise<FanTokenInfo[]> {
    const symbols = await this._smembers(this._key("tokens:active"));
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
