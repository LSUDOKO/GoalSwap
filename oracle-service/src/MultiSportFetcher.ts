/**
 * GoalSwap Oracle — MultiSportFetcher
 *
 * Generic fetcher for all api-sports.io APIs across 12+ sports.
 * All api-sports.io APIs share the same response pattern, so a single
 * generic fetcher can handle all of them.
 *
 * Also integrates fallback APIs:
 *  - The Odds API (v4) — scores + odds for 30+ sports
 *  - football-data.org (v4) — soccer-specific fallback
 *  - SportAPI7 (RapidAPI) — granular sport data
 *  - Live Golf Data (RapidAPI) — golf tournaments
 *  - Twitter241 (RapidAPI) — X/Twitter social integration
 */

import axios, { type AxiosInstance } from "axios";
import { keccak256, stringToHex } from "viem";
import { config } from "./config.js";
import { SPORT_INFO } from "./types.js";
import type {
  MatchUpdate,
  MatchMetadata,
  Sport,
  MatchStatus,
} from "./types.js";

/** Generic api-sports.io response shape */
interface ApiSportsResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: string[];
  results: number;
  response: T[];
}

/** Generic api-sports.io game shape */
interface ApiSportsGame {
  id: number;
  date?: string;
  time?: string;
  timestamp?: number;
  timezone?: string;
  stage?: string;
  week?: string;
  status: {
    short: string;
    long?: string;
    elapsed?: number;
    clock?: string;
    half?: string;
  };
  league: {
    id: number;
    name: string;
    country?: string;
    logo?: string;
    flag?: string;
    season?: number;
    round?: string;
  };
  country?: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  teams: {
    home: { id: number; name: string; logo?: string; winner?: boolean };
    away: { id: number; name: string; logo?: string; winner?: boolean };
  };
  scores: {
    home: { total?: number; points?: number; quarter1?: number; quarter2?: number; quarter3?: number; quarter4?: number; overtime?: number };
    away: { total?: number; points?: number; quarter1?: number; quarter2?: number; quarter3?: number; quarter4?: number; overtime?: number };
  };
  periods?: {
    first?: { home?: string; away?: string };
    second?: { home?: string; away?: string };
    third?: { home?: string; away?: string };
    fourth?: { home?: string; away?: string };
    overtime?: { home?: string; away?: string };
  };
}

/** Odds API v4 event shape */
interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

/** Odds API v4 sport shape */
interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

/** football-data.org match shape */
interface FootballDataMatch {
  id: number;
  competition: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
  status: string;
  utcDate: string;
}

/** SportAPI7 event shape */
interface SportApi7Event {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: { total: number };
  awayScore: { total: number };
  status: string;
  startDate: string;
}

/** Golf tournament shape */
interface GolfEvent {
  id: number;
  name: string;
  course?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  leader?: {
    name: string;
    total: number;
    round: number;
    thru: number;
  };
}

export class MultiSportFetcher {
  /** Axios clients keyed by sport ID */
  private clients = new Map<string, AxiosInstance>();

  /** Metadata cache keyed by "sport:fixtureId" */
  private metadataCache = new Map<string, MatchMetadata>();

  /** Per-API daily call trackers */
  private apiCallsToday: Record<string, number> = {};
  private apiCallsResetAt = Date.now() + 86_400_000;

  /** Backoff state per data source */
  private backoffState: Record<string, { failures: number; nextRetryAt: number }> = {};

  /** Shared api-sports.io key */
  private apiSportsKey: string;
  private rapidApiKey: string;

  /** The Odds API client */
  private oddsApiClient: AxiosInstance;

  /** football-data.org client */
  private footballDataClient: AxiosInstance;

  /** SportAPI7 client */
  private sportapi7Client: AxiosInstance;

  /** Golf client */
  private golfClient: AxiosInstance;

