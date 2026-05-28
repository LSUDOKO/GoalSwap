import type TelegramBot from "node-telegram-bot-api";
import { api } from "../services/api.js";

export function registerBracketsCommand(bot: TelegramBot): void {
  bot.onText(/^\/brackets(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const address = match?.[1]?.trim();

    const lines: string[] = [
      "🏆 *GoalSwap Brackets*",
      "",
      "Mint and trade bracket prediction NFTs for the World Cup 2026.",
      "",
      "*Available Rounds:*",
      "• 🅡 Round of 16 — Predict 8 winners",
      "• 🄦 Quarter-finals — Predict 4 winners",
      "• 🅢 Semi-finals — Predict 2 winners",
      "• 🅕 Final — Predict the champion",
      "",
      "Brackets are transferable ERC-721 NFTs —",
      "trade them on secondary markets before the tournament ends.",
      "",
      "👉 [View & Mint Brackets](https://goalswap.xyz/brackets)",
    ];

    if (address) {
      lines.push("");
      lines.push(`*Your Brackets:* \`${address.slice(0, 6)}...${address.slice(-4)}\``);
      lines.push("Check the web app for your minted brackets.");
    }

    await bot.sendMessage(chatId, lines.join("\n"), {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🏟️ Mint Brackets", url: "https://goalswap.xyz/brackets" },
            { text: "📊 Matches", callback_data: "cmd_live" },
          ],
        ],
      },
    });
  });
}
