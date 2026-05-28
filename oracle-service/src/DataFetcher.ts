/**
 * GoalSwap Oracle — DataFetcher
 *
 * Primary: API-Football (polling every 30s for live matches)
 * Fallback: TheSportsDB (when rate-limited or API-Football down)
 * Tertiary: Sportmonks (player-level data, updated daily)
 *
 * Features:
 * - Exponential backoff on failure (1s → 2s → 4s → 8s → max 60s)
 * - Request deduplication (same matchId max once per 15s)
 * - Rate-limit awareness (100 requests/day free tier)
 */

import axios, { type AxiosInstance } from "axios";
import { keccak256, stringToHex } from "viem";
import { config } from "./config.js";
import type {
  ApiFootballFixture,
  ApiFootballResponse,
  MatchUpdate,
  MatchStatus,
  MatchMetadata,
  SportsDbEvent,
  Sport,
} from "./types.js";

export class DataFetcher {
  private footballClient: AxiosInstance;
  private basketballClient: AxiosInstance;
  private nbaClient: AxiosInstance;
  private sportsDbClient: AxiosInstance;
  private sportmonksClient: AxiosInstance;

  /** Backoff state per data source */
  private backoffState: Record<string, { failures: number; nextRetryAt: number }> = {};

  /** Cache of match metadata (teams, logos) keyed by synthetic key "sport:fixtureId" */
  private metadataCache = new Map<string, MatchMetadata>();

  /** Per-API daily call trackers */
  private apiCallsToday: Record<string, number> = { football: 0, basketball: 0, nba: 0 };
  private apiCallsResetAt = Date.now() + 86_400_000;

