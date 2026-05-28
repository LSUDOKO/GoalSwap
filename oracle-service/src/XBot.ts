/**
 * GoalSwap Arena — X (Twitter) Bot
 *
 * Posts match updates, goal alerts, and platform insights
 * to the @GoalSwapAgent X/Twitter account.
 *
 * Uses twitter241.p.rapidapi.com for user lookups + content fetching,
 * and logs outbound tweets for manual posting until full OAuth 2.0
 * credentials are configured.
 *
 * To enable auto-posting, set these env vars:
 *   TWITTER_API_KEY, TWITTER_API_SECRET,
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 * (Official Twitter/X API v2 with OAuth 2.0)
 *
 * Run: Part of the oracle service (index.ts)
 */

import axios from "axios";
import { SPORT_INFO } from "./types.js";
import type { StateChange, MatchMetadata, Sport } from "./types.js";

interface TweetContent {
  text: string;
  mediaUrls?: string[];
  replyToId?: string;
}

/** Sport → hashtag mapping for tweets */
const SPORT_HASHTAGS: Record<string, string> = {
  football: "WorldCup2026",
  nba: "NBA",
  basketball: "EuroLeague",
  baseball: "MLB",
  hockey: "NHL",
  "american-football": "NFL",
  mma: "MMA",
  formula1: "F1",
  afl: "AFL",
  rugby: "Rugby",
  volleyball: "Volleyball",
  handball: "Handball",
  golf: "Golf",
};

function sportHashtag(sport: string): string {
  return SPORT_HASHTAGS[sport] ?? sport.charAt(0).toUpperCase() + sport.slice(1);
}

function sportEmoji(sport: string): string {
  const info = SPORT_INFO[sport as Sport];
  return info?.icon ?? "⚽";
}

export class XBot {
  private rapidApiKey: string;
  private apiBaseUrl: string;
  private dryRun: boolean;
  private postedIds = new Set<string>();

  /** GoalSwapAgent user ID on X */
  private agentUserId: string;
  private agentUsername: string;

  /** Track stats for periodic summary tweets */
  private goalCount = 0;
  private settlementCount = 0;
  private lastSummaryAt = Date.now();
  private summaryIntervalMs = 3600_000; // 1 hour

