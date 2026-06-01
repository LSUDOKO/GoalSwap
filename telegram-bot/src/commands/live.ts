/**
 * GoalSwap Telegram Bot — /live Command
 *
 * Displays all currently live matches with scores, minute, fee tiers.
 * Supports multi-page navigation for many matches.
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { formatFeePct, getFeeEmoji } from "../types.js";
import { shortId, resolveShortId } from "../services/shortId.js";

const MATCHES_PER_PAGE = 5;

export function registerLiveCommand(bot: TelegramBot): void {
  bot.onText(/^\/live/, async (msg) => {
    const chatId = msg.chat.id;

    await sendLivePage(bot, chatId, 1);
  });

  // Handle pagination callbacks
  bot.on("callback_query", async (query) => {
    if (!query.data) return;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    if (!chatId || !messageId) return;

    // cmd_live: navigate to live matches (from start, leaderboard, etc.)
    if (query.data === "cmd_live") {
      await bot.answerCallbackQuery(query.id, { text: "Loading live matches...", show_alert: false });
      await bot.sendMessage(chatId, "/live");
      return;
    }

    // Match navigation: live_page_{page}
    const liveMatch = query.data.match(/^live_page_(\d+)$/);
    if (liveMatch) {
      const page = parseInt(liveMatch[1], 10);
      await bot.editMessageText("Loading...", {
        chat_id: chatId,
        message_id: messageId,
      });
      await sendLivePage(bot, chatId, page, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Match detail: live_detail_{matchId}
    const detailMatch = query.data.match(/^live_detail_(.+)$/);
    if (detailMatch) {
      const matchId = resolveShortId(detailMatch[1]) ?? detailMatch[1];
      await bot.answerCallbackQuery(query.id, {
        text: `Loading match...`,
        show_alert: false,
      });
      await bot.sendMessage(chatId, `/match ${matchId}`);
      return;
    }

    // Refresh: live_refresh
    if (query.data === "live_refresh") {
      await bot.editMessageText("🔄 Refreshing...", {
        chat_id: chatId,
        message_id: messageId,
      });
      await sendLivePage(bot, chatId, 1, messageId);
      await bot.answerCallbackQuery(query.id, {
        text: "✅ Refreshed!",
        show_alert: false,
      });
      return;
    }
  });
}

async function sendLivePage(
  bot: TelegramBot,
  chatId: number,
  page: number,
  editMessageId?: number,
): Promise<void> {
  const matches = await api.getLiveMatches();
  const totalPages = Math.max(1, Math.ceil(matches.length / MATCHES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * MATCHES_PER_PAGE;
  const pageMatches = matches.slice(startIdx, startIdx + MATCHES_PER_PAGE);

  // Build message
  const lines: string[] = [];

  if (matches.length === 0) {
    lines.push("🔴 *No Live Matches*");
    lines.push("");
    lines.push("There are no live matches right now.");
    lines.push("Check back during World Cup 2026 match times!");
    lines.push("");

    // Check for upcoming matches
    const upcoming = await api.getMatches("all");
    const upcomingFiltered = upcoming.filter((m) => m.status === "NS");
    if (upcomingFiltered.length > 0) {
      lines.push("📅 *Upcoming Matches:*");
      for (const m of upcomingFiltered.slice(0, 3)) {
        const startTime = new Date(m.startTime);
        const timeStr = startTime.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const upcomingSportEmojis: Record<string, string> = {
        football: "⚽", basketball: "🏀", nba: "🏀", afl: "🏉",
        baseball: "⚾", formula1: "🏎️", handball: "🤾",
        hockey: "🏒", mma: "🥊", "american-football": "🏈",
        rugby: "🏉", volleyball: "🏐", golf: "⛳",
      };
      const use = upcomingSportEmojis[m.sport] ?? "⚽";
      lines.push(`• ${use} ${m.homeTeam} vs ${m.awayTeam} — ${timeStr}`);
      }
    }
  } else {
    lines.push(`🔴 *LIVE MATCHES* (${matches.length})`);
    lines.push("");

    for (const match of pageMatches) {
      const score = `${match.homeScore}-${match.awayScore}`;
      const feeEmoji = getFeeEmoji(500);
      const statusEmoji = match.isFinished ? "✅" : "🔴";

      // Sport-specific emoji
      const sportEmojis: Record<string, string> = {
        football: "⚽", basketball: "🏀", nba: "🏀", afl: "🏉",
        baseball: "⚾", formula1: "🏎️", handball: "🤾",
        hockey: "🏒", mma: "🥊", "american-football": "🏈",
        rugby: "🏉", volleyball: "🏐", golf: "⛳",
      };
      const se = sportEmojis[match.sport] ?? "⚽";

      lines.push(
        `${statusEmoji} ${se} *${match.homeTeam}* ${score} *${match.awayTeam}*`,
        `   ⏱️ ${match.minute}' | ${feeEmoji} Fee varies | [View](\`/match ${match.matchId}\`)`,
        "",
      );
    }

    if (totalPages > 1) {
      lines.push(`Page ${currentPage}/${totalPages}`);
    }
  }

  const messageText = lines.join("\n");

  // Build inline keyboard
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  if (matches.length > 0) {
    // Add detail buttons for each match on this page
    for (const match of pageMatches) {
      keyboard.push([
        {
          text: `📊 ${match.homeTeam} vs ${match.awayTeam}`,
          callback_data: `live_detail_${shortId(match.matchId)}`,
        },
      ]);
    }

    // Add pagination + refresh row
    const navRow: TelegramBot.InlineKeyboardButton[] = [];

    if (currentPage > 1) {
      navRow.push({
        text: "◀️ Prev",
        callback_data: `live_page_${currentPage - 1}`,
      });
    }

    navRow.push({
      text: "🔄 Refresh",
      callback_data: "live_refresh",
    });

    if (currentPage < totalPages) {
      navRow.push({
        text: "Next ▶️",
        callback_data: `live_page_${currentPage + 1}`,
      });
    }

    keyboard.push(navRow);
  } else {
    keyboard.push([
      { text: "🔄 Refresh", callback_data: "live_refresh" },
    ]);
  }

  if (editMessageId) {
    await bot.editMessageText(messageText, {
      chat_id: chatId,
      message_id: editMessageId,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    await bot.sendMessage(chatId, messageText, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: keyboard },
    });
  }
}
