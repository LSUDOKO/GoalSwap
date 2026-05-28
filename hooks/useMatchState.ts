/**
 * GoalSwap Arena — useMatchState Hook
 *
 * Subscribes to a match room via WebSocket and returns live match data.
 * Also fetches initial state from the REST API.
 */

"use client";

import { useEffect, useState } from "react";
import { socketManager, type WsMatchUpdate, type WsGoalScored, type WsFeeChanged, type WsMatchSettled } from "@/lib/socket";
import { oracleApi, type MatchDetail } from "@/lib/oracle";
import { useMatchStore } from "@/stores/matchStore";

interface UseMatchStateReturn {
  detail: MatchDetail | null;
  liveState: {
    homeScore: number;
    awayScore: number;
    minute: number;
    status: string;
    feeTier: number;
    feeReason: string;
  } | null;
  loading: boolean;
  error: string | null;
  recentGoals: WsGoalScored[];
  recentFeeChanges: WsFeeChanged[];
}

export function useMatchState(matchId: string): UseMatchStateReturn {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const liveState = useMatchStore((s) => s.liveState[matchId] ?? null);
  const recentGoals = useMatchStore((s) => s.recentGoals.filter((g) => g.matchId === matchId));
  const recentFeeChanges = useMatchStore((s) => s.recentFeeChanges.filter((f) => f.matchId === matchId));
  const updateMatchState = useMatchStore((s) => s.updateMatchState);
  const addGoal = useMatchStore((s) => s.addGoal);
  const updateFee = useMatchStore((s) => s.updateFee);
  const setMatchDetail = useMatchStore((s) => s.setMatchDetail);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const d = await oracleApi.getMatchDetail(matchId);
        if (!cancelled) {
          if (d) {
            setDetail(d);
            setMatchDetail(matchId, d);
          } else {
            setError("Match not found");
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [matchId, setMatchDetail]);

  // WebSocket subscription
  useEffect(() => {
    socketManager.connect();
    socketManager.subscribeMatch(matchId);

    const unsubUpdate = socketManager.on("match:update", (data: WsMatchUpdate) => {
      if (data.matchId === matchId) {
        updateMatchState(data);
      }
    });

    const unsubGoal = socketManager.on("goal:scored", (data: WsGoalScored) => {
      if (data.matchId === matchId) {
        addGoal(data);
      }
    });

    const unsubFee = socketManager.on("fee:changed", (data: WsFeeChanged) => {
      if (data.matchId === matchId) {
        updateFee(data);
      }
    });

    return () => {
      socketManager.unsubscribeMatch(matchId);
      unsubUpdate();
      unsubGoal();
      unsubFee();
    };
  }, [matchId, updateMatchState, addGoal, updateFee]);

  return {
    detail,
    liveState,
    loading,
    error,
    recentGoals,
    recentFeeChanges,
  };
}
