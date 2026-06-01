/**
 * GoalSwap Arena — Telegram Bot (@Goalswap_bot)
 *
 * Main entry point.
 * Initializes the bot, registers all commands, and starts the
 * notification poller for push alerts.
 *
 * Run: tsx src/index.ts
 * Env: See .env.example for required variables.
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

// Command registrations
import { registerStartCommand } from "./commands/start.js";
import { registerLiveCommand } from "./commands/live.js";
import { registerMatchCommands } from "./commands/match.js";
import { registerAlertCommands } from "./commands/alert.js";
import { registerPortfolioCommands } from "./commands/portfolio.js";
import { registerLeaderboardCommands } from "./commands/leaderboard.js";
import { registerAdminCommands } from "./commands/admin.js";
import { registerBracketsCommand } from "./commands/brackets.js";

// Services
import { startNotificationPoller } from "./services/notifications.js";
import { getAllUsers } from "./services/db.js";

console.log(`
╔══════════════════════════════════════════════════════════╗
║          GoalSwap Arena — Telegram Bot                   ║
║          @Goalswap_bot                                    ║
╚══════════════════════════════════════════════════════════╝
`);

// ── Configuration ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
// PORT (Render) takes priority over WEBHOOK_PORT for deployed environments
const WEBHOOK_PORT = parseInt(process.env.PORT ?? process.env.WEBHOOK_PORT ?? "3003", 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://goalswap.vercel.app";
// Auto-detect: Render has RENDER_EXTERNAL_URL set → webhook mode
// Local dev: no public URL → polling mode
const IS_RENDER = !!process.env.RENDER_EXTERNAL_URL;
const USE_POLLING = process.env.USE_POLLING !== undefined
  ? process.env.USE_POLLING !== "false"
  : !IS_RENDER; // Default: webhook on Render, polling locally

// Ensure data directory exists
import fs from "fs";
import path from "path";
const dataDir = process.env.DATA_DIR ?? "./data";
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set. See .env.example.");
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
//  Initialize Bot
// ═══════════════════════════════════════════════════════════════

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: USE_POLLING
    ? { interval: 2000, params: { timeout: 10 } }
    : false,
  onlyFirstMatch: true,
});

// ── Register Commands ──
registerStartCommand(bot);
registerLiveCommand(bot);
registerMatchCommands(bot);
registerAlertCommands(bot);
registerPortfolioCommands(bot);
registerLeaderboardCommands(bot);
registerAdminCommands(bot);
registerBracketsCommand(bot);

// ── Set Bot Commands (shown in Telegram menu) ──
async function setBotCommands(): Promise<void> {
  try {
    await bot.setMyCommands([
      { command: "start", description: "Welcome & feature overview" },
      { command: "live", description: "Live matches with scores & fees" },
      { command: "match", description: "Search match by team name" },
      { command: "odds", description: "Implied probabilities from pools" },
      { command: "alarm", description: "Set custom match alerts" },
      { command: "alerts", description: "List your active alerts" },
      { command: "unsubscribe", description: "Remove alerts for a match" },
      { command: "portfolio", description: "View trading portfolio" },
      { command: "trophies", description: "View Soulbound Trophy collection" },
      { command: "linkwallet", description: "Save your wallet address" },
      { command: "leaderboard", description: "Top 10 global traders" },
      { command: "referral", description: "Generate referral link" },
      { command: "settings", description: "Notification preferences" },
      { command: "brackets", description: "World Cup bracket NFTs" },
    ]);
    console.log("[Bot] Commands registered in Telegram menu");
  } catch (err) {
    console.warn("[Bot] Failed to set commands:", (err as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Global Error Handling
// ═══════════════════════════════════════════════════════════════

// Catch unhandled promise rejections so AggregateError doesn't crash the process
process.on("unhandledRejection", (reason) => {
  console.warn("[Bot] Unhandled rejection:", (reason as Error)?.message ?? reason);
});

bot.on("polling_error", (err) => {
  // EFATAL means the polling connection is broken — restart polling
  if ((err as any)?.code === "EFATAL" || err.message?.includes("EFATAL")) {
    console.warn("[Bot] Polling EFATAL — restarting polling in 3s...");
    setTimeout(() => {
      try {
        bot.startPolling();
      } catch { /* already started */ }
    }, 3000);
  } else {
    console.error("[Bot] Polling error:", err.message);
  }
});

bot.on("error", (err) => {
  console.error("[Bot] Error:", err.message);
});

// ═══════════════════════════════════════════════════════════════
//  Webhook Bridge (for push alerts from oracle)
// ═══════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());

// Health endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "running",
    registeredUsers: getAllUsers().length,
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoint for oracle push alerts
app.post("/webhook/alert", async (req, res) => {
  const { matchId, type, title, message } = req.body ?? {};

  if (!matchId || !type || !message) {
    res.status(400).json({ error: "Missing required fields: matchId, type, message" });
    return;
  }

  console.log(`[Webhook] Alert received: ${type} for ${matchId}`);

  // Get all subscriptions for this match and type
  const { getSubscriptionsByMatchAndType } = await import("./services/db.js");
  const subs = getSubscriptionsByMatchAndType(matchId, type);

  let sent = 0;
  for (const sub of subs) {
    try {
      await bot.sendMessage(sub.userId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
      sent++;
    } catch (err) {
      console.warn(`[Webhook] Failed to send to ${sub.userId}:`, (err as Error).message);
    }
  }

  res.json({ received: true, sent, totalSubscribers: subs.length });
});

app.listen(WEBHOOK_PORT, async () => {
  console.log(`[Webhook] Bridge listening on port ${WEBHOOK_PORT}`);

  // In webhook mode, set the Telegram webhook URL so it sends updates here
  if (!USE_POLLING) {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL;
    if (webhookUrl) {
      try {
        await bot.setWebHook(`${webhookUrl}/webhook/telegram`);
        console.log(`[Bot] Webhook set to ${webhookUrl}/webhook/telegram`);
      } catch (err) {
        console.error("[Bot] Failed to set webhook:", (err as Error).message);
      }
    } else {
      console.warn("[Bot] No TELEGRAM_WEBHOOK_URL or RENDER_EXTERNAL_URL — webhook won't receive updates");
    }
  }
});

// In webhook mode, route incoming Telegram updates through Express
// In polling mode, clear any stale webhook from a previous run
if (!USE_POLLING) {
  app.post("/webhook/telegram", (req, res) => {
    try {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error("[Webhook] Failed to process Telegram update:", (err as Error).message);
      res.sendStatus(500);
    }
  });
} else {
  // Ensure no stale webhook is active when running in polling mode
  bot.deleteWebHook().then(() => {
    console.log("[Bot] Cleared any stale webhook (polling mode)");
  }).catch(() => { /* no webhook to clear */ });
}

// ═══════════════════════════════════════════════════════════════
//  Start Notification Poller
// ═══════════════════════════════════════════════════════════════

const stopPoller = startNotificationPoller(bot, 30_000, FRONTEND_URL);

// ═══════════════════════════════════════════════════════════════
//  Set commands and log
// ═══════════════════════════════════════════════════════════════

await setBotCommands();

console.log(`
✅ Bot is running${USE_POLLING ? " (polling mode)" : ` (webhook mode)`}
📡 Health: http://localhost:${WEBHOOK_PORT}/health
📊 Dashboard: ${FRONTEND_URL}
`);

// ── Graceful Shutdown ──
function shutdown(): void {
  console.log("\n[Bot] Shutting down...");
  stopPoller();
  bot.stopPolling();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
