/**
 * GoalSwap Telegram Bot — Push Notification Service
 *
 * Polls the oracle REST API every 30 seconds for match updates.
 * When a goal / settlement / status change is detected, it checks
 * active subscriptions and sends Telegram messages to subscribers.
 *
 * For production, this should be replaced with a webhook-based push
 * from the oracle's webhook-server directly to the Telegram API.
 */

import TelegramBot from "node-telegram-bot-api";
import { api } from "./api.js";
import {
  getSubscriptionsByMatchAndType,
  getSubscriptionsByMatch,
  getUser,
  addNotification,
} from "./db.js";
import { formatFeePct, getFeeEmoji } from "../types.js";
import type { MatchSummary, MatchDetail } from "../types.js";

// Track last-known state per matchId to detect changes
const lastKnownState = new Map<string, string>();

/**
 * Initialize the push notification poller.
 * Runs every `intervalMs` milliseconds.
 */
export function startNotificationPoller(
  bot: TelegramBot,
  intervalMs = 30_000,
  frontendUrl = "https://goalswap.xyz",
): () => void {
  console.log(`[Notifications] Starting poller every ${intervalMs / 1000}s`);

  const interval = setInterval(async () => {
    try {
      await pollCycle(bot, frontendUrl);
    } catch (err) {
      console.error("[Notifications] Poll cycle error:", (err as Error).message);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

async function pollCycle(bot: TelegramBot, frontendUrl: string): Promise<void> {
  const matches = await api.getMatches("live");

  for (const match of matches) {
    const stateKey = _stateKey(match);

    // First time seeing this match — record state but don't notify
    if (!lastKnownState.has(match.matchId)) {
      lastKnownState.set(match.matchId, stateKey);
      continue;
    }

    const prevStateKey = lastKnownState.get(match.matchId);
    if (prevStateKey === stateKey) continue; // No change

    // Detect what changed
    const prev = _parseStateKey(prevStateKey!);

    // 1. Goal scored
    if (match.homeScore > prev.homeScore || match.awayScore > prev.awayScore) {
      const scoringTeam = match.homeScore > prev.homeScore ? match.homeTeam : match.awayTeam;
      const detail = await api.getMatchDetail(match.matchId);

      await sendGoalAlert(bot, match, scoringTeam, detail, frontendUrl);
    }

    // 2. Match finished (settlement)
    if (match.isFinished && !prev.isFinished) {
      await sendSettlementAlert(bot, match, frontendUrl);
    }

    // Update last known state
    lastKnownState.set(match.matchId, stateKey);
  }
}

/**
 * Send goal alert to all subscribers of this match.
 */
async function sendGoalAlert(
  bot: TelegramBot,
  match: MatchSummary,
  scoringTeam: string,
  detail: MatchDetail | null,
  frontendUrl: string,
): Promise<void> {
  const feeStr = detail ? formatFeePct(detail.feeTier) : "—";
  const feeEmoji = detail ? getFeeEmoji(detail.feeTier) : "";

  const message = [
    `⚽ *GOAL! ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}*`,
    ``,
    `🏟️ ${match.homeTeam} vs ${match.awayTeam}`,
    `⏱️ ${match.minute}'`,
    `🎯 Scorer: ${scoringTeam}`,
    ``,
    `💹 Market Impact:`,
    `${feeEmoji} Fee: ${feeStr}${detail ? ` (${detail.feeReason})` : ""}`,
    ``,
    `[▶️ Trade Now](${frontendUrl}/match/${match.matchId})`,
  ].join("\n");

  const subscriptions = getSubscriptionsByMatchAndType(match.matchId, "goal");
  const sent = new Set<number>();

  for (const sub of subscriptions) {
    if (sent.has(sub.userId)) continue;
    sent.add(sub.userId);

    try {
      await bot.sendMessage(sub.userId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "▶️ Trade Now", url: `${frontendUrl}/match/${match.matchId}` },
              { text: "📊 View Match", url: `${frontendUrl}/match/${match.matchId}` },
            ],
            [
              { text: "🔕 Unsubscribe", callback_data: `unsub_goal_${match.matchId}` },
            ],
          ],
        },
      });

      addNotification({
        userId: sub.userId,
        matchId: match.matchId,
        type: "goal",
        title: `⚽ Goal! ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`,
        message,
        delivered: true,
      });
    } catch (err) {
      console.warn(`[Notifications] Failed to send goal alert to ${sub.userId}:`, (err as Error).message);
    }
  }
}

/**
 * Send settlement alert to all subscribers of this match.
 */
async function sendSettlementAlert(
  bot: TelegramBot,
  match: MatchSummary,
  frontendUrl: string,
): Promise<void> {
  const winner =
    match.homeScore > match.awayScore ? match.homeTeam :
    match.awayScore > match.homeScore ? match.awayTeam :
    "Draw";

  const message = [
    `🏁 *MATCH ENDED*`,
    ``,
    `*${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}*`,
    `🏆 Winner: ${winner}`,
    ``,
    `✅ Winning tokens now redeemable 1:1 USDC`,
    `🔥 Losing tokens auto-burned`,
    ``,
    `[View Positions](${frontendUrl}/profile)`,
  ].join("\n");

  // Get all subscriptions for this match (any type)
  const allSubs = getSubscriptionsByMatch(match.matchId);
  const sent = new Set<number>();

  for (const sub of allSubs) {
    if (sent.has(sub.userId)) continue;
    sent.add(sub.userId);

    try {
      await bot.sendMessage(sub.userId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 View Portfolio", url: `${frontendUrl}/profile` },
            ],
          ],
        },
      });

      addNotification({
        userId: sub.userId,
        matchId: match.matchId,
        type: "settlement",
        title: `🏁 Match Ended: ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`,
        message,
        delivered: true,
      });
    } catch (err) {
      console.warn(`[Notifications] Failed to send settlement alert to ${sub.userId}:`, (err as Error).message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

interface _StateKey {
  homeScore: number;
  awayScore: number;
  minute: number;
  isFinished: boolean;
}

function _stateKey(match: MatchSummary): string {
  return `${match.homeScore}|${match.awayScore}|${match.minute}|${match.isFinished}`;
}

function _parseStateKey(key: string): _StateKey {
  const parts = key.split("|");
  return {
    homeScore: parseInt(parts[0], 10),
    awayScore: parseInt(parts[1], 10),
    minute: parseInt(parts[2], 10),
    isFinished: parts[3] === "true",
  };
}
