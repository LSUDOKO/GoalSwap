import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { upsertUser } from "../services/db.js";

export function registerLeaderboardCommands(bot: TelegramBot): void {
  // ── /leaderboard ──
  bot.onText(/^\/leaderboard$/, async (msg) => {
    const chatId = msg.chat.id;
    const loadingMsg = await bot.sendMessage(chatId, "🏅 Loading leaderboard...");
    await sendLeaderboard(bot, chatId, loadingMsg.message_id);
  });

  // ── /referral ──
  bot.onText(/^\/referral$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const username = msg.from?.username;

    upsertUser({
      userId: userId ?? chatId,
      username,
      firstName: msg.from?.first_name ?? "User",
    });

    const refCode = username ?? `user_${(userId ?? chatId).toString(36)}`;
    const refLink = `https://t.me/GoalSwapArenaBot?start=ref_${refCode}`;
    const appLink = `https://goalswap.xyz?ref=${refCode}`;

    const message = [
      "🔗 *Referral Program*",
      "",
      "Share GoalSwap Arena and earn rewards!",
      "",
      "*Your Referral Link:*",
      `\`${refLink}\``,
      "",
      "*Direct App Link:*",
      `\`${appLink}\``,
      "",
      "Share with friends and earn:",
      "• 5% of their trading fees",
      "• XP bonus for each referral",
      "• Exclusive referral-only SBT at 10 referrals",
      "",
      "📱 Just tap to copy and share!",
    ].join("\n");

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📋 Copy Link", callback_data: "copy_ref" },
            { text: "🏅 Leaderboard", callback_data: "cmd_leaderboard" },
          ],
        ],
      },
    });
  });

  // ── Callback handlers ──
  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (query.data === "cmd_leaderboard") {
      await bot.answerCallbackQuery(query.id, { text: "🔄 Refreshing...", show_alert: false });
      await bot.editMessageText("🏅 Loading leaderboard...", {
        chat_id: chatId, message_id: messageId,
      });
      await sendLeaderboard(bot, chatId, messageId);
      return;
    }

    if (query.data === "copy_ref") {
      await bot.answerCallbackQuery(query.id, {
        text: "📋 Copy this referral link and share it!",
        show_alert: true,
      });
      return;
    }
  });
}

async function sendLeaderboard(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
): Promise<void> {
  const [volumeEntries, pnlEntries, trophyEntries] = await Promise.all([
    api.getLeaderboard("volume"),
    api.getLeaderboard("pnl"),
    api.getLeaderboard("trophies"),
  ]);

  const lines: string[] = [
    "🏅 *GoalSwap Leaderboard*",
    "",
  ];

  // Volume leaders
  lines.push("*📊 Top Traders by Volume*");
  if (volumeEntries.length === 0) {
    lines.push("No data available yet. Be the first to trade!");
  } else {
    for (const entry of volumeEntries.slice(0, 5)) {
      const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
      const address = `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
      lines.push(`${medal} \`${address}\` — Vol: ${entry.volume} | PnL: ${entry.pnl}`);
    }
  }

  lines.push("");

  // PnL leaders
  lines.push("*💎 Top Traders by PnL*");
  if (pnlEntries.length === 0) {
    lines.push("No data available yet.");
  } else {
    for (const entry of pnlEntries.slice(0, 3)) {
      const address = `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
      lines.push(`• \`${address}\` — ${entry.pnl}`);
    }
  }

  lines.push("");

  // Trophy leaders
  lines.push("*🏆 Top Trophy Collectors*");
  if (trophyEntries.length === 0) {
    lines.push("No trophies minted yet. Trade during live matches to earn one!");
  } else {
    for (const entry of trophyEntries.slice(0, 3)) {
      const address = `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
      lines.push(`• \`${address}\` — ${entry.trophies} trophies | ${entry.xp} XP`);
    }
  }

  lines.push("");
  lines.push("Trade on live matches to climb the rankings!");
  lines.push("[▶️ Trade Now](https://goalswap.xyz/matches)");

  await bot.editMessageText(lines.join("\n"), {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "cmd_leaderboard" },
          { text: "🔴 Live Matches", callback_data: "cmd_live" },
        ],
      ],
    },
  });
}
