/**
 * GoalSwap Telegram Bot — /start Command
 *
 * Welcome message with feature overview and quick-action buttons.
 */

import type TelegramBot from "node-telegram-bot-api";
import { upsertUser } from "../services/db.js";

const WELCOME_MESSAGE = [
  "⚽ *Welcome to GoalSwap Arena!*",
  "",
  "Trade live World Cup 2026 matches on X Layer using Uniswap V4 dynamic fee hooks.",
  "",
  "📋 *Available Commands:*",
  "",
  "🔴 `/live` — Live matches with scores and fee tiers",
  "⚽ `/match {team}` — Search match by team name",
  "📊 `/odds {matchId}` — Implied probabilities from pool prices",
  "🔔 `/alert {matchId} {type}` — Set custom match alerts",
  "💰 `/portfolio {wallet}` — Show your trading portfolio",
  "🏆 `/trophies {wallet}` — View your Soulbound Trophy collection",
  "🏅 `/leaderboard` — Top 10 global traders",
  "🔗 `/referral` — Generate your referral link",
  "⚙️ `/settings` — Configure notification preferences",
  "",
  "*Alert Types:*",
  "• `/alert arg-bra goal` — Notify when goal scored",
  "• `/alert arg-bra price 0.30` — Notify when token hits $0.30",
  "• `/alert arg-bra fee 5` — Notify when fee reaches 5%",
  "",
  "🔐 *Admin only:* `/status`, `/broadcast`",
  "",
  "Built on X Layer · Powered by Uniswap V4",
].join("\n");

export function registerStartCommand(bot: TelegramBot): void {
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;

    // Register or update user
    upsertUser({
      userId,
      username: msg.from?.username,
      firstName: msg.from?.first_name ?? "User",
      lastName: msg.from?.last_name,
    });

    await bot.sendMessage(chatId, WELCOME_MESSAGE, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔴 Live Matches", callback_data: "cmd_live" },
            { text: "🏅 Leaderboard", callback_data: "cmd_leaderboard" },
          ],
          [
            { text: "⚙️ Settings", callback_data: "cmd_settings" },
            { text: "🔗 Referral", callback_data: "cmd_referral" },
          ],
        ],
      },
    });
  });
}
