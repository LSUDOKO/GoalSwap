/**
 * GoalSwap Arena — /status
 *
 * Full system status dashboard showing all integrations,
 * service health, and platform metrics.
 */

"use client";

import { useEffect, useState } from "react";
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

export default function StatusPage() {
  const [health, setHealth] = useState<OracleHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${STATUS_BASE_URL}/health`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json: OracleHealth = await res.json();
        setHealth(json);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-zinc-100 sm:text-3xl"
        >
          System Status
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-sm text-zinc-500"
        >
          Real-time health monitoring for all GoalSwap services
        </motion.p>
      </div>

      {/* Oracle Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">
            🩺
          </span>
          <h2 className="text-sm font-semibold text-zinc-100">
            Oracle Service Health
          </h2>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-48 rounded bg-zinc-800" />
            <div className="h-4 w-36 rounded bg-zinc-800" />
          </div>
        ) : health ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Service Status",
                value: health.status,
                icon: health.status === "healthy" ? "✅" : "⚠️",
                color:
                  health.status === "healthy"
                    ? "text-emerald-400"
                    : "text-yellow-400",
              },
              {
                label: "Redis",
                value: health.redis,
                icon: health.redis === "connected" ? "✅" : "❌",
                color:
                  health.redis === "connected"
                    ? "text-emerald-400"
                    : "text-red-400",
              },
              {
                label: "WS Connections",
                value: String(health.wsConnections),
                icon: "🔌",
                color: "text-blue-400",
              },
              {
                label: "Active Matches",
                value: String(health.activeMatches),
                icon: "🏆",
                color: "text-emerald-400",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{metric.label}</span>
                  <span>{metric.icon}</span>
                </div>
                <p
                  className={`mt-1.5 text-lg font-semibold tabular-nums ${metric.color}`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>⚠️</span>
            <span>Unable to reach oracle service</span>
          </div>
        )}

        {health?.timestamp && (
          <p className="mt-3 text-[10px] text-zinc-600">
            Last checked: {new Date(health.timestamp).toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-sm">
            🔗
          </span>
          <h2 className="text-sm font-semibold text-zinc-100">
            Quick Links
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/matches", label: "Matches", icon: "⚽", desc: "Browse all matches" },
            { href: "/games", label: "All Games", icon: "🏀", desc: "Multi-sport view" },
            { href: "/activity", label: "Activity", icon: "📰", desc: "Live activity feed" },
            { href: "/tokens", label: "Tokens", icon: "🪙", desc: "Fan tokens & markets" },
            { href: "/leaderboard", label: "Leaderboard", icon: "🏅", desc: "Top traders" },
            { href: "https://t.me/GoalSwapArenaBot", label: "Telegram Bot", icon: "🤖", desc: "@GoalSwapArenaBot", external: true },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <span className="text-lg">{link.icon}</span>
              <div>
                <span className="text-sm font-medium text-zinc-100">
                  {link.label}
                </span>
                <p className="text-[10px] text-zinc-500">{link.desc}</p>
              </div>
              {link.external && (
                <span className="ml-auto text-[10px] text-zinc-600">↗</span>
              )}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Full Integrations Status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <IntegrationsStatus />
      </motion.div>
    </div>
  );
}