  constructor() {
    this.apiSportsKey = process.env.API_SPORTS_KEY ?? "";
    this.rapidApiKey = process.env.RAPIDAPI_KEY ?? "";

    // Initialize api-sports.io clients for all sports
    const sportsToInit = Object.keys(SPORT_INFO) as Sport[];
    for (const sport of sportsToInit) {
      const info = SPORT_INFO[sport];
      if (info.apiBaseUrl.includes("api-sports.io") || info.apiBaseUrl.includes("live-golf-data")) {
        this.clients.set(sport, axios.create({
          baseURL: info.apiBaseUrl,
          headers: {
            "x-rapidapi-key": this.apiSportsKey,
            "x-apisports-key": this.apiSportsKey,
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        }));
      }
    }

    // Initialize The Odds API client
    this.oddsApiClient = axios.create({
      baseURL: config.sportsApi.oddsApi.baseUrl,
      timeout: 10_000,
    });

    // Initialize football-data.org client
    this.footballDataClient = axios.create({
      baseURL: config.sportsApi.footballData.baseUrl,
      headers: {
        "X-Auth-Token": config.sportsApi.footballData.key,
      },
      timeout: 10_000,
    });

    // Initialize SportAPI7 client
    this.sportapi7Client = axios.create({
      baseURL: config.sportsApi.sportapi7.baseUrl,
      headers: {
        "x-rapidapi-host": "sportapi7.p.rapidapi.com",
        "x-rapidapi-key": this.rapidApiKey,
        "Content-Type": "application/json",
      },
      timeout: 10_000,
    });

    // Initialize Golf client
    this.golfClient = axios.create({
      baseURL: config.sportsApi.golf.baseUrl,
      headers: {
        "x-rapidapi-host": "live-golf-data.p.rapidapi.com",
        "x-rapidapi-key": this.rapidApiKey,
        "Content-Type": "application/json",
      },
      timeout: 10_000,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch live matches from ALL sports in parallel.
   * Uses api-sports.io primary, falls back to Odds API / football-data.org.
   */
  async fetchAllSports(): Promise<{ matches: MatchUpdate[]; metadata: Map<string, MatchMetadata> }> {
    const allMatches: MatchUpdate[] = [];
    const allMetadata = new Map<string, MatchMetadata>();

    const sports = Object.keys(SPORT_INFO) as Sport[];

    // Fetch all sports in parallel
    const results = await Promise.allSettled(
      sports.map((sport) =>
        this._fetchSport(sport).catch((err) => {
          console.warn(`[MultiSportFetcher][${sport}] Failed:`, err.message);
          return { matches: [], metadata: new Map() };
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allMatches.push(...result.value.matches);
        for (const [key, meta] of result.value.metadata) {
          allMetadata.set(key, meta);
        }
      }
    }

    // Also fetch from The Odds API as supplementary data
    const oddsResult = await this._fetchFromOddsApi().catch(() => ({ matches: [], metadata: new Map() }));
    allMatches.push(...oddsResult.matches);
    for (const [key, meta] of oddsResult.metadata) {
      allMetadata.set(key, meta);
    }

    // Fetch from football-data.org as football fallback
    const fdResult = await this._fetchFromFootballData().catch(() => ({ matches: [], metadata: new Map() }));
    allMatches.push(...fdResult.matches);
    for (const [key, meta] of fdResult.metadata) {
      allMetadata.set(key, meta);
    }

    // Fetch from SportAPI7 as generic sports fallback
    const s7Result = await this._fetchFromSportApi7().catch(() => ({ matches: [], metadata: new Map() }));
    allMatches.push(...s7Result.matches);
    for (const [key, meta] of s7Result.metadata) {
      allMetadata.set(key, meta);
    }

    return { matches: allMatches, metadata: allMetadata };
  }

  /**
   * Get API call stats for health checks.
   */
  getApiStats() {
    const limits: Record<string, number> = {};
    const rateLimited: Record<string, boolean> = {};

    for (const sport of Object.keys(SPORT_INFO)) {
      limits[sport] = 100;
      rateLimited[sport] = this.isRateLimited(sport);
    }
    limits["oddsApi"] = 1000;
    limits["footballData"] = 100;
    limits["sportapi7"] = 500;
    limits["golf"] = 500;

    return {
      apiCallsToday: { ...this.apiCallsToday },
      dailyLimits: limits,
      rateLimited: { ...rateLimited },
      backoffState: { ...this.backoffState },
    };
  }

  /**
   * Get metadata for a sport+fixture
   */
  getMetadata(sport: string, fixtureId: number): MatchMetadata | undefined {
    return this.metadataCache.get(`${sport}:${fixtureId}`);
  }

  /**
   * Get all cached metadata.
   */
  getAllMetadata(sport?: string): MatchMetadata[] {
    const all = Array.from(this.metadataCache.values());
    return sport ? all.filter((m) => m.sport === sport) : all;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Generic api-sports.io Fetcher
  // ═══════════════════════════════════════════════════════════════

  private async _fetchSport(sport: Sport): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    const client = this.clients.get(sport);
    if (!client) return { matches, metadata };
    if (this.isRateLimited(sport) || this.isBackedOff(sport)) return { matches, metadata };

    const info = SPORT_INFO[sport];

    try {
      const todayStr = config.date.today;

      // Formula 1 and golf have different endpoints
      if (sport === "formula1") {
        return await this._fetchFormula1(sport);
      }
      if (sport === "golf") {
        return await this._fetchGolf(sport);
      }

      // Generic endpoint: /games with date parameter
      const { data } = await client.get<ApiSportsResponse<ApiSportsGame>>("/games", {
        params: { date: todayStr, timezone: "UTC" },
      });
      this._trackApiCall(sport);

      const games = data?.response ?? [];
      if (games.length === 0) return { matches, metadata };

      for (const game of games) {
        const fixtureId = game.id;
        const metaKey = `${sport}:${fixtureId}`;
        const homeId = game.teams?.home?.id ?? fixtureId;
        const awayId = game.teams?.away?.id ?? fixtureId;
        const matchId = this._generateMatchId(sport, fixtureId, homeId, awayId);

        const status = game.status?.short ?? "NS";
        const isLive = this._isLiveStatus(sport, status);
        const isFinished = this._isFinishedStatus(sport, status);

        // Extract scores — different sports have different score formats
        const homeScore = this._extractScore(game.scores?.home, sport);
        const awayScore = this._extractScore(game.scores?.away, sport);

        // Extract minute/duration — different sports use different units
        const minute = this._extractMinute(game, sport, isFinished);

        // Only include live or finished matches
        if (!isLive && !isFinished) continue;

        // Guard: skip NaN scores
        if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

        matches.push({
          matchId,
          sport,
          homeScore: Math.min(homeScore, 255),
          awayScore: Math.min(awayScore, 255),
          minute: Math.min(minute, 999),
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
            matchKey: this._toMatchKey(game),
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

      if (matches.length > 0) {
        console.log(`[MultiSportFetcher][${info.label}] Found ${matches.length} games`);
      }

      // Try fallback query: /games with league parameter if no results
      if (games.length === 0 && sport === "football") {
        try {
          const { data: leagueData } = await client.get<ApiSportsResponse<ApiSportsGame>>("/games", {
            params: { league: 1, season: "2026", live: "all" },
          });
          this._trackApiCall(sport);

          for (const game of leagueData?.response ?? []) {
            // ... same processing as above (would be extracted to a helper in production)
            const fixtureId = game.id;
            const metaKey = `${sport}:${fixtureId}`;
            const matchId = this._generateMatchId(sport, fixtureId, game.teams?.home?.id ?? fixtureId, game.teams?.away?.id ?? fixtureId);
            matches.push({
              matchId,
              sport,
              homeScore: this._extractScore(game.scores?.home, sport),
              awayScore: this._extractScore(game.scores?.away, sport),
              minute: this._extractMinute(game, sport, false),
              redCards: 0,
              penaltyShootout: false,
              isFinished: false,
              timestamp: Math.floor(Date.now() / 1000),
              status: "LIV",
            });
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      this._recordFailure(sport);
      console.warn(`[MultiSportFetcher][${info.label}] Fetch failed:`, (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Specialized Sport Fetchers
  // ═══════════════════════════════════════════════════════════════

  /** Formula 1 uses /races endpoint instead of /games */
  private async _fetchFormula1(sport: Sport): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];
    const client = this.clients.get("formula1");
    if (!client) return { matches, metadata };

    try {
      const { data } = await client.get<ApiSportsResponse<any>>("/races", {
        params: { date: config.date.today, timezone: "UTC" },
      });
      this._trackApiCall("formula1");

      for (const race of data?.response ?? []) {
        const fixtureId = race.id;
        const matchId = this._generateMatchId(sport, fixtureId, 0, 0);
        const metaKey = `${sport}:${fixtureId}`;

        const status = race.status ?? "NS";
        const isLive = status === "LIV" || status === "R1" || status === "R2" || status === "R3" || status === "Q" || status === "Q1" || status === "Q2" || status === "Q3";
        const isFinished = status === "FT" || status === "CANC";

        matches.push({
          matchId,
          sport,
          homeScore: 0,
          awayScore: 0,
          minute: 0,
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
            matchKey: (race.competition?.name ?? race.name ?? "grand-prix").toLowerCase().replace(/\s+/g, "-"),
            homeTeam: race.competition?.name ?? race.name ?? "Grand Prix",
            awayTeam: race.circuit?.name ?? race.location ?? "Circuit",
            homeLogo: race.competition?.logo ?? "",
            awayLogo: race.circuit?.image ?? "",
            leagueId: race.competition?.id ?? 0,
            fixtureId,
            startTime: race.date ?? race.competition?.startDate ?? config.date.today,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        } else {
          metadata.set(metaKey, this.metadataCache.get(metaKey)!);
        }
      }

      if (matches.length > 0) {
        console.log(`[MultiSportFetcher][Formula 1] Found ${matches.length} races`);
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][Formula 1] Fetch failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  /** Golf uses RapidAPI live-golf-data endpoint */
  private async _fetchGolf(sport: Sport): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    try {
      const { data } = await this.golfClient.get<GolfEvent[]>("/schedule", {
        params: { orgId: 1, year: 2026 },
      });
      this._trackApiCall("golf");

      const events = Array.isArray(data) ? data : [];
      for (const event of events) {
        const fixtureId = event.id;
        const matchId = this._generateMatchId(sport, fixtureId, 0, 0);
        const metaKey = `${sport}:${fixtureId}`;

        const isLive = event.status === "live" || event.status === "ongoing";
        const isFinished = event.status === "finished" || event.status === "completed";

        matches.push({
          matchId,
          sport,
          homeScore: 0,
          awayScore: 0,
          minute: 0,
          redCards: 0,
          penaltyShootout: false,
          isFinished,
          timestamp: Math.floor(Date.now() / 1000),
          status: isFinished ? "FT" : isLive ? "LIV" : "NS",
        });

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport,
            matchKey: event.name?.toLowerCase().replace(/\s+/g, "-") ?? "golf-event",
            homeTeam: event.name ?? "Tournament",
            awayTeam: event.course ?? event.location ?? "Course",
            homeLogo: "",
            awayLogo: "",
            leagueId: 1,
            fixtureId,
            startTime: event.startDate ?? config.date.today,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        }
      }

      if (matches.length > 0) {
        console.log(`[MultiSportFetcher][Golf] Found ${matches.length} tournaments`);
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][Golf] Fetch failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Fallback: The Odds API
  // ═══════════════════════════════════════════════════════════════

  private async _fetchFromOddsApi(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("oddsApi")) return { matches, metadata };

    try {
      // Get active sports from Odds API
      const { data: sports } = await this.oddsApiClient.get<OddsApiSport[]>("/sports", {
        params: { apiKey: config.sportsApi.oddsApi.key, all: true },
      });

      // Score endpoints for each active sport
      const activeSports = (sports ?? []).filter((s) => s.active).slice(0, 5); // limit to avoid OOM

      const scoreResults = await Promise.allSettled(
        activeSports.map((s) =>
          this.oddsApiClient.get<OddsApiEvent[]>(`/sports/${s.key}/scores`, {
            params: {
              apiKey: config.sportsApi.oddsApi.key,
              daysFrom: 1,
            },
          }).then((res) => ({ sportKey: s.key, sportTitle: s.title, data: res.data }))
        )
      );

      for (const result of scoreResults) {
        if (result.status !== "fulfilled") continue;

        const { sportKey, sportTitle, data: events } = result.value;
        this._trackApiCall("oddsApi");

        // Map Odds API sport keys to our Sport type
        const mappedSport = this._mapOddsSport(sportKey);
        if (!mappedSport) continue;

        for (const event of events ?? []) {
          const fixtureId = this._hashId(event.id);
          const homeId = this._hashId(event.home_team);
          const awayId = this._hashId(event.away_team);
          const matchId = this._generateMatchId(mappedSport, fixtureId, homeId, awayId);
          const metaKey = `${mappedSport}:odds-${event.id}`;

          const homeScore = parseInt(event.scores?.find((s) => s.name === event.home_team)?.score ?? "0", 10) || 0;
          const awayScore = parseInt(event.scores?.find((s) => s.name === event.away_team)?.score ?? "0", 10) || 0;

          matches.push({
            matchId,
            sport: mappedSport,
            homeScore: Math.min(homeScore, 255),
            awayScore: Math.min(awayScore, 255),
            minute: 0,
            redCards: 0,
            penaltyShootout: false,
            isFinished: event.completed,
            timestamp: Math.floor(Date.now() / 1000),
            status: event.completed ? "FT" : "LIV",
          });

          if (!this.metadataCache.has(metaKey)) {
            const meta: MatchMetadata = {
              matchId,
              sport: mappedSport,
              matchKey: `${event.home_team.slice(0, 3).toLowerCase()}-${event.away_team.slice(0, 3).toLowerCase()}`,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              homeLogo: "",
              awayLogo: "",
              leagueId: 0,
              fixtureId,
              startTime: event.commence_time,
            };
            this.metadataCache.set(metaKey, meta);
            metadata.set(metaKey, meta);
          }
        }
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][OddsAPI] Failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  /** Map Odds API sport keys to our Sport type */
  private _mapOddsSport(oddsKey: string): Sport | null {
    if (oddsKey.includes("soccer") || oddsKey.includes("football")) return "football";
    if (oddsKey.includes("basketball_nba")) return "nba";
    if (oddsKey.includes("basketball")) return "basketball";
    if (oddsKey.includes("baseball")) return "baseball";
    if (oddsKey.includes("icehockey") || oddsKey.includes("hockey")) return "hockey";
    if (oddsKey.includes("americanfootball")) return "american-football";
    if (oddsKey.includes("mma") || oddsKey.includes("mixed_martial")) return "mma";
    if (oddsKey.includes("rugby")) return "rugby";
    if (oddsKey.includes("aussierules") || oddsKey.includes("afl")) return "afl";
    if (oddsKey.includes("volleyball")) return "volleyball";
    if (oddsKey.includes("handball")) return "handball";
    if (oddsKey.includes("golf")) return "golf";
    if (oddsKey.includes("tennis")) return "football"; // tennis not in our Sport type, map to generic
    if (oddsKey.includes("formula") || oddsKey.includes("racing")) return "formula1";
    return null;
  }

  /** Simple string → number hash for Odds API event IDs (which are hex strings) */
  private _hashId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // ═══════════════════════════════════════════════════════════════
  //  Fallback: football-data.org
  // ═══════════════════════════════════════════════════════════════

  private async _fetchFromFootballData(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("footballData")) return { matches, metadata };

    try {
      const { data } = await this.footballDataClient.get<{ matches: FootballDataMatch[] }>("/matches");
      this._trackApiCall("footballData");

      for (const match of data?.matches ?? []) {
        const fixtureId = match.id;
        const homeId = match.homeTeam.id;
        const awayId = match.awayTeam.id;
        const matchId = this._generateMatchId("football", fixtureId, homeId, awayId);
        const metaKey = `football:fd-${fixtureId}`;

        const isFinished = match.status === "FINISHED";
        const isLive = match.status === "LIVE" || match.status === "IN_PLAY";

        if (!isLive && !isFinished) continue;

        matches.push({
          matchId,
          sport: "football",
          homeScore: match.score.fullTime.home ?? 0,
          awayScore: match.score.fullTime.away ?? 0,
          minute: 0,
          redCards: 0,
          penaltyShootout: false,
          isFinished,
          timestamp: Math.floor(Date.now() / 1000),
          status: isFinished ? "FT" : "LIV",
        });

        if (!this.metadataCache.has(metaKey)) {
          const meta: MatchMetadata = {
            matchId,
            sport: "football",
            matchKey: `${match.homeTeam.name.slice(0, 3).toLowerCase()}-${match.awayTeam.name.slice(0, 3).toLowerCase()}`,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeLogo: "",
            awayLogo: "",
            leagueId: match.competition.id,
            fixtureId,
            startTime: match.utcDate,
          };
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        }
      }

      if (matches.length > 0) {
        console.log(`[MultiSportFetcher][FootballData] Found ${matches.length} matches`);
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][FootballData] Failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Fallback: SportAPI7 RapidAPI
  // ═══════════════════════════════════════════════════════════════

  private async _fetchFromSportApi7(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];

    if (this.isRateLimited("sportapi7")) return { matches, metadata };

    try {
      // Get today's events across sports
      const { data } = await this.sportapi7Client.get<{ events: SportApi7Event[] }>("/event/live", {
        params: { sportId: 1, date: config.date.today },
      });
      this._trackApiCall("sportapi7");

      for (const event of data?.events ?? []) {
        const fixtureId = event.id;
        const matchId = this._generateMatchId("football", fixtureId, fixtureId, fixtureId + 1);
        const metaKey = `sportapi7:${fixtureId}`;

        matches.push({
          matchId,
          sport: "football",
          homeScore: event.homeScore?.total ?? 0,
          awayScore: event.awayScore?.total ?? 0,
          minute: 0,
          redCards: 0,
          penaltyShootout: false,
          isFinished: event.status === "FT" || event.status === "FINISHED",
          timestamp: Math.floor(Date.now() / 1000),
          status: "LIV",
        });
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][SportAPI7] Failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public — Twitter/X Integration
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch user data from X/Twitter via RapidAPI.
   * Used by the X Bot for @mentions and user lookups.
   */
  async fetchTwitterUsers(userIds: string[]): Promise<any[]> {
    try {
      const { data } = await axios.get("https://twitter241.p.rapidapi.com/get-users-v2", {
        headers: {
          "x-rapidapi-host": "twitter241.p.rapidapi.com",
          "x-rapidapi-key": this.rapidApiKey,
          "Content-Type": "application/json",
        },
        params: { users: userIds.join(",") },
        timeout: 10_000,
      });
      return data?.data?.users ?? [];
    } catch (err) {
      console.warn("[MultiSportFetcher][Twitter] Failed:", (err as Error).message);
      return [];
    }
  }

  /**
   * Fetch recent tweets from the GoalSwapAgent account for engagement.
   */
  async fetchTwitterPosts(userId: string, count = 10): Promise<any[]> {
    try {
      const { data } = await axios.get("https://twitter241.p.rapidapi.com/get-user-posts", {
        headers: {
          "x-rapidapi-host": "twitter241.p.rapidapi.com",
          "x-rapidapi-key": this.rapidApiKey,
          "Content-Type": "application/json",
        },
        params: { userId, count },
        timeout: 10_000,
      });
      return data?.data?.posts ?? [];
    } catch (err) {
      console.warn("[MultiSportFetcher][Twitter] Posts fetch failed:", (err as Error).message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════

  private _generateMatchId(sport: string, fixtureId: number, homeId: number, awayId: number): `0x${string}` {
    return keccak256(stringToHex(`${sport}-${fixtureId}-${homeId}-${awayId}`));
  }

  private _toMatchKey(game: ApiSportsGame): string {
    const home = game.teams?.home?.name?.toLowerCase().slice(0, 3) ?? "hom";
    const away = game.teams?.away?.name?.toLowerCase().slice(0, 3) ?? "awy";
    return `${home}-${away}`;
  }

  private _extractScore(score: unknown, sport: Sport): number {
    if (!score) return 0;
    if (typeof score === "number") return score;
    if (typeof score === "string") return parseInt(score, 10) || 0;

    const obj = score as Record<string, unknown>;

    // Different sports use different score fields
    if (sport === "baseball") {
      // Baseball: scores.home.runs or scores.home.total
      return typeof obj.runs === "number" ? obj.runs :
             typeof obj.total === "number" ? obj.total : 0;
    }

    // Standard: total, points
    const val = obj.total ?? obj.points ?? obj.home ?? obj.away ?? 0;
    return typeof val === "number" ? val : Number(val) || 0;
  }

  private _extractMinute(game: ApiSportsGame, sport: Sport, isFinished: boolean): number {
    const elapsed = game.status?.elapsed;
    if (typeof elapsed === "number" && elapsed > 0) return elapsed;

    if (isFinished) {
      // Default match durations by sport
      const durations: Record<string, number> = {
        football: 90,
        basketball: 40,
        nba: 48,
        afl: 100,
        baseball: 9,
        handball: 60,
        hockey: 60,
        "american-football": 60,
        rugby: 80,
        volleyball: 5,
        mma: 5,
      };
      return durations[sport] ?? 90;
    }

    return 0;
  }

  private _isLiveStatus(sport: Sport, status: string): boolean {
    const liveSet = new Set(["LIV", "1H", "2H", "HT", "ET", "P", "1Q", "2Q", "3Q", "4Q", "OT",
      "R1", "R2", "R3", "Q", "Q1", "Q2", "Q3",
      "SET1", "SET2", "SET3", "SET4", "SET5",
      "IN_PLAY", "LIVE", "PERIOD1", "PERIOD2", "PERIOD3",
      "HALFTIME", "BREAK",
    ]);
    return liveSet.has(status) || status.startsWith("Q") || status.startsWith("R");
  }

  private _isFinishedStatus(sport: Sport, status: string): boolean {
    const finishedSet = new Set(["FT", "AET", "PEN", "CANC", "AOT", "FF", "WO", "INT",
      "FINISHED", "COMPLETED", "POSTPONED",
    ]);
    return finishedSet.has(status);
  }

  isRateLimited(api: string): boolean {
    this._checkReset();
    const limit = api === "oddsApi" ? 1000 :
                  api === "footballData" ? 100 :
                  api === "sportapi7" ? 500 :
                  api === "golf" ? 500 : 100;
    return (this.apiCallsToday[api] ?? 0) >= limit;
  }

  isBackedOff(source: string): boolean {
    const state = this.backoffState[source];
    if (!state || state.failures === 0) return false;
    return Date.now() < state.nextRetryAt;
  }

  private _recordFailure(source: string): void {
    const state = this.backoffState[source] ?? { failures: 0, nextRetryAt: 0 };
    state.failures++;
    const delay = Math.min(1000 * Math.pow(2, state.failures - 1), 60_000);
    state.nextRetryAt = Date.now() + delay;
    this.backoffState[source] = state;
  }

  _trackApiCall(api: string): void {
    this._checkReset();
    this.apiCallsToday[api] = (this.apiCallsToday[api] ?? 0) + 1;
  }

  private _checkReset(): void {
    const now = Date.now();
    if (now >= this.apiCallsResetAt) {
      this.apiCallsToday = {};
      this.apiCallsResetAt = now + 86_400_000;
    }
  }
}
