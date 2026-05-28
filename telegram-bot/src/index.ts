/**
 * GoalSwap Arena — Telegram Bot (@GoalSwapArenaBot)
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
║          @GoalSwapArenaBot                                ║
╚══════════════════════════════════════════════════════════╝
`);

// ── Configuration ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT ?? "3003", 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://goalswap.xyz";
const USE_POLLING = process.env.USE_POLLING !== "false";

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
  polling: USE_POLLING,
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

bot.on("polling_error", (err) => {
  console.error("[Bot] Polling error:", err.message);
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

app.listen(WEBHOOK_PORT, () => {
  console.log(`[Webhook] Bridge listening on port ${WEBHOOK_PORT}`);
});

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
