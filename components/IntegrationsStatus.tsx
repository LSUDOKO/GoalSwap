/**
 * GoalSwap Arena — IntegrationsStatus
 *
 * Live system integration dashboard showing health status
 * of all platform services (oracle, bots, contracts, infra).
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Service {
  id: string;
  name: string;
  type: "backend" | "bot" | "smart-contract" | "infrastructure";
  status: "operational" | "degraded" | "down";
  description: string;
  link?: string;
  metrics?: Record<string, string | number>;
}

interface IntegrationsData {
  services: Service[];
  timestamp: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  backend: { label: "Backend", icon: "⚙️", color: "text-blue-400" },
  bot: { label: "Bot", icon: "🤖", color: "text-purple-400" },
  "smart-contract": {
    label: "Smart Contract",
    icon: "📜",
    color: "text-emerald-400",
  },
  infrastructure: {
    label: "Infrastructure",
    icon: "☁️",
    color: "text-yellow-400",
  },
};

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  operational: {
    icon: "●",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  degraded: {
    icon: "◐",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  down: { icon: "○", color: "text-red-400", bg: "bg-red-500/10" },
};

const INTEGRATIONS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function IntegrationsStatus() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${INTEGRATIONS_BASE_URL}/api/integrations`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load integrations",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const operationalCount =
    data?.services.filter((s) => s.status === "operational").length ?? 0;
  const totalCount = data?.services.length ?? 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-zinc-800" />
          <div className="h-3 w-64 rounded bg-zinc-800" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-zinc-800/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            ⚠️
          </span>
          <span>System status unavailable — oracle may be offline</span>
        </div>
      </div>
    );
  }

  const visible = expanded ? data!.services : data!.services.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">
              🔌
            </span>
            <h3 className="text-sm font-semibold text-zinc-100">
              System Integrations
            </h3>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {operationalCount}/{totalCount} services operational
            {data?.timestamp &&
              ` — last checked ${new Date(data.timestamp).toLocaleTimeString()}`}
          </p>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-0.5">
            {data!.services.map((s) => (
              <span
                key={s.id}
                className={`inline-block h-2 w-2 rounded-full ${
                  s.status === "operational"
                    ? "bg-emerald-400"
                    : s.status === "degraded"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map((service, i) => {
            const typeCfg = TYPE_CONFIG[service.type] ?? TYPE_CONFIG.backend;
            const statusCfg =
              STATUS_CONFIG[service.status] ?? STATUS_CONFIG.operational;

            return (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-100 truncate">
                        {service.name}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-medium ${typeCfg.color}`}
                      >
                        {typeCfg.icon}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 text-xs ${statusCfg.color}`}
                    title={service.status}
                  >
                    {statusCfg.icon}
                  </span>
                </div>

                {/* Metrics row */}
                {service.metrics && Object.keys(service.metrics).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(service.metrics).map(([key, val]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-md bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-500"
                      >
                        <span className="capitalize">{key}:</span>
                        <span className="font-mono text-zinc-400">{val}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Link */}
                {service.link && (
                  <a
                    href={service.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Open ↗
                  </a>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more / less toggle */}
      {data!.services.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full rounded-lg border border-zinc-800 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          {expanded
            ? "Show less ↑"
            : `Show all ${data!.services.length} integrations ↓`}
        </button>
      )}
    </motion.div>
  );
}
