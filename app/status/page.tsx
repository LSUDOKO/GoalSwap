/**
 * GoalSwap Arena — /status
 *
 * Full system status dashboard showing all integrations,
 * service health, and platform metrics.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { IntegrationsStatus } from "@/components/IntegrationsStatus";

interface OracleHealth {
  status: string;
  redis: string;
  wsConnections: number;
  activeMatches: number;
  timestamp: string;
}

const STATUS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

function StatusPing({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${
          active ? "bg-emerald-400" : "bg-zinc-600"
        }`}
      />
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
};

export default function StatusPage() {
  const [health, setHealth] = useState<OracleHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${STATUS_BASE_URL}/health`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json: OracleHealth = await res.json();
      setHealth(json);
      setLastUpdated(new Date());
    } catch {
      // Silently fail on polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const refreshNow = () => {
    setLoading(true);
    fetchHealth();
  };

  const serviceHealthy = health?.status === "healthy";
  const redisConnected = health?.redis === "connected";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
            System Status
          </h1>
          <StatusPing active={serviceHealthy} />
        </div>
        <p className="text-sm text-zinc-500">
          Real-time health monitoring for all GoalSwap services
        </p>
      </motion.div>

      {/* Oracle Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm font-bold text-emerald-400">GS</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Oracle Service Health
              </h2>
              {lastUpdated && (
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={refreshNow}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all disabled:opacity-50"
          >
            <span className={`${loading ? "animate-spin" : ""}`}>⟳</span>
            <span>Refresh</span>
          </button>
        </div>

        {loading && !health ? (
          <div className="animate-pulse space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="h-3 w-20 rounded bg-zinc-800 mb-3" />
                  <div className="h-7 w-16 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ) : health ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Service Status",
                value: health.status.charAt(0).toUpperCase() + health.status.slice(1),
                icon: serviceHealthy ? "OK" : "!",
                color: serviceHealthy ? "text-emerald-400" : "text-yellow-400",
                subtext: serviceHealthy ? "All systems operational" : "Degraded performance",
              },
              {
                label: "Redis Cache",
                value: redisConnected ? "Connected" : "Disconnected",
                icon: redisConnected ? "OK" : "!!",
                color: redisConnected ? "text-emerald-400" : "text-red-400",
                subtext: redisConnected ? "In-memory fallback active" : "Using direct API",
              },
              {
                label: "WS Connections",
                value: String(health.wsConnections),
                icon: "~",
                color: "text-blue-400",
                subtext: `${health.wsConnections > 0 ? "Active connections" : "No connections"}`,
              },
              {
                label: "Active Matches",
                value: String(health.activeMatches),
                icon: "M",
                color: "text-emerald-400",
                subtext: `${health.activeMatches} match${health.activeMatches !== 1 ? "es" : ""} tracked`,
              },
            ].map((metric) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 font-medium">{metric.label}</span>
                  <span className="text-sm">{metric.icon}</span>
                </div>
                <p className={`text-xl font-bold tabular-nums ${metric.color}`}>
                  {metric.value}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">{metric.subtext}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
              <span className="text-lg font-bold text-yellow-400">!</span>
            </div>
            <p className="text-sm text-zinc-400 font-medium mb-1">
              Unable to reach oracle service
            </p>
            <p className="text-xs text-zinc-600 mb-4">
              The oracle backend may be offline or starting up
            </p>
            <button
              onClick={refreshNow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              <span>⟳</span>
              <span>Retry Connection</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-6 rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="text-sm font-bold text-blue-400">→</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Quick Links</h2>
            <p className="text-[10px] text-zinc-600">Navigate to key platform sections</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/matches", label: "Matches", icon: "M", desc: "Browse all matches" },
            { href: "/games", label: "All Games", icon: "G", desc: "Multi-sport view" },
            { href: "/activity", label: "Activity", icon: "A", desc: "Live activity feed" },
            { href: "/tokens", label: "Tokens", icon: "T", desc: "Fan tokens & markets" },
            { href: "/leaderboard", label: "Leaderboard", icon: "L", desc: "Top traders" },
            { href: "https://t.me/GoalSwapArenaBot", label: "Telegram Bot", icon: "B", desc: "@GoalSwapArenaBot", external: true },
          ].map((link, i) => (
            <motion.div
              key={link.href}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-[0_0_12px_-4px_rgba(255,255,255,0.05)] group"
              >
                <span className="text-lg shrink-0">{link.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-zinc-100 group-hover:text-zinc-50 transition-colors">
                    {link.label}
                  </span>
                  <p className="text-[10px] text-zinc-500 truncate">{link.desc}</p>
                </div>
                {link.external && (
                  <span className="shrink-0 text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    ↗
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Full Integrations Status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <IntegrationsStatus />
      </motion.div>
    </div>
  );
}
