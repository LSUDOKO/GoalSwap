/**
 * GoalSwap Telegram Bot — /portfolio and /trophies Commands
 *
 * /portfolio {wallet} — Show user's trading portfolio with positions and PnL
 * /trophies {wallet} — Show user's Soulbound Trophy collection from GoalSwapTrophies
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import {
  upsertUser,
  setWalletAddress,
  getUser,
} from "../services/db.js";

export function registerPortfolioCommands(bot: TelegramBot): void {
  // ── /portfolio {wallet} ──
  bot.onText(/^\/portfolio(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    if (!match) return;
    const walletAddress = match[1]?.trim();

    if (!walletAddress) {
      // Check if user has saved wallet
      const user = getUser(userId);
      if (user?.walletAddress) {
        await sendPortfolio(bot, chatId, user.walletAddress);
      } else {
        await bot.sendMessage(chatId, [
          "💰 *Portfolio*",
          "",
          "Usage: `/portfolio {walletAddress}`",
          "",
          "Example:",
          "• `/portfolio 0x1234...5678`",
          "",
          "Or link your wallet to save it:",
          "• `/linkwallet 0x1234...5678`",
        ].join("\n"), { parse_mode: "Markdown" });
      }
      return;
    }

    // Validate basic address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress) && !/^[1-9A-HJNP-Za-km-z]{32,44}$/.test(walletAddress)) {
      await bot.sendMessage(chatId, "❌ Invalid wallet address format.");
      return;
    }

    await sendPortfolio(bot, chatId, walletAddress);
  });

  // ── /linkwallet {address} — Save wallet address ──
  bot.onText(/^\/linkwallet\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    if (!match) return;
    const walletAddress = match[1].trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress) && !/^[1-9A-HJNP-Za-km-z]{32,44}$/.test(walletAddress)) {
      await bot.sendMessage(chatId, "❌ Invalid wallet address format.");
      return;
    }

    upsertUser({
      userId,
      username: msg.from?.username,
      firstName: msg.from?.first_name ?? "User",
    });
    setWalletAddress(userId, walletAddress);

    await bot.sendMessage(chatId, [
      `✅ *Wallet Linked!*`,
      `\`${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}\``,
      ``,
      `Use \`/portfolio\` to view your positions.`,
      `Use \`/trophies\` to view your trophies.`,
    ].join("\n"), { parse_mode: "Markdown" });
  });

  // ── /trophies {wallet} ──
  bot.onText(/^\/trophies(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    const walletAddress = match?.[1]?.trim();

    let address = walletAddress;
    if (!address) {
      const user = getUser(userId);
      address = user?.walletAddress;
    }

    if (!address) {
      await bot.sendMessage(chatId, [
        "🏆 *Trophies*",
        "",
        "Usage: `/trophies {walletAddress}`",
        "",
        "Example:",
        "• `/trophies 0x1234...5678`",
        "• Or use `/linkwallet` to save your address first.",
      ].join("\n"), { parse_mode: "Markdown" });
      return;
    }

    await sendTrophies(bot, chatId, address);
  });

  // ── Callback handlers: trophies_ and portfolio_ ──
  bot.on("callback_query", async (query) => {
    if (!query.data || !query.message) return;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    const trophiesMatch = query.data.match(/^trophies_(0x[a-fA-F0-9]{40})$/);
    if (trophiesMatch) {
      await bot.answerCallbackQuery(query.id, { text: "🏆 Loading trophies...", show_alert: false });
      await bot.editMessageText("🏆 Loading trophies...", {
        chat_id: chatId, message_id: messageId,
      });
      await sendTrophies(bot, chatId, trophiesMatch[1]);
      return;
    }

    const portfolioMatch = query.data.match(/^portfolio_(0x[a-fA-F0-9]{40})$/);
    if (portfolioMatch) {
      await bot.answerCallbackQuery(query.id, { text: "💰 Refreshing portfolio...", show_alert: false });
      await bot.editMessageText("💰 Refreshing portfolio...", {
        chat_id: chatId, message_id: messageId,
      });
      await sendPortfolio(bot, chatId, portfolioMatch[1]);
      return;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Internal
// ═══════════════════════════════════════════════════════════════════

async function sendPortfolio(
  bot: TelegramBot,
  chatId: number,
  address: string,
): Promise<void> {
  // Show loading state
  const loadingMsg = await bot.sendMessage(chatId, "💰 Fetching portfolio...");

  const portfolio = await api.getUserPortfolio(address);

  if (!portfolio) {
    await bot.editMessageText(
      [
        `💰 *Portfolio*`,
        ``,
        `Address: \`${address.slice(0, 10)}...${address.slice(-8)}\``,
        ``,
        "No portfolio data available yet.",
        "Positions will appear here once you start trading.",
        ``,
        "📊 Use `/live` to find matches to trade.",
      ].join("\n"),
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "Markdown",
      },
    );
    return;
  }

  const lines: string[] = [
    `💰 *Portfolio*`,
    ``,
    `Address: \`${address.slice(0, 10)}...${address.slice(-8)}\``,
    ``,
  ];

  if (portfolio.positions && portfolio.positions.length > 0) {
    lines.push(`*Open Positions:*`);
    for (const pos of portfolio.positions) {
      const pnlEmoji = pos.pnl.startsWith("-") ? "🔴" : "🟢";
      lines.push(
        `• ${pos.team}: ${pos.amount}`,
        `  Value: ${pos.currentValue} | ${pnlEmoji} PnL: ${pos.pnl}`,
      );
    }
    lines.push(``);
    lines.push(`*Total PnL:* ${portfolio.pnl}`);
  } else {
    lines.push("*No open positions*");
    lines.push("Matches appear here when you trade.");
  }

  lines.push(``);
  lines.push(`[▶️ Start Trading](https://goalswap.xyz/?ref=${address})`);

  await bot.editMessageText(lines.join("\n"), {
    chat_id: chatId,
    message_id: loadingMsg.message_id,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🏆 View Trophies", callback_data: `trophies_${address}` },
          { text: "🔄 Refresh", callback_data: `portfolio_${address}` },
        ],
      ],
    },
  });
}

async function sendTrophies(
  bot: TelegramBot,
  chatId: number,
  address: string,
): Promise<void> {
  const portfolio = await api.getUserPortfolio(address);

  const TROPHY_TIERS: Record<number, { name: string; emoji: string; description: string }> = {
    1: { name: "Lightning Reflex", emoji: "⚡", description: "Traded within 60s of a goal" },
    2: { name: "Bronze Nostradamus", emoji: "🥉", description: "Correct upset prediction" },
    3: { name: "Silver Prophet", emoji: "🥈", description: "5 correct in-play trades" },
    4: { name: "Golden Ball Trader", emoji: "🏆", description: "Predicted tournament winner" },
    5: { name: "Arena Legend", emoji: "👑", description: "Top 100 all-time leaderboard" },
  };

  const trophies = portfolio?.trophies ?? [];

  const lines: string[] = [
    `🏆 *Trophy Cabinet*`,
    ``,
    `Wallet: \`${address.slice(0, 10)}...${address.slice(-8)}\``,
    ``,
  ];

  if (trophies.length === 0) {
    lines.push("*No trophies yet*");
    lines.push("");
    lines.push("Trade during live matches to earn Soulbound Trophies:");
    for (const [tier, info] of Object.entries(TROPHY_TIERS)) {
      lines.push(`• ${info.emoji} *${info.name}* (Tier ${tier}) — ${info.description}`);
    }
    lines.push("");
    lines.push("🏅 Use `/live` to find active matches.");
  } else {
    lines.push(`*Earned Trophies:* ${trophies.length}`);
    lines.push("");
    for (let i = 0; i < 5; i++) {
      const info = TROPHY_TIERS[i + 1];
      if (!info) continue;
      const userTrophies = trophies.filter((t) => t.tier === i + 1);
      if (userTrophies.length > 0) {
        lines.push(`✅ ${info.emoji} *${info.name}* ×${userTrophies.length}`);
      } else {
        lines.push(`⬜ ${info.emoji} *${info.name}* — Locked`);
      }
    }
  }

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 View Portfolio", callback_data: `portfolio_${address}` },
          { text: "🔴 Live Matches", callback_data: "cmd_live" },
        ],
      ],
    },
  });
}
