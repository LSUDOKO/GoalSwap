/**
 * GoalSwap Telegram Bot — /match and /odds Commands
 *
 * /match {team} — Search matches by team name, show detail + fee info
 * /odds {matchId} — Show implied probabilities from pool prices
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { formatFeePct, getFeeEmoji } from "../types.js";
import { shortId, resolveShortId } from "../services/shortId.js";
import { FRONTEND_URL } from "../config.js";
import type { MatchSummary, MatchDetail } from "../types.js";

export function registerMatchCommands(bot: TelegramBot): void {
  // ── /match {team} ──
  bot.onText(/^\/match(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match?.[1];

    if (!query?.trim()) {
      await bot.sendMessage(chatId, [
        "⚽ *Match Search*",
        "",
        "Usage: `/match {team name or match ID}`",
        "",
        "Examples:",
        "• `/match Argentina` — Search by team",
        "• `/match arg-bra-2026` — Search by match ID",
      ].join("\n"), { parse_mode: "Markdown" });
      return;
    }

    // Try exact match ID first
    let detail = await api.getMatchDetail(query.trim().toLowerCase());

    if (detail) {
      await sendMatchDetail(bot, chatId, detail);
      return;
    }

    // Search by team name
    const results = await api.searchMatches(query.trim());
    if (results.length === 0) {
      await bot.sendMessage(chatId, [
        `❌ No matches found for "${query}".`,
        "",
        "Try: `/match Argentina` or `/match eng`",
        "Use `/live` to see all live matches.",
      ].join("\n"), { parse_mode: "Markdown" });
      return;
    }

    if (results.length === 1) {
      const detail = await api.getMatchDetail(results[0].matchId);
      if (detail) {
        await sendMatchDetail(bot, chatId, detail);
      } else {
        await sendMatchSummary(bot, chatId, results[0]);
      }
      return;
    }

    // Multiple matches — show selection
    const lines = [`🔍 *Multiple matches found for "${query}":*`, ""];
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

    for (const m of results.slice(0, 10)) {
      const statusEmoji = m.status === "LIV" ? "🔴" : m.status === "FT" ? "✅" : "📅";
      lines.push(`${statusEmoji} \`${m.matchId}\` — ${m.homeTeam} vs ${m.awayTeam}`);
      keyboard.push([
        {
          text: `${statusEmoji} ${m.homeTeam} vs ${m.awayTeam}`,
          callback_data: `match_select_${shortId(m.matchId)}`,
        },
      ]);
    }

    await bot.sendMessage(chatId, lines.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  });

  // ── /odds {matchId} ──
  bot.onText(/^\/odds(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const matchId = match?.[1]?.trim().toLowerCase();

    if (!matchId) {
      await bot.sendMessage(chatId, [
        "📊 *Odds Query*",
        "",
        "Usage: `/odds {matchId}`",
        "",
        "Examples:",
        "• `/odds arg-bra-2026-06-15`",
        "• Use `/match {team}` to find a match ID first.",
      ].join("\n"), { parse_mode: "Markdown" });
      return;
    }

    const detail = await api.getMatchDetail(matchId);
    if (!detail) {
      await bot.sendMessage(chatId, `❌ Match \`${matchId}\` not found.`, {
        parse_mode: "Markdown",
      });
      return;
    }

    // Calculate implied probabilities based on fee and scores
    const homeProb = detail.isFinished
      ? (detail.homeScore > detail.awayScore ? 100 : detail.homeScore === detail.awayScore ? 50 : 0)
      : _estimateProbability(detail.homeScore, detail.awayScore, detail.minute, "home");
    const awayProb = detail.isFinished
      ? (detail.awayScore > detail.homeScore ? 100 : detail.awayScore === detail.homeScore ? 50 : 0)
      : _estimateProbability(detail.homeScore, detail.awayScore, detail.minute, "away");
    const drawProb = detail.isFinished
      ? (detail.homeScore === detail.awayScore ? 100 : 0)
      : Math.max(0, 100 - homeProb - awayProb);

    const feeEmoji = getFeeEmoji(detail.feeTier);

    const message = [
      `📊 *Odds: ${detail.homeTeam} vs ${detail.awayTeam}*`,
      `Status: ${detail.isFinished ? "✅ Finished" : "🔴 Live"} | ⏱️ ${detail.minute}'`,
      `Score: ${detail.homeScore}-${detail.awayScore}`,
      ``,
      `*Implied Probabilities:*`,
      `🏠 ${detail.homeTeam}: \`${homeProb.toFixed(1)}%\``,
      `🤝 Draw: \`${drawProb.toFixed(1)}%\``,
      `✈️ ${detail.awayTeam}: \`${awayProb.toFixed(1)}%\``,
      ``,
      `Fee: ${feeEmoji} ${formatFeePct(detail.feeTier)} (${detail.feeReason})`,
      ``,
      `[▶️ Trade Now](${FRONTEND_URL}/match/${detail.matchId})`,
    ].join("\n");

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "▶️ Trade Now", url: `${FRONTEND_URL}/match/${detail.matchId}` },
            { text: "🔔 Set Alert", callback_data: `match_alert_${shortId(detail.matchId)}` },
          ],
        ],
      },
    });
  });

  // ── Callback: match selection ──
  bot.on("callback_query", async (query) => {
    if (!query.data) return;
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    // match_select_{matchId}
    const matchSelect = query.data.match(/^match_select_([0-9a-fx]+)$/);
    if (matchSelect) {
      const matchId = resolveShortId(matchSelect[1]) ?? matchSelect[1];
      await bot.answerCallbackQuery(query.id, {
        text: `Loading ${matchId}...`,
      });
      const detail = await api.getMatchDetail(matchId);
      if (detail) {
        await sendMatchDetail(bot, chatId, detail);
      } else {
        await bot.sendMessage(chatId, `❌ Match \`${matchId}\` details not available.`, {
          parse_mode: "Markdown",
        });
      }
      return;
    }

    // match_alert_{matchId} (from /odds / match detail)
    const alertMatch = query.data.match(/^match_alert_([0-9a-fx]+)$/);
    if (alertMatch) {
      const matchId = resolveShortId(alertMatch[1]) ?? alertMatch[1];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, [
        `🔔 Set an alert for \`${matchId}\`:`,
        "",
        `/alarm ${matchId} goal`,
        `/alarm ${matchId} fee 5`,
        `/alarm ${matchId} price 0.30`,
      ].join("\n"), {
        parse_mode: "Markdown",
      });
      return;
    }

    // odds_{matchId} (from match detail)
    const oddsMatch = query.data.match(/^odds_([0-9a-fx]+)$/);
    if (oddsMatch) {
      const matchId = resolveShortId(oddsMatch[1]) ?? oddsMatch[1];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, `/odds ${matchId}`);
      return;
    }

    // refresh_{matchId} (from match detail)
    const refreshMatch = query.data.match(/^refresh_([0-9a-fx]+)$/);
    if (refreshMatch) {
      const matchId = resolveShortId(refreshMatch[1]) ?? refreshMatch[1];
      await bot.answerCallbackQuery(query.id, {
        text: "Refreshing...",
      });
      const detail = await api.getMatchDetail(matchId);
      if (detail) {
        await sendMatchDetail(bot, chatId, detail);
      } else {
        await bot.sendMessage(chatId, `Match not found.`, {
          parse_mode: "Markdown",
        });
      }
      return;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Internal
// ═══════════════════════════════════════════════════════════════════

async function sendMatchDetail(
  bot: TelegramBot,
  chatId: number,
  detail: MatchDetail,
): Promise<void> {
  const feeEmoji = getFeeEmoji(detail.feeTier);

  const message = [
    `⚽ *${detail.homeTeam} ${detail.homeScore}-${detail.awayScore} ${detail.awayTeam}*`,
    ``,
    `⏱️ Minute: ${detail.minute}'`,
    `🟥 Red Cards: ${detail.redCards}`,
    `📌 Status: ${detail.isFinished ? "✅ Finished" : "🔴 Live"}${detail.penaltyShootout ? " (Penalty Shootout)" : ""}`,
    ``,
    `💹 *Fee Information:*`,
    `${feeEmoji} Fee: ${formatFeePct(detail.feeTier)}`,
    `📝 Reason: ${detail.feeReason}`,
    ``,
    `[▶️ Trade Now](${FRONTEND_URL}/match/${detail.matchId})`,
    `📊 Odds available below ⬇️`,
  ].join("\n");

  await bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "▶️ Trade Now", url: `${FRONTEND_URL}/match/${detail.matchId}` },
          { text: "📊 Odds", callback_data: `odds_${shortId(detail.matchId)}` },
        ],
        [
          { text: "🔔 Set Alert", callback_data: `match_alert_${shortId(detail.matchId)}` },
          { text: "🔄 Refresh", callback_data: `refresh_${shortId(detail.matchId)}` },
        ],
      ],
    },
  });
}

async function sendMatchSummary(
  bot: TelegramBot,
  chatId: number,
  match: MatchSummary,
): Promise<void> {
  const statusEmoji = match.status === "LIV" ? "🔴" : match.status === "FT" ? "✅" : "📅";
  const score = `${match.homeScore}-${match.awayScore}`;

  const message = [
    `${statusEmoji} *${match.homeTeam} ${score} ${match.awayTeam}*`,
    `⏱️ ${match.minute}' | ${match.status === "LIV" ? "Live" : match.status === "FT" ? "Finished" : "Upcoming"}`,
    ``,
    `ID: \`${match.matchId}\``,
  ].join("\n");

  await bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 View Details", callback_data: `match_select_${match.matchId}` },
        ],
      ],
    },
  });
}

/**
 * Simple probability estimator based on score and time.
 * In production, use V4 pool prices for implied probability.
 */
function _estimateProbability(
  homeScore: number,
  awayScore: number,
  minute: number,
  team: "home" | "away",
): number {
  const scoreDiff = homeScore - awayScore;
  const timeRemaining = Math.max(0, 90 - minute) / 90;

  // Base probability from score difference
  let baseProb: number;
  if (team === "home") {
    baseProb = 50 + scoreDiff * 15;
  } else {
    baseProb = 50 - scoreDiff * 15;
  }

  // Reduce certainty early in match
  const certaintyFactor = 1 - timeRemaining * 0.5;
  baseProb = 50 + (baseProb - 50) * certaintyFactor;

  return Math.max(5, Math.min(95, baseProb));
}
