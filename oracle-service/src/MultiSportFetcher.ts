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
 *
 * PRIMARY FOOTBALL SOURCE:
 *  - Sportmonks (v3) — livescores, odds, teams, squads
 *  - api-sports.io football is used as fallback
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

// ═══════════════════════════════════════════════════════════════
//  Sportmonks API Types
// ═══════════════════════════════════════════════════════════════

/** Sportmonks response wrapper */
interface SportmonksResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
    subscription?: Array<{
      meta: Array<{ ends_at?: string }>;
      plans: Array<{ name: string }>;
    }>;
  };
  message?: string;
}

/** Sportmonks fixture shape */
interface SportmonksFixture {
  id: number;
  name?: string;
  status?: string;
  starting_at?: string;
  minute?: number;
  league_id?: number;
  scores?: Array<{
    team_id: number;
    type_id: number;
    score: {
      current?: string | number;
      halftime?: string | number;
      fulltime?: string | number;
    };
    description: string;
  }>;
  participants?: Array<{
    id: number;
    name?: string;
    image_path?: string;
    meta?: {
      location: "home" | "away";
    };
  }>;
  league?: {
    id: number;
    name: string;
    image_path?: string;
    country?: {
      id: number;
      name: string;
      image_path?: string;
    };
  };
  odds?: Array<{
    id: number;
    name?: string;
    probability?: string;
    odds?: Array<{
      id: number;
      name: string;
      value: string;
      probability?: string;
      bookmaker?: {
        id: number;
        name: string;
      };
    }>;
  }>;
}

/** Sportmonks round shape (for odds) */
interface SportmonksRound {
  id: number;
  name: string;
  start?: string;
  end?: string;
  fixtures?: SportmonksFixture[];
}

/** Sportmonks team shape */
interface SportmonksTeam {
  id: number;
  name: string;
  image_path?: string;
  short_code?: string;
  upcoming?: SportmonksFixture[];
  squad?: SportmonksSquadMember[];
}

/** Sportmonks player shape */
interface SportmonksPlayer {
  id: number;
  name: string;
  image_path?: string;
  nationality?: {
    id: number;
    name: string;
    image_path?: string;
  };
  position?: {
    id: number;
    name: string;
  };
  statistics?: Array<{
    details?: Array<{
      id: number;
      type?: {
        id: number;
        name: string;
      };
      value?: string | number;
    }>;
  }>;
}

/** Sportmonks squad member */
interface SportmonksSquadMember {
  id: number;
  player?: SportmonksPlayer;
  team?: SportmonksTeam;
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

/** Sportmonks fixture status mapping */
const SPORTMONKS_STATUS_MAP: Record<string, MatchStatus> = {
  "live": "LIV",
  "inprogress": "LIV",
  "in_progress": "LIV",
  "1st_half": "LIV",
  "2nd_half": "LIV",
  "halftime": "LIV",
  "extra_time": "LIV",
  "extra": "LIV",
  "penalties": "LIV",
  "finished": "FT",
  "ended": "FT",
  "full_time": "FT",
  "awarded": "FT",
  "walkover": "FT",
  "not_started": "NS",
  "postponed": "PST",
  "cancelled": "CANC",
  "interrupted": "INT",
  "suspended": "SUSP",
  "abandoned": "CANC",
};

/** Sportmonks status → live check */
const SPORTMONKS_LIVE_STATUSES = new Set([
  "live", "inprogress", "in_progress", "1st_half", "2nd_half",
  "halftime", "extra_time", "extra", "penalties",
]);

/** Sportmonks status → finished check */
const SPORTMONKS_FINISHED_STATUSES = new Set([
  "finished", "ended", "full_time", "awarded", "walkover",
]);

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

  /** Sportmonks client (primary football source) */
  private sportmonksClient: AxiosInstance;

  /** Sportmonks token */
  private sportmonksToken: string;

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

