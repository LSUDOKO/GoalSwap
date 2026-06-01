/**
 * GoalSwap Telegram Bot — /alert Command
 *
 * Manages alert subscriptions:
 * - /alert {matchId} goal — Notify when goal scored
 * - /alert {matchId} price {value} — Notify when token hits price
 * - /alert {matchId} fee {value} — Notify when fee reaches threshold
 * - /alerts — List current subscriptions with management
 * - /unsubscribe {matchId} — Remove all alerts for a match
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { shortId, resolveShortId } from "../services/shortId.js";
import {
  getUserSubscriptions,
  addSubscription,
  deactivateSubscription,
  removeUserSubscriptionsByMatch,
  upsertUser,
} from "../services/db.js";
import { formatFeePct } from "../types.js";

const ALERT_TYPES = ["goal", "price", "fee", "settlement"] as const;

export function registerAlertCommands(bot: TelegramBot): void {
  // ── /alert {matchId} {type} [{value}] ──
  // Supports both /alarm and /alert
  bot.onText(
    /^\/(?:alarm|alert)(?:\s+(.+?)(?:\s+(goal|price|fee|settlement)(?:\s+([\d.]+))?)?)?$/i,
    async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id ?? chatId;

      // Register user
      upsertUser({
        userId,
        username: msg.from?.username,
        firstName: msg.from?.first_name ?? "User",
      });

      const matchId = match?.[1]?.trim().toLowerCase();
      const alertType = match?.[2]?.toLowerCase() as (typeof ALERT_TYPES)[number] | undefined;
      const alertValue = match?.[3] ? parseFloat(match[3]) : undefined;

      // No args — show alert help
      if (!matchId) {
        await sendAlertHelp(bot, chatId);
        return;
      }

      // Check if match exists
      const detail = await api.getMatchDetail(matchId);

      // If matchId doesn't look like a matchId, search for it
      let resolvedMatchId = matchId;
      let matchLabel: string | undefined;

      if (!detail) {
        const results = await api.searchMatches(matchId);
        if (results.length === 1) {
          resolvedMatchId = results[0].matchId;
          matchLabel = `${results[0].homeTeam} vs ${results[0].awayTeam}`;
        } else if (results.length > 1) {
          // Multiple matches — show selection
          const lines = [`🔍 *Multiple matches found for "${matchId}":*`, ""];
          const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

          for (const m of results.slice(0, 10)) {
            lines.push(`• \`${m.matchId}\` — ${m.homeTeam} vs ${m.awayTeam}`);
            keyboard.push([
              {
                text: `${m.homeTeam} vs ${m.awayTeam}`,
                callback_data: `alert_select_${shortId(m.matchId)}`,
              },
            ]);
          }

          await bot.sendMessage(chatId, lines.join("\n"), {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard },
          });
          return;
        } else {
          await bot.sendMessage(chatId, [
            `❌ No match found for "${matchId}".`,
            "Use `/live` to see available matches.",
          ].join("\n"), { parse_mode: "Markdown" });
          return;
        }
      } else {
        matchLabel = `${detail.homeTeam} vs ${detail.awayTeam}`;
      }

      // No alert type specified — show match alert menu
      if (!alertType) {
        const lines = [
          `🔔 *Set Alert — ${matchLabel ?? resolvedMatchId}*`,
          "",
          "Choose alert type:",
        ];

        const keyboard: TelegramBot.InlineKeyboardButton[][] = [
          [{ text: "⚽ Goal", callback_data: `alert_type_${shortId(resolvedMatchId)}_goal` }],
          [{ text: "💰 Price Alert", callback_data: `alert_type_${shortId(resolvedMatchId)}_price` }],
          [{ text: "⚡ Fee Spike", callback_data: `alert_type_${shortId(resolvedMatchId)}_fee` }],
          [{ text: "🏁 Settlement", callback_data: `alert_type_${shortId(resolvedMatchId)}_settlement` }],
          [{ text: "🔙 Back", callback_data: `alerts_list` }],
        ];

        await bot.sendMessage(chatId, lines.join("\n"), {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard },
        });
        return;
      }

      // Validate alert type
      if (!ALERT_TYPES.includes(alertType)) {
        await bot.sendMessage(chatId, `❌ Invalid alert type. Use: ${ALERT_TYPES.join(", ")}`);
        return;
      }

      // Price and fee alerts need a value
      if ((alertType === "price" || alertType === "fee") && (alertValue === undefined || isNaN(alertValue))) {
        await bot.sendMessage(chatId, [
          `❌ ${alertType === "price" ? "Price" : "Fee"} alert requires a value.`,
          "",
          `Example: \`/alarm ${resolvedMatchId} ${alertType} ${alertType === "price" ? "0.30" : "5"}\``,
        ].join("\n"), { parse_mode: "Markdown" });
        return;
      }

      // Create subscription
      const sub = addSubscription({
        userId,
        matchId: resolvedMatchId,
        alertType,
        alertValue,
        isActive: true,
        matchLabel,
      });

      const typeLabel = _alertTypeLabel(alertType, alertValue);

      await bot.sendMessage(chatId, [
        `✅ *Alert Set!*`,
        ``,
        `Match: ${matchLabel ?? resolvedMatchId}`,
        `Type: ${typeLabel}`,
        `ID: \`${sub.id.slice(0, 8)}...\``,
        ``,
        `I'll notify you when this event occurs.`,
        `Manage alerts: \`/alerts\``,
      ].join("\n"), {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📋 My Alerts", callback_data: "alerts_list" },
              { text: "🔕 Unsubscribe", callback_data: `alert_unsub_${sub.id}` },
            ],
          ],
        },
      });
    },
  );

  // ── /alerts — List current subscriptions ──
  bot.onText(/^\/alerts$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;

    await sendAlertsList(bot, chatId, userId);
  });

  // ── /unsubscribe {matchId} — Remove alerts for a match ──
  bot.onText(/^\/unsubscribe(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    const matchId = match?.[1]?.trim().toLowerCase();

    if (!matchId) {
      await bot.sendMessage(chatId, "Usage: `/unsubscribe {matchId}`", {
        parse_mode: "Markdown",
      });
      return;
    }

    const removed = removeUserSubscriptionsByMatch(userId, matchId);
    if (removed > 0) {
      await bot.sendMessage(chatId, `✅ Removed ${removed} alert(s) for \`${matchId}\``, {
        parse_mode: "Markdown",
      });
    } else {
      await bot.sendMessage(chatId, `No active alerts for \`${matchId}\`.`, {
        parse_mode: "Markdown",
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Callback Handlers
  // ═══════════════════════════════════════════════════════════════════

  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;

    // ── Alert type selection ──
    const alertTypeMatch = query.data.match(/^alert_type_([0-9a-fx]+?)_(goal|price|fee|settlement)$/);
    if (alertTypeMatch) {
      const matchId = resolveShortId(alertTypeMatch[1]) ?? alertTypeMatch[1];
      const alertType = alertTypeMatch[2] as (typeof ALERT_TYPES)[number];

      await bot.answerCallbackQuery(query.id);

      if (alertType === "price" || alertType === "fee") {
        const label = alertType === "price" ? "Price (in USDC)" : "Fee (%)";
        await bot.sendMessage(chatId, [
          `Enter ${label} threshold:`,
          ``,
          `Example: \`/alarm ${matchId} ${alertType} ${alertType === "price" ? "0.30" : "5"}\``,
        ].join("\n"), { parse_mode: "Markdown" });
      } else {
        // goal or settlement — no value needed
        const sub = addSubscription({
          userId,
          matchId,
          alertType,
          alertValue: undefined,
          isActive: true,
        });

        await bot.sendMessage(chatId, [
          `✅ *Alert Set!*`,
          ``,
          `Match: \`${matchId}\``,
          `Type: ${_alertTypeLabel(alertType)}`,
          ``,
          `Manage alerts: \`/alerts\``,
        ].join("\n"), { parse_mode: "Markdown" });
      }
      return;
    }

    // ── Alert match selection (from search) ──
    const alertSelectMatch = query.data.match(/^alert_select_([0-9a-fx]+)$/);
    if (alertSelectMatch) {
      const matchId = resolveShortId(alertSelectMatch[1]) ?? alertSelectMatch[1];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, `/alarm ${matchId}`);
      return;
    }

    // ── List alerts ──
    if (query.data === "alerts_list") {
      await bot.answerCallbackQuery(query.id);
      await sendAlertsList(bot, chatId, userId, messageId);
      return;
    }

    // ── Unsubscribe single alert ──
    const unsubMatch = query.data.match(/^alert_unsub_([0-9a-f]+)$/);
    if (unsubMatch) {
      const subId = unsubMatch[1];
      const removed = deactivateSubscription(subId, userId);
      await bot.answerCallbackQuery(query.id, {
        text: removed ? "✅ Alert removed" : "❌ Alert not found",
        show_alert: false,
      });
      await sendAlertsList(bot, chatId, userId, messageId);
      return;
    }

    // ── Unsubscribe from goal alert (from push notification) ──
    const unsubGoalMatch = query.data.match(/^unsub_goal_([0-9a-fx]+)$/);
    if (unsubGoalMatch) {
      const matchId = resolveShortId(unsubGoalMatch[1]) ?? unsubGoalMatch[1];
      const removed = removeUserSubscriptionsByMatch(userId, matchId);
      await bot.answerCallbackQuery(query.id, {
        text: removed ? `✅ Removed alerts for ${matchId}` : "No alerts found",
        show_alert: true,
      });
      return;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Internal Helpers
// ═══════════════════════════════════════════════════════════════════

async function sendAlertHelp(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(chatId, [
    "🔔 *Alert Management*",
    "",
    "*Set an alert:*",
    "• `/alarm {matchId} goal` — Notify when goal scored",
    "• `/alarm {matchId} price {value}` — Notify when token hits $X",
    "• `/alarm {matchId} fee {value}` — Notify when fee hits X%",
    "• `/alarm {matchId} settlement` — Notify when match ends",
    "",
    "*Manage alerts:*",
    "• `/alerts` — List your active alerts",
    "• `/unsubscribe {matchId}` — Remove all alerts for a match",
    "",
    "*Examples:*",
    "• `/alarm Argentina goal`",
    "• `/alarm arg-bra-2026 price 0.30`",
    "• `/alarm bra-arg fee 5`",
  ].join("\n"), { parse_mode: "Markdown" });
}

function _alertTypeLabel(type: string, value?: number): string {
  switch (type) {
    case "goal":
      return "⚽ Goal Alert";
    case "price":
      return `💰 Price Alert: $${value?.toFixed(2) ?? "?"}`;
    case "fee":
      return `⚡ Fee Spike: ${value?.toFixed(1) ?? "?"}%`;
    case "settlement":
      return "🏁 Settlement Alert";
    default:
      return type;
  }
}

async function sendAlertsList(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  editMessageId?: number,
): Promise<void> {
  const subs = getUserSubscriptions(userId);

  if (subs.length === 0) {
    const text = "🔔 *No Active Alerts*\n\nUse `/alarm {matchId} {type}` to set one.\nExample: `/alarm Argentina goal`";
    if (editMessageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: editMessageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔴 Live Matches", callback_data: "cmd_live" }],
          ],
        },
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔴 Live Matches", callback_data: "cmd_live" }],
          ],
        },
      });
    }
    return;
  }

  const lines = [`🔔 *Your Alerts* (${subs.length})`, ""];
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  for (const sub of subs) {
    const label = sub.matchLabel ?? sub.matchId;
    lines.push(
      `${_alertTypeEmoji(sub.alertType)} \`${sub.id.slice(0, 8)}\` — ${label}`,
      `   Type: ${_alertTypeLabel(sub.alertType, sub.alertValue)}`,
    );
    keyboard.push([
      {
        text: `🔕 Remove ${label}`,
        callback_data: `alert_unsub_${sub.id}`,
      },
    ]);
  }

  const text = lines.join("\n");

  if (editMessageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: editMessageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  }
}

function _alertTypeEmoji(type: string): string {
  switch (type) {
    case "goal": return "⚽";
    case "price": return "💰";
    case "fee": return "⚡";
    case "settlement": return "🏁";
    default: return "🔔";
  }
}
