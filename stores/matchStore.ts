/**
 * GoalSwap Arena — Match State Store (Zustand)
 *
 * Manages match data, live matches, and subscription state.
 */

import { create } from "zustand";
import type { MatchSummary, MatchDetail } from "@/lib/oracle";
import type { WsMatchUpdate, WsGoalScored, WsFeeChanged } from "@/lib/socket";

interface MatchState {
  // Match lists
  allMatches: MatchSummary[];
  liveMatches: MatchSummary[];
  finishedMatches: MatchSummary[];

  // Match details cache
  matchDetails: Record<string, MatchDetail>;

  // Live WebSocket state for active matches
  liveState: Record<
    string,
    {
      homeScore: number;
      awayScore: number;
      minute: number;
      status: string;
      sport?: string;
      feeTier: number;
      feeReason: string;
    }
  >;

  // Recent events
  recentGoals: WsGoalScored[];
  recentFeeChanges: WsFeeChanged[];

  // Loading
  loading: boolean;
  error: string | null;

  // Actions
  setAllMatches: (matches: MatchSummary[]) => void;
  setMatchDetail: (matchId: string, detail: MatchDetail) => void;
  updateMatchState: (update: WsMatchUpdate) => void;
  addGoal: (goal: WsGoalScored) => void;
  updateFee: (fee: WsFeeChanged) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  allMatches: [],
  liveMatches: [],
  finishedMatches: [],
  matchDetails: {},
  liveState: {},
  recentGoals: [],
  recentFeeChanges: [],
  loading: false,
  error: null,

  setAllMatches: (matches) =>
    set({
      allMatches: matches,
      liveMatches: matches.filter((m) => m.status === "LIV"),
      finishedMatches: matches.filter((m) => m.status === "FT"),
    }),

  setMatchDetail: (matchId, detail) =>
    set((state) => ({
      matchDetails: { ...state.matchDetails, [matchId]: detail },
    })),

  updateMatchState: (update) =>
    set((state) => ({
      liveState: {
        ...state.liveState,
        [update.matchId]: {
          homeScore: update.homeScore,
          awayScore: update.awayScore,
          minute: update.minute,
          status: update.status,
          sport: update.sport,
          feeTier: update.feeTier,
          feeReason: update.feeReason,
        },
      },
      // Also update in match lists if present
      allMatches: state.allMatches.map((m) =>
        m.matchId === update.matchId
          ? {
              ...m,
              homeScore: update.homeScore,
              awayScore: update.awayScore,
              minute: update.minute,
              sport: update.sport ?? m.sport,
              status: update.status as "LIV" | "FT" | "NS",
            }
          : m,
      ),
    })),

  addGoal: (goal) =>
    set((state) => ({
      recentGoals: [goal, ...state.recentGoals].slice(0, 20),
    })),

  updateFee: (fee) =>
    set((state) => ({
      recentFeeChanges: [fee, ...state.recentFeeChanges].slice(0, 10),
      liveState: state.liveState[fee.matchId]
        ? {
            ...state.liveState,
            [fee.matchId]: {
              ...state.liveState[fee.matchId],
              feeTier: fee.newFee,
              feeReason: fee.reason,
            },
          }
        : state.liveState,
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
