/**
 * GoalSwap Oracle — StateValidator
 *
 * Maintains an in-memory cache of the last known state per matchId.
 * Compares new polled data against cached state to detect meaningful changes.
 *
 * Only emits a state change when:
 *  - Score changed (goal detected)
 *  - Match status changed (LIV → FT, NS → LIV)
 *  - Red card added
 *  - Minute advanced by >2 (catch-up after downtime)
 *
 * Performs data sanity validation:
 *  - homeScore + awayScore cannot decrease
 *  - minute must increase or stay the same
 */

import { ChangeType, MatchState, MatchUpdate, StateChange, SPORT_INFO } from "./types.js";

export class StateValidator {
  /** In-memory cache: matchId → MatchState */
  private stateCache = new Map<string, MatchState>();

  /** Track last-seen match status for status-change detection */
  private statusCache = new Map<string, string>();

  /**
   * Validate and diff a batch of match updates against cached state.
   * Returns only the matches where meaningful changes occurred.
   */
  validateUpdates(updates: MatchUpdate[]): StateChange[] {
    const changes: StateChange[] = [];

    for (const update of updates) {
      const cached = this.stateCache.get(update.matchId);
      const previousStatus = this.statusCache.get(update.matchId);

      // Build the previous state
      const previousState: MatchState = cached ?? {
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        redCards: 0,
        penaltyShootout: false,
        isFinished: false,
        lastGoalTimestamp: 0,
        lastUpdateBlock: 0,
      };

      // Build new state from the update
      const newState: MatchState = {
        homeScore: update.homeScore,
        awayScore: update.awayScore,
        minute: update.minute,
        redCards: update.redCards,
        penaltyShootout: update.penaltyShootout,
        isFinished: update.isFinished,
        lastGoalTimestamp: cached?.lastGoalTimestamp ?? 0,
        lastUpdateBlock: cached?.lastUpdateBlock ?? 0,
      };

      // Validate data sanity (sport-aware thresholds)
      const validationError = this._validateSanity(previousState, newState, update.sport);
      if (validationError) {
        console.warn(`[StateValidator] Sanity check failed for ${update.matchId}: ${validationError}`);
        // Still update cache, but don't emit change
        this._updateCache(update.matchId, newState, update.status);
        continue;
      }

      // Detect what changed
      const change = this._detectChange(update.matchId, previousState, newState, update.status, previousStatus);
      if (change.hasChanged) {
        changes.push(change);

        // Update lastGoalTimestamp if goal scored
        if (change.changeType === ChangeType.GOAL) {
          newState.lastGoalTimestamp = Math.floor(Date.now() / 1000);
        }

        // Update lastUpdateBlock for new state
        newState.lastUpdateBlock = Math.floor(Date.now() / 1000);
      }

      // Always update the cache (even if no change — we track "last seen")
      this._updateCache(update.matchId, newState, update.status);
    }

    return changes;
  }

  /**
   * Get the current cached state for a match.
   */
  getCachedState(matchId: string): MatchState | undefined {
    return this.stateCache.get(matchId);
  }

  /**
   * Check if a match exists in cache.
   */
  hasMatch(matchId: string): boolean {
    return this.stateCache.has(matchId);
  }

  /**
   * Get all cached match IDs.
   */
  getAllMatchIds(): string[] {
    return Array.from(this.stateCache.keys());
  }

  /**
   * Get all cached match states.
   */
  getAllStates(): Map<string, MatchState> {
    return new Map(this.stateCache);
  }

  /**
   * Seed the cache with existing on-chain state (called at startup).
   */
  seedState(matchId: string, state: MatchState, status?: string): void {
    this.stateCache.set(matchId, state);
    if (status) this.statusCache.set(matchId, status);
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal
  // ═══════════════════════════════════════════════════════════════

  private _updateCache(matchId: string, state: MatchState, status: string): void {
    this.stateCache.set(matchId, state);
    this.statusCache.set(matchId, status);
  }

  /**
   * Validate that the new state is sane relative to the previous state.
   */
  private _validateSanity(prev: MatchState, next: MatchState, sport?: string): string | null {
    if (next.homeScore < prev.homeScore) {
      return `homeScore decreased: ${prev.homeScore} → ${next.homeScore}`;
    }
    if (next.awayScore < prev.awayScore) {
      return `awayScore decreased: ${prev.awayScore} → ${next.awayScore}`;
    }
    if (next.minute < prev.minute && !next.isFinished) {
      return `minute decreased: ${prev.minute} → ${next.minute}`;
    }
    // Sport-aware max score thresholds — uses SPORT_INFO from types
    const s = (sport ?? "football") as import("./types.js").Sport;
    const sportInfo = SPORT_INFO[s];
    const maxScore = sportInfo?.maxScore ?? 50;
    if (next.homeScore > maxScore || next.awayScore > maxScore) {
      return `improbable score: ${next.homeScore}-${next.awayScore}`;
    }
    // Sport-aware max minute thresholds
    const maxMinute = sportInfo?.maxMinute ?? 210;
    if (next.minute > maxMinute) {
      return `improbable minute: ${next.minute}`;
    }
    return null;
  }

  /**
   * Detect what changed between previous and new state.
   */
  private _detectChange(
    matchId: string,
    prev: MatchState,
    next: MatchState,
    currentStatus: string,
    previousStatus: string | undefined,
  ): StateChange {
    // 1. Goal detected
    if (next.homeScore > prev.homeScore || next.awayScore > prev.awayScore) {
      const scoredTeam = next.homeScore > prev.homeScore ? "home" : "away";
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.GOAL,
        previousState: prev,
        newState: next,
        description: `GOAL! ${next.homeScore}-${next.awayScore} (${next.minute}') — ${scoredTeam} team scored`,
      };
    }

    // 2. Settlement / match finished
    if (next.isFinished && !prev.isFinished) {
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.SETTLEMENT,
        previousState: prev,
        newState: next,
        description: `Match settled: ${next.homeScore}-${next.awayScore}`,
      };
    }

    // 3. Status change (e.g., NS → LIV)
    if (previousStatus && previousStatus !== currentStatus) {
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.STATUS_CHANGE,
        previousState: prev,
        newState: next,
        description: `Status changed: ${previousStatus} → ${currentStatus}`,
      };
    }

    // 4. Red card detected
    if (next.redCards > prev.redCards) {
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.RED_CARD,
        previousState: prev,
        newState: next,
        description: `Red card! Total reds: ${next.redCards}`,
      };
    }

    // 5. Penalty shootout started
    if (next.penaltyShootout && !prev.penaltyShootout) {
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.PENALTY_SHOOTOUT,
        previousState: prev,
        newState: next,
        description: "Penalty shootout started",
      };
    }

    // 6. Minute advanced by >2 (catch-up after downtime)
    if (next.minute > prev.minute + 2) {
      return {
        matchId,
        matchKey: matchId,
        hasChanged: true,
        changeType: ChangeType.MINUTE_ADVANCE,
        previousState: prev,
        newState: next,
        description: `Minute advanced: ${prev.minute}' → ${next.minute}'`,
      };
    }

    // No meaningful change
    return {
      matchId,
      matchKey: matchId,
      hasChanged: false,
      changeType: ChangeType.NONE,
      previousState: prev,
      newState: next,
      description: "No meaningful change",
    };
  }
}
