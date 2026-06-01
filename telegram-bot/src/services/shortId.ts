/**
 * GoalSwap Telegram Bot — Short ID Mapping
 *
 * Telegram limits callback_data to 64 bytes. Our match IDs are keccak256 hashes
 * (66 chars: "0x" + 64 hex chars), which exceed this limit when prefixed.
 *
 * This module provides a bidirectional mapping between short aliases (12 chars)
 * and full match IDs, allowing callback_data to stay within limits.
 *
 * Format: "0x" + 10 hex chars = 12 chars
 * Example callback_data: "live_detail_0x1a2b3c4d5e" = 24 bytes ✅
 */

// In-memory lookup: shortAlias → full matchId
const shortToFull = new Map<string, string>();
// Reverse lookup: full matchId → shortAlias
const fullToShort = new Map<string, string>();

/**
 * Generate a short alias for a matchId and store the mapping.
 * Returns the short form (12 chars) for use in callback_data.
 */
export function shortId(matchId: string): string {
  const existing = fullToShort.get(matchId);
  if (existing) return existing;

  const short = matchId.slice(0, 12); // "0x" + 10 hex chars
  shortToFull.set(short, matchId);
  fullToShort.set(matchId, short);
  return short;
}

/**
 * Resolve a short alias back to the full matchId.
 * Returns undefined if the alias is unknown.
 */
export function resolveShortId(short: string): string | undefined {
  return shortToFull.get(short);
}

/**
 * Maximum allowed bytes for Telegram callback_data.
 * We use 60 to leave a small safety margin (Telegram limit is 64).
 */
export const MAX_CALLBACK_BYTES = 60;

/**
 * Build a safe callback_data string that fits within Telegram's limit.
 * Uses shortId for match IDs to keep them compact.
 */
export function safeCallback(prefix: string, matchId: string): string {
  const short = shortId(matchId);
  const data = `${prefix}_${short}`;
  if (data.length > MAX_CALLBACK_BYTES) {
    console.warn(`[ShortId] callback_data too long (${data.length} bytes): ${data}`);
  }
  return data;
}