  constructor() {
    this.rapidApiKey = process.env.RAPIDAPI_KEY ?? "";
    this.apiBaseUrl = "https://twitter241.p.rapidapi.com";
    this.dryRun = true; // set to false when OAuth 2.0 is configured
    this.agentUserId = process.env.X_AGENT_USER_ID ?? "";
    this.agentUsername = process.env.X_AGENT_USERNAME ?? "GoalSwapAgent";
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public API  (called from oracle poll cycle)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Called when a state change is detected in the oracle.
   * Posts appropriate tweet based on change type.
   */
  async onStateChange(
    change: StateChange,
    meta: MatchMetadata | undefined,
  ): Promise<void> {
    if (!meta) return;

    // Dedup: only one post per matchId+changeType at a time
    const dedupKey = `${change.matchId}-${change.changeType}`;
    if (this.postedIds.has(dedupKey)) return;
    this.postedIds.add(dedupKey);
    if (this.postedIds.size > 1000) {
      const arr = Array.from(this.postedIds);
      this.postedIds = new Set(arr.slice(arr.length - 500));
    }

    // Soft dedup: clear after 30s to allow re-posting on next change
    setTimeout(() => this.postedIds.delete(dedupKey), 30_000);

    const sport = meta.sport ?? "football";
    const emoji = sportEmoji(sport);
    const tags = `#GoalSwap #${sportHashtag(sport)}\n@XLayerOfficial @Uniswap @flapdotsh`;

    switch (change.changeType) {
      case "GOAL": {
        this.goalCount++;
        const state = change.newState;
        const prev = change.previousState;
        const scoringTeam = state.homeScore > prev.homeScore ? meta.homeTeam : meta.awayTeam;

        if (state.homeScore === 0 && state.awayScore === 0) return;

        const text =
          `⚽ GOAL! ${scoringTeam} scores!\n\n` +
          `${emoji} ${meta.homeTeam} ${state.homeScore} - ${state.awayScore} ${meta.awayTeam}\n` +
          `⏱️ ${state.minute}'\n` +
          tags;

        await this._postTweet({ text });
        break;
      }

      case "SETTLEMENT": {
        this.settlementCount++;
        const state = change.newState;
        const winner = state.homeScore > state.awayScore ? meta.homeTeam :
                       state.awayScore > state.homeScore ? meta.awayTeam :
                       "Draw";

        const text =
          `🏁 MATCH SETTLED\n\n` +
          `${emoji} ${meta.homeTeam} ${state.homeScore} - ${state.awayScore} ${meta.awayTeam}\n` +
          `🏆 Winner: ${winner}\n` +
          `Trade outcomes on GoalSwap → goalswap.xyz\n` +
          tags;

        await this._postTweet({ text });
        break;
      }

      case "MINUTE_ADVANCE":
      case "STATUS_CHANGE": {
        if (Math.random() > 0.3) return;
        const state = change.newState;

        const text =
          `🔄 Match Update\n\n` +
          `${emoji} ${meta.homeTeam} ${state.homeScore} - ${state.awayScore} ${meta.awayTeam}\n` +
          `⏱️ ${state.minute}' | ${state.isFinished ? "FT" : "LIVE"}\n` +
          `Trade on GoalSwap → goalswap.xyz\n` +
          `@XLayerOfficial @Uniswap @flapdotsh`;

        await this._postTweet({ text });
        break;
      }
    }
  }

  /**
   * Post a periodic summary of recent activity.
   */
  async postSummary(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSummaryAt < this.summaryIntervalMs) return;
    this.lastSummaryAt = now;

    const text =
      `📊 GoalSwap Arena — Hourly Update\n\n` +
      `⚽ ${this.goalCount} goals scored\n` +
      `🏁 ${this.settlementCount} matches settled\n\n` +
      `Trade live sports outcomes on X Layer\n` +
      `→ goalswap.xyz\n` +
      `@XLayerOfficial @Uniswap @flapdotsh`;

    await this._postTweet({ text });
    this.goalCount = 0;
    this.settlementCount = 0;
  }

  /**
   * Fetch recent mentions of @GoalSwapAgent and check for engagement.
   */
  async checkMentions(): Promise<void> {
    try {
      const { data } = await axios.get(`${this.apiBaseUrl}/get-user-posts`, {
        headers: {
          "x-rapidapi-host": "twitter241.p.rapidapi.com",
          "x-rapidapi-key": this.rapidApiKey,
          "Content-Type": "application/json",
        },
        params: { userId: this.agentUserId, count: 10 },
        timeout: 10_000,
      });

      const posts = data?.data?.posts ?? [];
      const mentions = posts.filter((p: any) =>
        p.text?.toLowerCase().includes(`@${this.agentUsername.toLowerCase()}`)
      );

      if (mentions.length > 0) {
        console.log(`[XBot] 💬 ${mentions.length} mentions found (dry-run, no auto-reply yet)`);
      }
    } catch (err) {
      // Silently fail — non-critical
    }
  }

  /**
   * Check if auto-posting would be active (dryRun mode).
   */
  isDryRun(): boolean {
    return this.dryRun;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal
  // ═══════════════════════════════════════════════════════════════

  private async _postTweet(content: TweetContent): Promise<void> {
    if (this.dryRun) {
      console.log(`[XBot] 📝 Would tweet (${content.text.length} chars): ${content.text.slice(0, 120)}...`);
      return;
    }

    try {
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET;
      const accessToken = process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = process.env.TWITTER_ACCESS_SECRET;

      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log("[XBot] ⚠️ OAuth credentials not configured. Set TWITTER_* env vars to enable auto-posting.");
        console.log(`[XBot] 📝 Would tweet: ${content.text.slice(0, 80)}...`);
        return;
      }

      const { data } = await axios.post(
        "https://api.twitter.com/2/tweets",
        { text: content.text },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10_000,
        },
      );

      console.log(`[XBot] ✅ Tweet posted: ${(data as any)?.data?.id ?? "unknown"}`);
    } catch (err) {
      console.warn("[XBot] ❌ Failed to post tweet:", (err as Error).message);
      console.log("[XBot] 📝 Would tweet:", content.text.slice(0, 100));
    }
  }
}
