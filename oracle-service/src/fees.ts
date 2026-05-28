/**
 * GoalSwap Oracle — Fee Tier Calculator
 *
 * Mirrors the on-chain dynamic fee logic from WorldCupArenaHook.sol
 * for display in WebSocket events and REST API responses.
 *
 * NOTE: On-chain fee is authoritative. This is for display/notification only.
 */

import type { MatchState } from "./types.js";

/**
 * Fee tiers (hundredths of basis points, matching the hook contract).
 *
 * | Value  | Rate  | Scenario                  |
 * |--------|-------|---------------------------|
 * | 0      | 0%    | Settlement                |
 * | 3000   | 0.3%  | Kickoff (min ≤ 15)        |
 * | 10000  | 1.0%  | Normal play               |
 * | 30000  | 3.0%  | Post-goal (5 min window)  |
 * | 50000  | 5.0%  | Red card / Final minutes  |
 * | 100000 | 10.0% | Penalty shootout / Panic  |
 */
export const FEE_TIERS = {
  SETTLEMENT: 0,
  KICKOFF: 3000,
  NORMAL: 10000,
  POST_GOAL: 30000,
  HIGH_VOLATILITY: 50000,
  PENALTY_SHOOTOUT: 100000,
} as const;

/**
 * Post-goal volatility window in seconds.
 */
export const GOAL_FEE_WINDOW_SEC = 300; // 5 minutes

/**
 * Calculate the current fee tier from match state.
 * Uses wall-clock time for post-goal window (on-chain uses block.timestamp).
 */
export function getFeeTier(state: {
  isFinished: boolean;
  penaltyShootout: boolean;
  lastGoalTimestamp: number;
  redCards: number;
  minute: number;
}): number {
  if (state.isFinished) return FEE_TIERS.SETTLEMENT;
  if (state.penaltyShootout) return FEE_TIERS.PENALTY_SHOOTOUT;

  const nowSec = Math.floor(Date.now() / 1000);
  if (state.lastGoalTimestamp > 0 && nowSec <= state.lastGoalTimestamp + GOAL_FEE_WINDOW_SEC) {
    return FEE_TIERS.POST_GOAL;
  }

  if (state.redCards > 0 || state.minute >= 90) {
    return FEE_TIERS.HIGH_VOLATILITY;
  }

  if (state.minute <= 15) {
    return FEE_TIERS.KICKOFF;
  }

  return FEE_TIERS.NORMAL;
}

/**
 * Get a human-readable reason string for the current fee level.
 */
export function getFeeReason(state: {
  isFinished: boolean;
  penaltyShootout: boolean;
  lastGoalTimestamp: number;
  redCards: number;
  minute: number;
}): string {
  if (state.isFinished) return "Settlement";
  if (state.penaltyShootout) return "Penalty shootout";

  const nowSec = Math.floor(Date.now() / 1000);
  if (state.lastGoalTimestamp > 0 && nowSec <= state.lastGoalTimestamp + GOAL_FEE_WINDOW_SEC) {
    const remaining = state.lastGoalTimestamp + GOAL_FEE_WINDOW_SEC - nowSec;
    return `Post-goal volatility (${remaining}s remaining)`;
  }

  if (state.redCards > 0) return "Red card";
  if (state.minute >= 90) return "Final minutes";
  if (state.minute <= 15) return "Kickoff";
  return "Normal play";
}

/**
 * Format fee as human-readable percentage string.
 * E.g. 3000 → "0.30%", 10000 → "1.00%", 100000 → "10.00%"
 */
export function formatFeePct(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}

/**
 * Get fee tier color for frontend display.
 */
export function getFeeColor(fee: number): string {
  switch (fee) {
    case FEE_TIERS.SETTLEMENT:
      return "white";
    case FEE_TIERS.KICKOFF:
      return "gray";
    case FEE_TIERS.NORMAL:
      return "yellow";
    case FEE_TIERS.POST_GOAL:
      return "orange";
    case FEE_TIERS.HIGH_VOLATILITY:
      return "red";
    case FEE_TIERS.PENALTY_SHOOTOUT:
      return "purple";
    default:
      return "gray";
  }
}
