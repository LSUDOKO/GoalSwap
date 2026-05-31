/**
 * GoalSwap Arena — EventTimeline
 *
 * Displays a chronological feed of match events: goals, red cards,
 * fee changes, and match settlement. Supports both static match
 * events and live WebSocket events.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { WsGoalScored, WsFeeChanged, WsMatchSettled } from "@/lib/socket";

type TimelineEvent =
  | { type: "goal"; data: WsGoalScored; timestamp: number }
  | { type: "fee_change"; data: WsFeeChanged; timestamp: number }
  | { type: "settlement"; data: WsMatchSettled; timestamp: number }
  | { type: "red_card"; data: { matchId: string; team: string; player: string; minute: number }; timestamp: number }
  | { type: "penalty_shootout"; data: { matchId: string; timestamp: number }; timestamp: number }
  | { type: "match_start"; data: { matchId: string; minute: number; timestamp: number }; timestamp: number };

interface EventTimelineProps {
  events: TimelineEvent[];
  maxEvents?: number;
}

function getEventIcon(type: TimelineEvent["type"]): string {
  switch (type) {
    case "goal":
      return "G";
    case "fee_change":
      return "$";
    case "settlement":
      return "T";
    case "red_card":
      return "R";
    case "penalty_shootout":
      return "P";
    case "match_start":
      return "▶";
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function EventItem({ event }: { event: TimelineEvent }) {
  const isGoal = event.type === "goal";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`relative flex gap-3 pb-4 pl-6 ${
        isGoal ? "border-l-2 border-emerald-500/40" : "border-l border-zinc-800"
      }`}
    >
      {/* Timeline dot */}
      <div
        className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 ${
          isGoal
            ? "border-emerald-400 bg-emerald-500/30"
            : event.type === "settlement"
              ? "border-yellow-400 bg-yellow-500/30"
              : event.type === "red_card"
                ? "border-red-400 bg-red-500/30"
                : "border-zinc-600 bg-zinc-800"
        }`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm">{getEventIcon(event.type)}</span>
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
            {formatTime(event.timestamp)}
          </span>
          {"minute" in event.data && (
            <span className="text-[10px] font-mono text-zinc-600">{event.data.minute}&apos;</span>
          )}
        </div>
        <p className="text-xs text-zinc-300">
          {event.type === "goal" && (
            <>
              <span className="font-semibold text-emerald-400">GOAL!</span>{" "}
              {event.data.scorer} — <span className="font-medium">{event.data.team}</span>{" "}
              ({event.data.homeScore}-{event.data.awayScore})
              <br />
              <span className="text-zinc-500">Fee impact: {event.data.priceImpact}</span>
            </>
          )}
          {event.type === "fee_change" && (
            <>
              Fee changed:{" "}
              <span className="font-medium text-yellow-400">
                {(event.data.oldFee / 100).toFixed(1)}%
              </span>{" "}
              →{" "}
              <span className="font-medium text-orange-400">
                {(event.data.newFee / 100).toFixed(1)}%
              </span>
              <br />
              <span className="text-zinc-500">Reason: {event.data.reason}</span>
            </>
          )}
          {event.type === "settlement" && (
            <>
              Match settled —{" "}
              <span className="font-semibold text-yellow-400">
                Winner: {event.data.winner}
              </span>
              <br />
              <span className="text-zinc-500">
                Final score: {event.data.homeScore}-{event.data.awayScore}
              </span>
            </>
          )}
          {event.type === "red_card" && (
            <>
              <span className="font-semibold text-red-400">Red Card</span> —{" "}
              {event.data.player} ({event.data.team})
            </>
          )}
          {event.type === "penalty_shootout" && (
            <>
              <span className="font-semibold text-purple-400">Penalty Shootout!</span>
            </>
          )}
          {event.type === "match_start" && (
            <>
              Match kicked off!
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}

export function EventTimeline({ events, maxEvents = 50 }: EventTimelineProps) {
  const sorted = [...events]
    .sort((a, b) => b.timestamp - a.timestamp) // newest first
    .slice(0, maxEvents);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Timeline</h3>
        <p className="text-xs text-zinc-500 text-center py-8">
          No events yet. Live events will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4">Timeline</h3>
      <div className="relative">
        <AnimatePresence initial={false}>
          {sorted.map((event, i) => (
            <EventItem key={`${event.type}-${i}-${event.timestamp}`} event={event} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Re-export the type for use in pages
export type { TimelineEvent };