    // Initialize Sportmonks client (primary football data source)
    this.sportmonksToken = process.env.SPORTMONKS_TOKEN ?? "";
    this.sportmonksClient = axios.create({
      baseURL: config.sportsApi.sportmonks.baseUrl,
      timeout: 15_000,
      params: {
        api_token: this.sportmonksToken,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch live matches from ALL sports in parallel.
   * Football uses Sportmonks as PRIMARY source, with api-sports.io as fallback.
   */
  async fetchAllSports(): Promise<{ matches: MatchUpdate[]; metadata: Map<string, MatchMetadata> }> {
    const allMatches: MatchUpdate[] = [];
    const allMetadata = new Map<string, MatchMetadata>();

    const sports = Object.keys(SPORT_INFO) as Sport[];

    // Fetch all sports in parallel — football uses Sportmonks first
    const results = await Promise.allSettled(
      sports.map((sport) => {
        // Football: use Sportmonks as primary, api-sports.io as fallback
        if (sport === "football") {
          return this._fetchSportmonksFootball().catch((err) => {
            console.warn(`[MultiSportFetcher][Sportmonks] Failed:`, err.message);
            console.warn(`[MultiSportFetcher][Football] Falling back to api-sports.io...`);
            return this._fetchSport(sport).catch((err2) => {
              console.warn(`[MultiSportFetcher][Football] api-sports.io also failed:`, err2.message);
              return { matches: [], metadata: new Map() };
            });
          });
        }
        // All other sports use generic api-sports.io
        return this._fetchSport(sport).catch((err) => {
          console.warn(`[MultiSportFetcher][${sport}] Failed:`, err.message);
          return { matches: [], metadata: new Map() };
        });
      })
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

    // Fetch from Sportmonks odds/rounds as supplementary
    const smOddsResult = await this._fetchSportmonksOdds().catch(() => ({ matches: [], metadata: new Map() }));
    allMatches.push(...smOddsResult.matches);
    for (const [key, meta] of smOddsResult.metadata) {
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
    limits["sportmonks"] = config.sportsApi.sportmonks.rateLimitPerDay;
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
  //  Sportmonks — Primary Football Data Source
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch football data from Sportmonks (primary).
   * Uses livescores/inplay + scheduled fixtures.
   */
  async _fetchSportmonksFootball(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];
    if (!this.sportmonksToken) return { matches, metadata };

    try {
      // Step 1: Fetch inplay livescores with participants, scores, state, and periods
      const { data: livescores } = await this.sportmonksClient.get<
        SportmonksResponse<SportmonksFixture>
      >(config.sportsApi.sportmonks.livescoresUrl, {
        params: {
          include: "participants;scores;state;periods",
        },
      });
      this._trackApiCall("sportmonks");

      const inplayFixtures = livescores?.data ?? [];
      console.log(`[MultiSportFetcher][Sportmonks] Found ${inplayFixtures.length} in-play fixtures`);

      for (const fixture of inplayFixtures) {
        const matchUpdate = this._sportmonksFixtureToMatchUpdate(fixture, false);
        if (matchUpdate) {
          matches.push(matchUpdate.update);
          const meta = matchUpdate.meta;
          const metaKey = `football:sm-${fixture.id}`;
          this.metadataCache.set(metaKey, meta);
          metadata.set(metaKey, meta);
        }
      }

      // Step 2: Fetch scheduled/live fixtures across the next 7 days
      // Broader date range catches friendlies, pre-season, and off-season matches
      const todayStr = config.date.today;
      const dates: string[] = [todayStr];
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
      const scheduledFixtures: SportmonksFixture[] = [];
      for (const date of dates) {
        try {
          const { data: dayFixtures } = await this.sportmonksClient.get<
            SportmonksResponse<SportmonksFixture>
          >("/football/fixtures/date/" + date, {
            params: {
              include: "participants;scores;state",
              per_page: 50,
            },
          });
          this._trackApiCall("sportmonks");
          scheduledFixtures.push(...(dayFixtures?.data ?? []));
        } catch {
          // Skip failed date — continue to the next
        }
      }

      const scheduledFixtures = todayFixtures?.data ?? [];
      const existingIds = new Set(matches.map((m) => m.matchId));

      for (const fixture of scheduledFixtures) {
        // Skip if already added from livescores
        // allowNotStarted=true to include upcoming/NS matches in the feed
        const tempUpdate = this._sportmonksFixtureToMatchUpdate(fixture, true);
        if (!tempUpdate) continue;
        if (existingIds.has(tempUpdate.update.matchId)) continue;

        matches.push(tempUpdate.update);
        const metaKey = `football:sm-${fixture.id}`;
        this.metadataCache.set(metaKey, tempUpdate.meta);
        metadata.set(metaKey, tempUpdate.meta);
      }

      console.log(`[MultiSportFetcher][Sportmonks] Total: ${matches.length} fixtures (${inplayFixtures.length} live + ${scheduledFixtures.length} scheduled)`);
    } catch (err) {
      this._recordFailure("sportmonks");
      throw err;
    }

    return { matches, metadata };
  }

  /**
   * Convert Sportmonks fixture to our MatchUpdate + Metadata.
   */
  private _sportmonksFixtureToMatchUpdate(
    fixture: SportmonksFixture,
    allowNotStarted: boolean,
  ): { update: MatchUpdate; meta: MatchMetadata } | null {
    const rawStatus = (fixture.status ?? "not_started").toLowerCase().replace(/\s+/g, "_");
    const mappedStatus = SPORTMONKS_STATUS_MAP[rawStatus] ?? "NS";
    const isLive = SPORTMONKS_LIVE_STATUSES.has(rawStatus);
    const isFinished = SPORTMONKS_FINISHED_STATUSES.has(rawStatus);

    // Only skip non-live/non-finished when allowNotStarted is false (inplay call)
    if (!isLive && !isFinished) {
      if (!allowNotStarted) return null;
      // allowNotStarted=true (scheduled call): allow NS through so upcoming matches appear
    }

    // Extract home/away participants
    const homeParticipant = fixture.participants?.find((p) => p.meta?.location === "home");
    const awayParticipant = fixture.participants?.find((p) => p.meta?.location === "away");
    const homeName = homeParticipant?.name ?? "Home";
    const awayName = awayParticipant?.name ?? "Away";
    const homeLogo = homeParticipant?.image_path ?? "";
    const awayLogo = awayParticipant?.image_path ?? "";

    // If participants are missing, extract team IDs from scores array
    const teamIds = fixture.scores?.map(s => s.team_id) ?? [];
    const resolvedHomeId = homeParticipant?.id ?? teamIds[0] ?? fixture.id;
    const resolvedAwayId = awayParticipant?.id ?? teamIds[1] ?? fixture.id;

    // Extract scores — Sportmonks scores array:
    //   type_id: 1 = current score (live), 3 = fulltime (finished)
    // Use type 1 for live matches, fall back to type 3 for finished
    const scoreTypeId = isFinished ? 3 : 1;
    const homeScoreEntry = fixture.scores?.find(
      (s) => s.team_id === resolvedHomeId && s.type_id === scoreTypeId
    );
    // Fallback: if the preferred type_id isn't found, try the other one
    const homeScoreFallback = !homeScoreEntry ? fixture.scores?.find(
      (s) => s.team_id === resolvedHomeId && s.type_id === (isFinished ? 1 : 3)
    ) : undefined;
    const awayScoreEntry = fixture.scores?.find(
      (s) => s.team_id === resolvedAwayId && s.type_id === scoreTypeId
    );
    const awayScoreFallback = !awayScoreEntry ? fixture.scores?.find(
      (s) => s.team_id === resolvedAwayId && s.type_id === (isFinished ? 1 : 3)
    ) : undefined;
    const bestHome = homeScoreEntry ?? homeScoreFallback;
    const bestAway = awayScoreEntry ?? awayScoreFallback;
    const homeScore =
      bestHome?.score?.current != null
        ? Number(bestHome.score.current) || 0
        : 0;
    const awayScore =
      bestAway?.score?.current != null
        ? Number(bestAway.score.current) || 0
        : 0;

    const minute = fixture.minute ?? (isFinished ? 90 : 0);
    const startTime = fixture.starting_at ?? config.date.today;
    const matchId = this._generateMatchId("football", fixture.id, resolvedHomeId, resolvedAwayId);
    const matchKey = `${homeName.slice(0, 3).toLowerCase()}-${awayName.slice(0, 3).toLowerCase()}`;
    const leagueId = fixture.league?.id ?? 0;
    const leagueName = fixture.league?.name ?? "";

    const update: MatchUpdate = {
      matchId,
      sport: "football",
      homeScore: Math.min(homeScore, 255),
      awayScore: Math.min(awayScore, 255),
      minute: Math.min(minute, 999),
      redCards: 0,
      penaltyShootout: false,
      isFinished,
      timestamp: Math.floor(Date.now() / 1000),
      status: mappedStatus,
    };

    const meta: MatchMetadata = {
      matchId,
      sport: "football",
      matchKey,
      homeTeam: homeName,
      awayTeam: awayName,
      homeLogo,
      awayLogo,
      leagueId,
      fixtureId: fixture.id,
      startTime,
    };

    return { update, meta };
  }

  /**
   * Fetch odds data from Sportmonks rounds endpoint.
   * GET /football/rounds/{roundId}?include=fixtures.odds.market;fixtures.odds.bookmaker;fixtures.participants;league.country
   */
  async _fetchSportmonksOdds(): Promise<{
    matches: MatchUpdate[];
    metadata: Map<string, MatchMetadata>;
  }> {
    const metadata = new Map<string, MatchMetadata>();
    const matches: MatchUpdate[] = [];
    if (!this.sportmonksToken) return { matches, metadata };

    try {
      // First, get active leagues to find current rounds
      // Use a few known active leagues: World Cup (1), Premier League (8), La Liga (12), etc.
      const leagueIds = [1, 8, 12, 41, 94, 144];
      const roundResults = await Promise.allSettled(
        leagueIds.map((leagueId) =>
          this.sportmonksClient.get<SportmonksResponse<SportmonksRound>>(
            `/football/rounds`,
            {
              params: {
                "filter[league_id]": leagueId,
                "filter[current]": 1,
                per_page: 3,
                include: "fixtures.odds.market;fixtures.odds.bookmaker;fixtures.participants;league.country",
              },
            }
          )
        )
      );

      let oddsCount = 0;
      for (const result of roundResults) {
        if (result.status !== "fulfilled") continue;
        this._trackApiCall("sportmonks");

        const rounds = result.value.data?.data ?? [];
        for (const round of rounds) {
          for (const fixture of round.fixtures ?? []) {
            if (!fixture.odds || fixture.odds.length === 0) continue;
            oddsCount++;

            // Store odds info in metadata or log them
            const homeParticipant = fixture.participants?.find(
              (p) => p.meta?.location === "home"
            );
            const awayParticipant = fixture.participants?.find(
              (p) => p.meta?.location === "away"
            );
            const homeName = homeParticipant?.name ?? "Home";
            const awayName = awayParticipant?.name ?? "Away";
            const homeId = homeParticipant?.id ?? fixture.id;
            const awayId = awayParticipant?.id ?? fixture.id;
            const matchId = this._generateMatchId("football", fixture.id, homeId, awayId);

            // Find 1X2 market odds
            const matchResult = fixture.odds.find(
              (o) => o.name?.toLowerCase().includes("match result") || o.name?.toLowerCase().includes("1x2")
            );
            if (matchResult?.odds) {
              const homeOdds = matchResult.odds.find((o) => o.name === "1");
              const drawOdds = matchResult.odds.find((o) => o.name === "X");
              const awayOdds = matchResult.odds.find((o) => o.name === "2");
              if (homeOdds && drawOdds && awayOdds) {
                // Log odds — frontend can use these via the API
                console.log(
                  `[MultiSportFetcher][Sportmonks] Odds: ${homeName} vs ${awayName} → ` +
                  `${homeOdds.value} / ${drawOdds.value} / ${awayOdds.value}`
                );
              }
            }
          }
        }
      }

      if (oddsCount > 0) {
        console.log(`[MultiSportFetcher][Sportmonks] Found odds for ${oddsCount} fixtures`);
      }
    } catch (err) {
      console.warn("[MultiSportFetcher][Sportmonks] Odds fetch failed:", (err as Error).message);
    }

    return { matches, metadata };
  }

  /**
   * Fetch team details from Sportmonks.
   * GET /football/teams/{teamId}?include=upcoming.participants;upcoming.league
   */
  async fetchSportmonksTeam(teamId: number): Promise<SportmonksTeam | null> {
    if (!this.sportmonksToken) return null;

    try {
      const { data } = await this.sportmonksClient.get<{ data: SportmonksTeam }>(
        `/football/teams/${teamId}`,
        {
          params: {
            include: "upcoming.participants;upcoming.league",
          },
        }
      );
      this._trackApiCall("sportmonks");
      return data?.data ?? null;
    } catch (err) {
      console.warn(`[MultiSportFetcher][Sportmonks] Team ${teamId} fetch failed:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Fetch squad details from Sportmonks.
   * GET /football/squads/teams/{teamId}?include=team;player.nationality;player.statistics.details.type;player.position&filters[playerstatisticSeasons]=25583
   */
  async fetchSportmonksSquad(teamId: number): Promise<SportmonksSquadMember[]> {
    if (!this.sportmonksToken) return [];

    try {
      const { data } = await this.sportmonksClient.get<{ data: SportmonksSquadMember[] }>(
        `/football/squads/teams/${teamId}`,
        {
          params: {
            include: "team;player.nationality;player.statistics.details.type;player.position",
            "filters[playerstatisticSeasons]": 25583,
          },
        }
      );
      this._trackApiCall("sportmonks");
      return data?.data ?? [];
    } catch (err) {
      console.warn(`[MultiSportFetcher][Sportmonks] Squad ${teamId} fetch failed:`, (err as Error).message);
      return [];
    }
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

        // Extract minute/duration
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
      const activeSports = (sports ?? []).filter((s) => s.active).slice(0, 5);

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
    if (oddsKey.includes("tennis")) return "football";
    if (oddsKey.includes("formula") || oddsKey.includes("racing")) return "formula1";
    return null;
  }

  /** Simple string → number hash for Odds API event IDs */
  private _hashId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
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

    if (sport === "baseball") {
      return typeof obj.runs === "number" ? obj.runs :
             typeof obj.total === "number" ? obj.total : 0;
    }

    const val = obj.total ?? obj.points ?? obj.home ?? obj.away ?? 0;
    return typeof val === "number" ? val : Number(val) || 0;
  }

  private _extractMinute(game: ApiSportsGame, sport: Sport, isFinished: boolean): number {
    const elapsed = game.status?.elapsed;
    if (typeof elapsed === "number" && elapsed > 0) return elapsed;

    if (isFinished) {
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
    const limit = api === "sportmonks" ? config.sportsApi.sportmonks.rateLimitPerDay :
                  api === "oddsApi" ? 1000 :
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
