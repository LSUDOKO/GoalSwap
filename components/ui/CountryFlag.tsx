/**
 * CountryFlag — Renders an inline SVG country flag
 *
 * Loads flag SVGs from /sections/svg/{code}.svg.
 * Falls back to a styled placeholder if the flag is unavailable.
 */

"use client";

import { useState } from "react";
import { getFlagUrl } from "@/lib/countries";

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code (e.g. "ar", "gb-eng", "br") */
  countryCode: string;
  /** Display size in rem units (default: 1 = 16px) */
  size?: number;
  /** Additional className */
  className?: string;
  /** Whether to show rounded corners (default: true) */
  rounded?: boolean;
}

export function CountryFlag({
  countryCode,
  size = 1,
  className = "",
  rounded = true,
}: CountryFlagProps) {
  const [error, setError] = useState(false);
  const flagUrl = getFlagUrl(countryCode);

  if (!flagUrl || error) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-zinc-800 border border-zinc-700 font-bold text-zinc-500 ${
          rounded ? "rounded-sm" : ""
        } ${className}`}
        style={{ width: `${size * 1.5}rem`, height: `${size}rem`, fontSize: `${size * 0.5}rem` }}
      >
        {countryCode.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={countryCode}
      className={`inline-block object-cover ${rounded ? "rounded-sm" : ""} ${className}`}
      style={{ width: `${size * 1.5}rem`, height: `${size}rem` }}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