  constructor() {
    const apiFootballKey = config.sportsApi.football.key;

    this.footballClient = axios.create({
      baseURL: config.sportsApi.football.baseUrl,
      headers: {
        "x-apisports-key": apiFootballKey,
        "x-rapidapi-key": apiFootballKey,
      },
      timeout: 10_000,
    });

    this.basketballClient = axios.create({
      baseURL: config.sportsApi.basketball.baseUrl,
      headers: {
        "x-rapidapi-key": config.sportsApi.basketball.key,
        "x-apisports-key": config.sportsApi.basketball.key,
      },
      timeout: 10_000,
    });

    this.nbaClient = axios.create({
      baseURL: config.sportsApi.nba.baseUrl,
      headers: {
        "x-rapidapi-key": config.sportsApi.nba.key,
        "x-apisports-key": config.sportsApi.nba.key,
      },
      timeout: 10_000,
    });

    this.sportsDbClient = axios.create({
      baseURL: config.sportsApi.sportsdb.baseUrl,
      timeout: 10_000,
    });

    this.sportmonksClient = axios.create({
      baseURL: config.sportsApi.sportmonks.baseUrl,
      params: { api_token: config.sportsApi.sportmonks.key },
      timeout: 10_000,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch all currently LIVE matches from all sports.
   * Each sport has its own API client and rate limit tracking.
   */
  async fetchLiveMatches(): Promise<{ matches: MatchUpdate[]; metadata: Map<string, MatchMetadata> }> {
    const allMatches: MatchUpdate[] = [];
    const allMetadata = new Map<string, MatchMetadata>();

    // Fetch from all sports in parallel
    const results = await Promise.allSettled([
      this._fetchLiveFromApiFootball().catch((err) => {
        console.warn("[DataFetcher] Football fetch failed:", err.message);
        return { matches: [], metadata: new Map() };
      }),
      this._fetchLiveFromApiBasketball().catch((err) => {
        console.warn("[DataFetcher] Basketball fetch failed:", err.message);
        return { matches: [], metadata: new Map() };
      }),
      this._fetchLiveFromApiNba().catch((err) => {
        console.warn("[DataFetcher] NBA fetch failed:", err.message);
        return { matches: [], metadata: new Map() };
      }),
      this._fetchLiveFromSportsDb().catch((err) => {
        console.warn("[DataFetcher] TheSportsDB fallback failed:", err.message);
        return { matches: [], metadata: new Map() };
      }),
    ]);

    for (const result of results) {
      if (result.status === "fulfilled") {
        allMatches.push(...result.value.matches);
        for (const [key, meta] of result.value.metadata) {
          allMetadata.set(key, meta);
        }
      }
    }

    return { matches: allMatches, metadata: allMetadata };
  }

  /**
   * Fetch detailed events for a specific match (goals, cards, substitutions).
   * Used to get scorer names for notifications.
   */
  async fetchMatchEvents(fixtureId: number): Promise<ApiFootballFixture["events"]> {
    if (this.isRateLimited("football")) return [];

    try {
      const { data } = await this.footballClient.get<ApiFootballResponse<ApiFootballFixture>>(
        "/fixtures",
        { params: { id: fixtureId } },
      );
      this._trackApiCall("football");
      return data.response[0]?.events ?? [];
    } catch (err) {
      console.warn(`[DataFetcher] Failed to fetch events for fixture ${fixtureId}:`, (err as Error).message);
      return [];
    }
  }

  /**
   * Fetch upcoming matches for the next 48 hours.
   */
  async fetchUpcomingMatches(): Promise<MatchUpdate[]> {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 48 * 60 * 60 * 1000);

    const fromDate = today.toISOString().split("T")[0];
    const toDate = tomorrow.toISOString().split("T")[0];

    try {
      const { data } = await this.footballClient.get<ApiFootballResponse<ApiFootballFixture>>(
        "/fixtures",
        {
          params: {
            league: config.worldCup.leagueId,
            season: config.worldCup.season,
            from: fromDate,
            to: toDate,
            status: "NS",  // Not Started
          },
        },
      );
      this._trackApiCall("football");

      return data.response.map((f) => {
        const matchId = this._generateSportMatchId("football", f.fixture.id, f.teams.home.id, f.teams.away.id);
        return this._toFootballMatchUpdate(f, matchId, "football");
      });
    } catch (err) {
      console.warn("[DataFetcher] Failed to fetch upcoming matches:", (err as Error).message);
      return [];
    }
  }

  /**
   * Fetch top goalscorers from Sportmonks (for player props).
   * Updated daily, not per-match.
   */
  async fetchTopScorers(seasonId = 23850): Promise<Array<{ name: string; goals: number; team: string }>> {
    try {
      const { data } = await this.sportmonksClient.get(
        `/football/v3/topscorers/season/${seasonId}`,
      );
      return (data.data ?? []).slice(0, 20).map((p: any) => ({
        name: p.player?.name ?? "Unknown",
        goals: Number(p.goals ?? 0),
        team: p.team?.name ?? "",
      }));
    } catch (err) {
      console.warn("[DataFetcher] Sportmonks top scorers failed:", (err as Error).message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — API-Football
  // ═══════════════════════════════════════════════════════════════

  private async _fetchLiveFromApiFootball(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("football") || this.isBackedOff("api-football")) {
      return { matches, metadata };
    }

    const sport: Sport = "football";

    // Strategy 1: Try date-based query for today's fixtures
    try {
      const todayStr = config.date.today;
      const { data: dateData } = await this.footballClient.get<ApiFootballResponse<ApiFootballFixture>>(
        "/fixtures",
        { params: { date: todayStr } },
      );
      this._trackApiCall("football");

      const liveStatuses = new Set(["LIV", "1H", "2H", "HT", "ET", "P"]);
      for (const fixture of dateData.response ?? []) {
        const status = fixture.fixture.status.short;
        if (!liveStatuses.has(status) && status !== "FT") continue;

        const metaKey = `football:${fixture.fixture.id}`;
        const matchId = this._generateSportMatchId(sport, fixture.fixture.id, fixture.teams.home.id, fixture.teams.away.id);
        matches.push(this._toFootballMatchUpdate(fixture, matchId, sport));

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: this._toMatchKey(fixture),
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            homeLogo: fixture.teams.home.logo,
            awayLogo: fixture.teams.away.logo,
            leagueId: fixture.league.id,
            fixtureId: fixture.fixture.id,
            startTime: fixture.fixture.date,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          const cached = this.metadataCache.get(metaKey)!;
          metadata.set(metaKey, cached);
        }
      }

      if (matches.length > 0) {
        console.log(`[DataFetcher][Football] Found ${matches.length} matches via date query`);
        return { matches, metadata };
      }
    } catch (err) {
      console.warn("[DataFetcher] Football date query failed:", (err as Error).message);
    }

    // Strategy 2: Try friendlies / international league
    try {
      const { data } = await this.footballClient.get<ApiFootballResponse<ApiFootballFixture>>(
        "/fixtures",
        {
          params: {
            league: config.worldCup.friendliesLeagueId,
            season: config.worldCup.season,
            live: "all",
          },
        },
      );
      this._trackApiCall("football");

      for (const fixture of data.response ?? []) {
        const metaKey = `football:${fixture.fixture.id}`;
        const matchId = this._generateSportMatchId(sport, fixture.fixture.id, fixture.teams.home.id, fixture.teams.away.id);
        matches.push(this._toFootballMatchUpdate(fixture, matchId, sport));

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: this._toMatchKey(fixture),
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            homeLogo: fixture.teams.home.logo,
            awayLogo: fixture.teams.away.logo,
            leagueId: fixture.league.id,
            fixtureId: fixture.fixture.id,
            startTime: fixture.fixture.date,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          metadata.set(metaKey, this.metadataCache.get(metaKey)!);
        }
      }

      if (matches.length > 0) {
        console.log(`[DataFetcher][Football] Found ${matches.length} matches via friendlies league`);
        return { matches, metadata };
      }
    } catch (err) {
      console.warn("[DataFetcher] Friendlies query failed:", (err as Error).message);
    }

    // Strategy 3: Try World Cup league (will be empty until WC starts June 8)
    try {
      const { data } = await this.footballClient.get<ApiFootballResponse<ApiFootballFixture>>(
        "/fixtures",
        {
          params: {
            league: config.worldCup.leagueId,
            season: config.worldCup.season,
            live: "all",
          },
        },
      );
      this._trackApiCall("football");

      for (const fixture of data.response ?? []) {
        const metaKey = `football:${fixture.fixture.id}`;
        const matchId = this._generateSportMatchId(sport, fixture.fixture.id, fixture.teams.home.id, fixture.teams.away.id);
        matches.push(this._toFootballMatchUpdate(fixture, matchId, sport));

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: this._toMatchKey(fixture),
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            homeLogo: fixture.teams.home.logo,
            awayLogo: fixture.teams.away.logo,
            leagueId: fixture.league.id,
            fixtureId: fixture.fixture.id,
            startTime: fixture.fixture.date,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          metadata.set(metaKey, this.metadataCache.get(metaKey)!);
        }
      }

      if (matches.length > 0) {
        console.log(`[DataFetcher][Football] Found ${matches.length} matches via World Cup league`);
      }
    } catch (err) {
      console.warn("[DataFetcher] World Cup league query failed (expected until June 8):", (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — API-Basketball
  // ═══════════════════════════════════════════════════════════════

  private async _fetchLiveFromApiBasketball(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("basketball") || this.isBackedOff("api-basketball")) {
      return { matches, metadata };
    }

    const sport: Sport = "basketball";

    try {
      const todayStr = config.date.today;
      // API-Basketball endpoint: /games with date parameter
      const { data } = await this.basketballClient.get<any>("/games", {
        params: { date: todayStr },
      });
      this._trackApiCall("basketball");

      const games = data?.response ?? [];
      if (games.length === 0) return { matches, metadata };

      for (const game of games) {
        const fixtureId = game.id;
        const metaKey = `basketball:${fixtureId}`;
        const homeId = game.teams?.home?.id ?? fixtureId;
        const awayId = game.teams?.away?.id ?? fixtureId;
        const matchId = this._generateSportMatchId(sport, fixtureId, homeId, awayId);

        const status = game.status?.short ?? "NS";
        const isLive = status === "LIV" || status === "1Q" || status === "2Q" || status === "3Q" || status === "4Q" || status === "OT";
        const isFinished = status === "FT" || status === "AOT" || status === "CANC";

        // Coerce scores to numbers — Basketball API returns scores as { total: 87 } objects
        const homeScore = this._extractScore(game.scores?.home);
        const awayScore = this._extractScore(game.scores?.away);
        const minute = typeof game.status?.elapsed === "number" ? game.status.elapsed : (isFinished ? 40 : 0);

        if (!isLive && !isFinished) continue;

        // Guard: skip matches with NaN scores
        if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

        matches.push({
          matchId,
          sport,
          homeScore: Math.min(homeScore, 255),
          awayScore: Math.min(awayScore, 255),
          minute,
          redCards: 0,
          penaltyShootout: false,
          isFinished,
          timestamp: Math.floor(Date.now() / 1000),
          status: isFinished ? "FT" : "LIV",
        });

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: `${game.teams?.home?.name?.slice(0, 3).toLowerCase() ?? ""}-${game.teams?.away?.name?.slice(0, 3).toLowerCase() ?? ""}`,
            homeTeam: game.teams?.home?.name ?? "Home",
            awayTeam: game.teams?.away?.name ?? "Away",
            homeLogo: game.teams?.home?.logo ?? "",
            awayLogo: game.teams?.away?.logo ?? "",
            leagueId: game.league?.id ?? 0,
            fixtureId,
            startTime: game.date ?? todayStr,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          metadata.set(metaKey, this.metadataCache.get(metaKey)!);
        }
      }

      console.log(`[DataFetcher][Basketball] Found ${matches.length} games`);
    } catch (err) {
      this._recordFailure("api-basketball");
      console.warn("[DataFetcher][Basketball] Fetch failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — API-NBA
  // ═══════════════════════════════════════════════════════════════

  private async _fetchLiveFromApiNba(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("nba") || this.isBackedOff("api-nba")) {
      return { matches, metadata };
    }

    const sport: Sport = "nba";

    try {
      const todayStr = config.date.today;
      // API-NBA endpoint: /games with date parameter
      const { data } = await this.nbaClient.get<any>("/games", {
        params: { date: todayStr },
      });
      this._trackApiCall("nba");

      const games = data?.response ?? [];
      if (games.length === 0) return { matches, metadata };

      for (const game of games) {
        const fixtureId = game.id;
        const metaKey = `nba:${fixtureId}`;
        const homeId = game.teams?.home?.id ?? fixtureId;
        const awayId = game.teams?.away?.id ?? fixtureId;
        const matchId = this._generateSportMatchId(sport, fixtureId, homeId, awayId);

        const status = game.status?.short ?? "NS";
        const isLive = status === "LIV" || status === "1Q" || status === "2Q" || status === "3Q" || status === "4Q" || status === "OT" || status === "HT";
        const isFinished = status === "FT" || status === "AOT" || status === "CANC";

        // Coerce scores to numbers — NBA API returns scores as { points: 112 } objects
        const homeScore = this._extractScore(game.scores?.home);
        const awayScore = this._extractScore(game.scores?.away);
        const minute = typeof game.status?.elapsed === "number" ? game.status.elapsed : (isFinished ? 48 : 0);

        if (!isLive && !isFinished) continue;

        // Guard: skip matches with NaN scores
        if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

        matches.push({
          matchId,
          sport,
          homeScore: Math.min(homeScore, 255),
          awayScore: Math.min(awayScore, 255),
          minute,
          redCards: 0,
          penaltyShootout: false,
          isFinished,
          timestamp: Math.floor(Date.now() / 1000),
          status: isFinished ? "FT" : "LIV",
        });

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: `${game.teams?.home?.name?.slice(0, 3).toLowerCase() ?? ""}-${game.teams?.away?.name?.slice(0, 3).toLowerCase() ?? ""}`,
            homeTeam: game.teams?.home?.name ?? "Home",
            awayTeam: game.teams?.away?.name ?? "Away",
            homeLogo: game.teams?.home?.logo ?? "",
            awayLogo: game.teams?.away?.logo ?? "",
            leagueId: game.league?.id ?? 0,
            fixtureId,
            startTime: game.date ?? todayStr,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          metadata.set(metaKey, this.metadataCache.get(metaKey)!);
        }
      }

      console.log(`[DataFetcher][NBA] Found ${matches.length} games`);
    } catch (err) {
      this._recordFailure("api-nba");
      console.warn("[DataFetcher][NBA] Fetch failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  /** Convert an API-Football fixture to a MatchUpdate */
  private _toFootballMatchUpdate(fixture: ApiFootballFixture, matchId: `0x${string}`, sport: Sport): MatchUpdate {
    const status: MatchStatus = fixture.fixture.status.short;
    const isFinished = status === "FT" || status === "AET" || status === "PEN";
    const isPenalty = status === "PEN" || (fixture.score.penalty.home ?? 0) > 0;

    return {
      matchId,
      sport,
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
      minute: this._extractMinute(fixture),
      redCards: this._countRedCards(fixture.events ?? []),
      penaltyShootout: isPenalty,
      isFinished,
      timestamp: Math.floor(Date.now() / 1000),
      status,
    };
  }

  /** Create a sport-prefixed deterministic matchId (bytes32) */
  private _generateSportMatchId(sport: Sport, fixtureId: number, homeId: number, awayId: number): `0x${string}` {
    const key = `${sport}-${fixtureId}-${homeId}-${awayId}`;
    return keccak256(stringToHex(key));
  }

  /** Human-readable match key for logging */
  private _toMatchKey(fixture: ApiFootballFixture): string {
    const home = fixture.teams.home.name.toLowerCase().slice(0, 3);
    const away = fixture.teams.away.name.toLowerCase().slice(0, 3);
    return `${home}-${away}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal — TheSportsDB Fallback
  // ═══════════════════════════════════════════════════════════════

  private async _fetchLiveFromSportsDb(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const { data } = await this.sportsDbClient.get<{ events: SportsDbEvent[] }>(
      `/eventsseason.php?id=4424&s=2024-2025`,
    );

    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    for (const event of data.events ?? []) {
      const fixtureId = parseInt(event.idEvent, 10);
      if (isNaN(fixtureId)) continue;

      // TheSportsDB doesn't have a clean "live" filter, so we parse status
      const status = event.strStatus?.toLowerCase() ?? "";
      if (status.includes("finished") || status.includes("cancelled")) continue;

      const matchId = keccak256(stringToHex(`sportsdb-${event.idEvent}`));
      const homeScore = parseInt(event.intHomeScore ?? "0", 10) || 0;
      const awayScore = parseInt(event.intAwayScore ?? "0", 10) || 0;

      matches.push({
        matchId,
        sport: "football",
        homeScore,
        awayScore,
        minute: 45, // TheSportsDB doesn't provide minute
        redCards: 0,
        penaltyShootout: false,
        isFinished: status.includes("finished"),
        timestamp: Math.floor(Date.now() / 1000),
        status: "LIV",
      });
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════

  /** Check if we're rate-limited today for a specific API */
  private isRateLimited(api: string): boolean {
    this._checkReset();
    const limit = api === "football"
      ? config.sportsApi.football.rateLimitPerDay
      : api === "basketball"
        ? config.sportsApi.basketball.rateLimitPerDay
        : config.sportsApi.nba.rateLimitPerDay;
    return (this.apiCallsToday[api] ?? 0) >= limit;
  }

  /** Check if a source is backed off */
  private isBackedOff(source: string): boolean {
    const state = this.backoffState[source];
    if (!state || state.failures === 0) return false;
    return Date.now() < state.nextRetryAt;
  }

  private _recordFailure(source: string): void {
    const state = this.backoffState[source] ?? { failures: 0, nextRetryAt: 0 };
    state.failures++;
    const delay = Math.min(
      config.polling.initialBackoffMs * Math.pow(config.polling.backoffMultiplier, state.failures - 1),
      config.polling.maxBackoffMs,
    );
    state.nextRetryAt = Date.now() + delay;
    this.backoffState[source] = state;
  }

  private _trackApiCall(api: string): void {
    this._checkReset();
    this.apiCallsToday[api] = (this.apiCallsToday[api] ?? 0) + 1;
  }

  private _checkReset(): void {
    const now = Date.now();
    if (now >= this.apiCallsResetAt) {
      this.apiCallsToday = { football: 0, basketball: 0, nba: 0 };
      this.apiCallsResetAt = now + 86_400_000; // 24h from now
    }
  }

  /** Extract current minute from fixture status */
  private _extractMinute(fixture: ApiFootballFixture): number {
    // API-Football returns elapsed time in status.elapsed
    const apiStatus = fixture.fixture.status as Record<string, unknown>;
    if (apiStatus?.elapsed && typeof apiStatus.elapsed === "number") {
      return apiStatus.elapsed;
    }
    if (fixture.fixture.status.short === "FT") return 90;
    if (fixture.fixture.status.short === "AET") return 120;
    if (fixture.fixture.status.short === "PEN") return 120;
    return 0;
  }

  /** Count red cards from events */
  private _countRedCards(events: ApiFootballFixture["events"]): number {
    if (!events) return 0;
    return events.filter(
      (e) => e.type === "Card" && (e.detail === "Red Card" || e.detail === "Yellow->Red"),
    ).length;
  }

  /**
   * Extract score from API response, handling both numeric and object formats.
   * - Basketball API: scores.home = { total: 87 }
   * - NBA API: scores.home = { points: 112 }
   * - Football API: goals.home = 2 (plain number)
   */
  private _extractScore(raw: unknown): number {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return parseInt(raw, 10) || 0;
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      // Try common score fields across sports APIs
      const val = obj.total ?? obj.points ?? obj.home ?? obj.away ?? 0;
      return typeof val === "number" ? val : Number(val) || 0;
    }
    return Number(raw) || 0;
  }

  /**
   * Get cached metadata for a fixture by sport-prefixed key.
   */
  getMetadata(sport: Sport, fixtureId: number): MatchMetadata | undefined {
    return this.metadataCache.get(`${sport}:${fixtureId}`);
  }

  /**
   * Get all cached match metadata.
   */
  getAllMetadata(sport?: Sport): MatchMetadata[] {
    const all = Array.from(this.metadataCache.values());
    return sport ? all.filter((m) => m.sport === sport) : all;
  }

  /**
   * Get API call stats for health checks.
   */
  getApiStats() {
    return {
      apiCallsToday: { ...this.apiCallsToday },
      dailyLimits: {
        football: config.sportsApi.football.rateLimitPerDay,
        basketball: config.sportsApi.basketball.rateLimitPerDay,
        nba: config.sportsApi.nba.rateLimitPerDay,
      },
      rateLimited: {
        football: this.isRateLimited("football"),
        basketball: this.isRateLimited("basketball"),
        nba: this.isRateLimited("nba"),
      },
      backoffState: { ...this.backoffState },
    };
  }
}
