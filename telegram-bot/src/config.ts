/**
 * GoalSwap Telegram Bot — Shared Configuration
 *
 * Centralized config for bot commands. Avoids importing process.env in every file.
 */

export const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://goalswap.vercel.app";

/** Build a trade URL for a match */
export function tradeUrl(matchId: string): string {
  return `${FRONTEND_URL}/match/${matchId}`;
}
