/**
 * GoalSwap Arena — Shared Formatting Utilities
 */

/** Format a timestamp as a human-readable "time ago" string */
export function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Sport display config — label and color classes */
export const SPORT_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  football: {
    label: "Football",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  basketball: {
    label: "Basketball",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  },
  nba: {
    label: "NBA",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  afl: {
    label: "AFL",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  baseball: {
    label: "Baseball",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  formula1: {
    label: "Formula 1",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  handball: {
    label: "Handball",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
  },
  hockey: {
    label: "Hockey",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  mma: {
    label: "MMA",
    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  },
  "american-football": {
    label: "American Football",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  rugby: {
    label: "Rugby",
    color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  },
  volleyball: {
    label: "Volleyball",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  golf: {
    label: "Golf",
    color: "text-lime-400 border-lime-500/30 bg-lime-500/10",
  },
};

/** Format sport ID to display name */
export function sportLabel(sport: string): string {
  return SPORT_CONFIG[sport]?.label ?? sport;
}
