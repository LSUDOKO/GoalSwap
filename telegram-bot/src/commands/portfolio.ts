/**
 * GoalSwap Telegram Bot — /portfolio, /linkwallet, /trophies Commands
 *
 * /linkwallet {address} — Save wallet address to profile
 * /linkwallet            — Show usage instructions
 * /portfolio {wallet}   — Show user's trading portfolio with positions and PnL
 * /portfolio             — Show saved wallet's portfolio (requires /linkwallet first)
 * /trophies {wallet}    — Show user's Soulbound Trophy collection
 * /trophies              — Show saved wallet's trophies (requires /linkwallet first)
 */

import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";
import { FRONTEND_URL } from "../config.js";
import {
  upsertUser,
  setWalletAddress,
  getUser,
} from "../services/db.js";

export function registerPortfolioCommands(bot: TelegramBot): void {
  // ── /linkwallet — Usage help (no args) ──
  bot.onText(/^\/linkwallet$/i, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, [
      "🔗 *Link Your Wallet*",
      "",
      "Connect your X Layer wallet to save it to your profile.",
      "Once linked, you can use `/portfolio` and `/trophies` without re-entering your address.",
      "",
      "*Usage:*",
      "`/linkwallet 0x1234567890abcdef1234567890abcdef12345678`",
      "",
      "*Supported:*",
      "• EVM addresses (0x...)",
      "• Solana addresses (base58)",
    ].join("\n"), { parse_mode: "Markdown", disable_web_page_preview: true });
  });

  // ── /linkwallet {address} — Save wallet address ──
  bot.onText(/^\/linkwallet\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? chatId;
    if (!match) return;
    const walletAddress = match[1].trim();

    // Validate basic address format
    const isEvm = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
    const isSolana = /^[1-9A-HJNP-Za-km-z]{32,44}$/.test(walletAddress);

    if (!isEvm && !isSolana) {
      await bot.sendMessage(chatId, [
        "❌ *Invalid wallet address*",
        "",
        "Please provide a valid EVM address (0x...) or Solana address.",
        "",
        "Example:",
        "`/linkwallet 0x1234567890abcdef1234567890abcdef12345678`",
      ].join("\n"), { parse_mode: "Markdown" });
      return;
    }

    // First, upsert the user so the record exists
    upsertUser({
      userId,
      username: msg.from?.username,
      firstName: msg.from?.first_name ?? "User",
    });

    // Then save the wallet address
    setWalletAddress(userId, walletAddress);

    // Verify it saved
    const savedUser = getUser(userId);
    const saved = savedUser?.walletAddress === walletAddress;

    if (saved) {
      await bot.sendMessage(chatId, [
        "✅ *Wallet Linked!*",
        "",
        `📍 \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\``,
        "",
        "*Quick commands:*",
        "• `/portfolio` — View your trading positions",
        "• `/trophies` — View your trophy cabinet",
        "• `/leaderboard` — See where you rank",
      ].join("\n"), {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "💰 View Portfolio", callback_data: `portfolio_${walletAddress}` },
              { text: "🏆 View Trophies", callback_data: `trophies_${walletAddress}` },
            ],
          ],
        },
      });
    } else {
      await bot.sendMessage(chatId, "⚠️ Wallet saved but could not verify. Please try again.");
    }
  });

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
          "No wallet linked yet. Link your wallet first:",
          "",
          "`/linkwallet 0x1234...5678`",
          "",
          "Or provide an address directly:",
          "`/portfolio 0x1234...5678`",
        ].join("\n"), { parse_mode: "Markdown" });
      }
      return;
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress) && !/^[1-9A-HJNP-Za-km-z]{32,44}$/.test(walletAddress)) {
      await bot.sendMessage(chatId, "❌ Invalid wallet address format. Use `0x...` (EVM) or base58 (Solana).", { parse_mode: "Markdown" });
      return;
    }

    await sendPortfolio(bot, chatId, walletAddress);
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
        "No wallet linked yet. Link your wallet first:",
        "",
        "`/linkwallet 0x1234...5678`",
        "",
        "Or provide an address directly:",
        "`/trophies 0x1234...5678`",
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

    const trophiesMatch = query.data.match(/^trophies_(.+)$/);
    if (trophiesMatch) {
      const addr = trophiesMatch[1];
      await bot.answerCallbackQuery(query.id, { text: "🏆 Loading trophies...", show_alert: false });
      await bot.editMessageText("🏆 Loading trophies...", {
        chat_id: chatId, message_id: messageId,
      });
      await sendTrophies(bot, chatId, addr);
      return;
    }

    const portfolioMatch = query.data.match(/^portfolio_(.+)$/);
    if (portfolioMatch) {
      const addr = portfolioMatch[1];
      await bot.answerCallbackQuery(query.id, { text: "💰 Refreshing portfolio...", show_alert: false });
      await bot.editMessageText("💰 Refreshing portfolio...", {
        chat_id: chatId, message_id: messageId,
      });
      await sendPortfolio(bot, chatId, addr);
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
        "Start trading to see your positions here!",
        ``,
        "📊 Use /live to find matches to trade.",
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
      const pnlNum = parseFloat(pos.pnl);
      const pnlEmoji = pnlNum >= 0 ? "🟢" : "🔴";
      const label = pos.team || pos.market || pos.matchId.slice(0, 12);
      lines.push(
        `• ${label}`,
        `  Amount: ${pos.amount} | Value: ${pos.currentValue}`,
        `  ${pnlEmoji} PnL: ${pos.pnl} USDC`,
      );
    }
    lines.push(``);
    const totalPnl = parseFloat(portfolio.pnl) || 0;
    const pnlSign = totalPnl >= 0 ? "+" : "";
    lines.push(`*Total PnL:* ${pnlSign}${portfolio.pnl} USDC`);
  } else {
    lines.push("*No open positions*");
    lines.push("Matches appear here when you trade.");
  }

  if (typeof portfolio.trophies === "number" && portfolio.trophies > 0) {
    lines.push(``);
    lines.push(`*Trophies:* ${portfolio.trophies} earned 🏆`);
  } else if (Array.isArray(portfolio.trophies) && portfolio.trophies.length > 0) {
    lines.push(``);
    lines.push(`*Trophies:* ${portfolio.trophies.length} earned 🏆`);
  }

  lines.push(``);
  lines.push(`[▶️ Start Trading](${FRONTEND_URL}/?ref=${address})`);

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
        [
          { text: "📊 Live Matches", callback_data: "cmd_live" },
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

  if (!portfolio) {
    await bot.sendMessage(chatId, [
      "🏆 *Trophy Cabinet*",
      "",
      `Wallet: \`${address.slice(0, 10)}...${address.slice(-8)}\``,
      "",
      "No portfolio data found for this wallet.",
      "Link your wallet with /linkwallet and start trading to earn trophies!",
    ].join("\n"), { parse_mode: "Markdown" });
    return;
  }

  const TROPHY_TIERS: Record<number, { name: string; emoji: string; description: string }> = {
    1: { name: "Lightning Reflex", emoji: "⚡", description: "Traded within 60s of a goal" },
    2: { name: "Bronze Nostradamus", emoji: "🥉", description: "Correct upset prediction" },
    3: { name: "Silver Prophet", emoji: "🥈", description: "5 correct in-play trades" },
    4: { name: "Golden Ball Trader", emoji: "🏆", description: "Predicted tournament winner" },
    5: { name: "Arena Legend", emoji: "👑", description: "Top 100 all-time leaderboard" },
  };

  // Handle both formats: array of trophy objects or a number count
  const trophyCount = typeof portfolio?.trophies === "number"
    ? portfolio.trophies
    : Array.isArray(portfolio?.trophies)
      ? portfolio.trophies.length
      : 0;

  const trophyList = Array.isArray(portfolio?.trophies) ? portfolio.trophies : [];

  const lines: string[] = [
    `🏆 *Trophy Cabinet*`,
    ``,
    `Wallet: \`${address.slice(0, 10)}...${address.slice(-8)}\``,
    ``,
  ];

  if (trophyCount === 0) {
    lines.push("*No trophies yet*");
    lines.push("");
    lines.push("Trade during live matches to earn Soulbound Trophies:");
    for (const [, info] of Object.entries(TROPHY_TIERS)) {
      lines.push(`• ${info.emoji} *${info.name}* — ${info.description}`);
    }
    lines.push("");
    lines.push("🏅 Use /live to find active matches.");
  } else {
    lines.push(`*${trophyCount} Trophy${trophyCount !== 1 ? "s" : ""} Earned*`);
    lines.push("");

    for (let i = 1; i <= 5; i++) {
      const info = TROPHY_TIERS[i];
      if (!info) continue;

      if (trophyList.length > 0) {
        const userTrophies = trophyList.filter((t) => (t as { tier?: number }).tier === i);
        if (userTrophies.length > 0) {
          lines.push(`✅ ${info.emoji} *${info.name}* ×${userTrophies.length}`);
        } else {
          lines.push(`⬜ ${info.emoji} *${info.name}* — Locked`);
        }
      } else {
        // We only have a count, not individual trophies — show earned count
        lines.push(`🏅 ${info.emoji} *${info.name}*`);
      }
    }
  }

  const inlineKeyboard = portfolio?.positions && portfolio.positions.length > 0
    ? [
        [
          { text: "💰 View Portfolio", callback_data: `portfolio_${address}` },
          { text: "🔄 Refresh", callback_data: `trophies_${address}` },
        ],
      ]
    : [
        [
          { text: "💰 View Portfolio", callback_data: `portfolio_${address}` },
          { text: "📊 Live Matches", callback_data: "cmd_live" },
        ],
      ];

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });
}
