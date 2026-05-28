/**
 * GoalSwap Telegram Bot — Admin Commands
 *
 * Owner-only commands for oracle health monitoring and management:
 * - /status — Oracle health, active matches, queue depth, error count
 * - /forceupdate {matchId} — Manually trigger oracle update
 * - /broadcast {message} — Send message to all subscribers
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { getAllUsers } from "../services/db.js";

// Load admin ID from env
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID
  ? parseInt(process.env.TELEGRAM_ADMIN_ID, 10)
  : null;

function isAdmin(userId: number): boolean {
  return ADMIN_ID !== null && userId === ADMIN_ID;
}

function requireAdmin(bot: TelegramBot, chatId: number, userId: number): boolean {
  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, "❌ This command is restricted to bot administrators.");
    return false;
  }
  return true;
}

export function registerAdminCommands(bot: TelegramBot): void {
  // ── /status ──
  bot.onText(/^\/status$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;

    if (!requireAdmin(bot, chatId, userId)) return;

    const loadingMsg = await bot.sendMessage(chatId, "⏳ Fetching oracle status...");
    await sendStatusMessage(bot, chatId, loadingMsg.message_id);
  });

  // ── /forceupdate {matchId} ──
  bot.onText(/^\/forceupdate(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    if (!match) return;
    const matchId = match[1]?.trim().toLowerCase();

    if (!requireAdmin(bot, chatId, userId)) return;

    if (!matchId) {
      await bot.sendMessage(chatId, "Usage: `/forceupdate {matchId}`", {
        parse_mode: "Markdown",
      });
      return;
    }

    await bot.sendMessage(chatId, [
      `⚠️ *Force Update Requested*`,
      ``,
      `Match: \`${matchId}\``,
      ``,
      "This will trigger an immediate oracle update.",
      "The oracle service must be running for this to work.",
      ``,
      "Note: This is an admin-only emergency command.",
    ].join("\n"), { parse_mode: "Markdown" });
  });

  // ── /broadcast {message} ──
  bot.onText(/^\/broadcast\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    if (!match) return;
    const message = match[1].trim();

    if (!requireAdmin(bot, chatId, userId)) return;

    await bot.sendMessage(chatId, [
      "📢 *Broadcast Started*",
      ``,
      `Message: "${message.slice(0, 100)}${message.length > 100 ? "..." : ""}"`,
      ``,
      "Sending to all registered users...",
    ].join("\n"), { parse_mode: "Markdown" });

    const allUsers = getAllUsers();
    let sent = 0;
    let failed = 0;

    for (const user of allUsers) {
      try {
        await bot.sendMessage(user.userId, [
          "📢 *GoalSwap Announcement*",
          "",
          message,
          "",
          "_You received this because you're registered with GoalSwap Arena._",
        ].join("\n"), {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });
        sent++;
      } catch {
        failed++;
      }

      // Rate limit: max 30 messages per second
      if (sent % 30 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await bot.sendMessage(chatId, [
      "✅ *Broadcast Complete*",
      ``,
      `✅ Sent: ${sent}`,
      `❌ Failed: ${failed}`,
      `👥 Total: ${allUsers.length}`,
    ].join("\n"), { parse_mode: "Markdown" });
  });

  // ── /settings ──
  bot.onText(/^\/settings$/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, [
      "⚙️ *Notification Settings*",
      "",
      "Configure your alert preferences:",
      "",
      "• Goal alerts: Enable/disable",
      "• Fee spike alerts: Enable/disable",
      "• Settlement alerts: Enable/disable",
      "• Daily summary: Enable/disable",
      "",
      "Coming soon: Language selection",
    ].join("\n"), { parse_mode: "Markdown" });
  });

  // ── Callback: admin_status refresh ──
  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;

    if (query.data === "admin_status") {
      const chatId = query.message.chat.id;
      const userId = query.from.id;

      if (!requireAdmin(bot, chatId, userId)) return;

      await bot.answerCallbackQuery(query.id, {
        text: "🔄 Refreshing status...",
        show_alert: false,
      });

      // Edit the existing message with fresh status data
      await sendStatusMessage(bot, chatId, query.message.message_id);
    }
  });
}

/**
 * Fetch oracle status and update/edit the message with fresh data.
 */
async function sendStatusMessage(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
): Promise<void> {
  const [health, stats, detailedStats] = await Promise.all([
    api.getHealth(),
    api.getStats(),
    api.getDetailedStats(),
  ]);

  const lines: string[] = [
    "📊 *Oracle Status*",
    "",
  ];

  if (health) {
    const statusEmoji = health.status === "healthy" ? "✅" : "⚠️";
    lines.push(`${statusEmoji} *Status:* ${health.status}`);
    lines.push(`📡 *Redis:* ${health.redis}`);
    lines.push(`🔌 *WS Connections:* ${health.wsConnections}`);
    lines.push(`⚽ *Active Matches:* ${health.activeMatches}`);
    lines.push(`🕐 *Last Check:* ${new Date(health.timestamp).toLocaleTimeString()}`);
  } else {
    lines.push("❌ *Oracle unreachable*");
  }

  if (stats) {
    lines.push("");
    lines.push("*Platform Stats:*");
    lines.push(`💰 Total Volume: ${stats.totalVolume}`);
    lines.push(`👥 Active Users: ${stats.activeUsers}`);
    lines.push(`🔄 Total Trades: ${stats.totalTrades}`);
    lines.push(`📊 Total Matches: ${stats.totalMatches}`);
    lines.push(`💸 Fees Generated: ${stats.feesGenerated}`);
  }

  if (detailedStats) {
    lines.push("");
    lines.push("*Today's Activity:*");
    lines.push(`📝 TX Count: ${detailedStats.todayTxCount ?? "N/A"}`);
    lines.push(`❌ Error Count: ${detailedStats.todayErrorCount ?? "N/A"}`);
  }

  lines.push("");
  lines.push("*Bot Stats:*");
  const allUsers = getAllUsers();
  lines.push(`👤 Registered Users: ${allUsers.length}`);

  await bot.editMessageText(lines.join("\n"), {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "admin_status" },
        ],
      ],
    },
  });
}
