/**
 * GoalSwap Arena — MatchCard
 *
 * Premium match card with spacious 2-column layout. Displays live score,
 * team identities, fee tier, and status with glassmorphism design.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { MatchSummary } from "@/lib/oracle";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getTeamCountryCode } from "@/lib/countries";
import { SPORT_CONFIG } from "@/lib/format";

interface MatchCardProps {
  match: MatchSummary;
}

function getFeeColor(feeTier?: number): string {
  if (!feeTier) return "text-zinc-400";
  if (feeTier >= 10000) return "text-purple-400";
  if (feeTier >= 5000) return "text-red-400";
  if (feeTier >= 3000) return "text-orange-400";
  if (feeTier >= 1000) return "text-yellow-400";
  return "text-zinc-400";
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "LIV":
      return {
        label: "LIVE",
        className:
          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "FT":
      return {
        label: "FT",
        className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
      };
    default:
      return {
        label: "UPCOMING",
        className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      };
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const [homeLogoFailed, setHomeLogoFailed] = useState(false);
  const [awayLogoFailed, setAwayLogoFailed] = useState(false);
  const statusBadge = getStatusBadge(match.status);
  const isLive = match.status === "LIV";
  const isFinished = match.status === "FT";
  const sportCfg = SPORT_CONFIG[match.sport] ?? SPORT_CONFIG.football;

  return (
    <Link href={`/match/${match.matchId}`}>
      <motion.div
        className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 transition-all duration-300 hover:border-zinc-700/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] hover:shadow-emerald-500/5"
        whileHover={{ y: -3, transition: { duration: 0.25, ease: "easeOut" } }}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        {/* Top decorative line */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

        {/* Live indicator */}
        {isLive && (
          <div className="absolute right-4 top-4 flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              LIVE {match.minute}&apos;
            </span>
          </div>
        )}

        {/* Teams row — premium layout with prominent badges and scores */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-zinc-700/50 transition-all duration-300 group-hover:ring-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] overflow-hidden">
              {(() => {
                const cc = getTeamCountryCode(match.homeTeam);
                if (match.homeLogo && !homeLogoFailed) {
                  return (
                    <img
                      src={match.homeLogo}
                      alt={match.homeTeam}
                      className="h-full w-full object-contain p-1"
                      onError={() => setHomeLogoFailed(true)}
                    />
                  );
                }
                return cc ? (
                  <CountryFlag countryCode={cc} size={3} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold uppercase text-zinc-300">
                    {match.homeTeam.slice(0, 2)}
                  </span>
                );
              })()}
            </div>
            <span className="truncate text-sm font-semibold text-zinc-200 max-w-[120px] text-center">
              {match.homeTeam}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl font-bold tabular-nums tracking-tight ${
                  isLive
                    ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    : isFinished
                      ? "text-zinc-200"
                      : "text-zinc-300"
                }`}
              >
                {match.homeScore}
              </span>
              <span className="text-lg font-medium text-zinc-600">:</span>
              <span
                className={`text-4xl font-bold tabular-nums tracking-tight ${
                  isLive
                    ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    : isFinished
                      ? "text-zinc-200"
                      : "text-zinc-300"
                }`}
              >
                {match.awayScore}
              </span>
            </div>
            {!isLive && !isFinished && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">
                {new Date(match.startTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-zinc-700/50 transition-all duration-300 group-hover:ring-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] overflow-hidden">
              {(() => {
                const cc = getTeamCountryCode(match.awayTeam);
                if (match.awayLogo && !awayLogoFailed) {
                  return (
                    <img
                      src={match.awayLogo}
                      alt={match.awayTeam}
                      className="h-full w-full object-contain p-1"
                      onError={() => setAwayLogoFailed(true)}
                    />
                  );
                }
                return cc ? (
                  <CountryFlag countryCode={cc} size={3} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold uppercase text-zinc-300">
                    {match.awayTeam.slice(0, 2)}
                  </span>
                );
              })()}
            </div>
            <span className="truncate text-sm font-semibold text-zinc-200 max-w-[120px] text-center">
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* Bottom row: sport badge + status + fee */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            {/* Sport badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${sportCfg.color}`}
            >
              <span className="h-3 w-3 rounded-full bg-current" />
              <span>{sportCfg.label}</span>
            </span>
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

          {/* Fee tier */}
          <span className={`text-xs font-medium ${getFeeColor(match.feeTier)}`}>
            {match.feeTier
              ? `${(match.feeTier / 100).toFixed(1)}% Fee`
              : match.status === "LIV"
                ? "Dynamic Fee"
                : "—"}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
