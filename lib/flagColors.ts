/**
 * GoalSwap Arena — Flag Color Palettes
 *
 * Maps country ISO codes (lowercase) to their national flag colors
 * for use in flag-themed gradient backgrounds on match pages.
 *
 * Each entry has:
 *   - colors: Array of hex color strings in gradient order (left→right or top→bottom)
 *   - angle: Recommended gradient angle in degrees
 *   - accent: A bright accent color from the flag for UI highlights
 */

export interface FlagPalette {
  colors: string[];
  angle: number;
  accent: string;
}

export const FLAG_PALETTES: Record<string, FlagPalette> = {
  // ── South America ──────────────────────────────────
  br: {
    colors: ["#009739", "#FEDD00", "#002776"],
    angle: 145,
    accent: "#FEDD00",
  },
  ar: {
    colors: ["#75AADB", "#FFFFFF", "#75AADB"],
    angle: 145,
    accent: "#75AADB",
  },
  uy: {
    colors: ["#0038A8", "#FFFFFF", "#0038A8", "#FCD116"],
    angle: 145,
    accent: "#FCD116",
  },
  cl: {
    colors: ["#0039A6", "#FFFFFF", "#D52B1E"],
    angle: 145,
    accent: "#D52B1E",
  },
  co: {
    colors: ["#FCD116", "#003893", "#CE1126"],
    angle: 145,
    accent: "#FCD116",
  },
  pe: {
    colors: ["#D91023", "#FFFFFF", "#D91023"],
    angle: 145,
    accent: "#D91023",
  },
  ec: {
    colors: ["#FEDF00", "#003893", "#ED1B24"],
    angle: 145,
    accent: "#FEDF00",
  },
  ve: {
    colors: ["#FCD116", "#00247D", "#CE1126"],
    angle: 145,
    accent: "#FCD116",
  },
  py: {
    colors: ["#D52B1E", "#FFFFFF", "#0038A8"],
    angle: 145,
    accent: "#D52B1E",
  },
  bo: {
    colors: ["#D52B1E", "#FEDF00", "#007934"],
    angle: 145,
    accent: "#FEDF00",
  },

  // ── Europe ─────────────────────────────────────────
  "gb-eng": {
    colors: ["#FFFFFF", "#CF142B", "#012169"],
    angle: 145,
    accent: "#CF142B",
  },
  "gb-sct": {
    colors: ["#005EB8", "#FFFFFF", "#005EB8"],
    angle: 145,
    accent: "#005EB8",
  },
  "gb-wls": {
    colors: ["#BE3A34", "#FFFFFF", "#006D2F"],
    angle: 145,
    accent: "#BE3A34",
  },
  "gb-nir": {
    colors: ["#C8102E", "#FFFFFF", "#C8102E"],
    angle: 145,
    accent: "#C8102E",
  },
  gb: {
    colors: ["#012169", "#FFFFFF", "#C8102E"],
    angle: 145,
    accent: "#C8102E",
  },
  fr: {
    colors: ["#002395", "#FFFFFF", "#ED2939"],
    angle: 145,
    accent: "#002395",
  },
  de: {
    colors: ["#000000", "#DD0000", "#FFCC00"],
    angle: 145,
    accent: "#DD0000",
  },
  it: {
    colors: ["#009246", "#FFFFFF", "#CE2B37"],
    angle: 145,
    accent: "#009246",
  },
  es: {
    colors: ["#C60B1E", "#FFC400", "#C60B1E"],
    angle: 145,
    accent: "#FFC400",
  },
  pt: {
    colors: ["#006600", "#FF0000", "#FFD700"],
    angle: 145,
    accent: "#FFD700",
  },
  nl: {
    colors: ["#FF6600", "#FFFFFF", "#002395"],
    angle: 145,
    accent: "#FF6600",
  },
  be: {
    colors: ["#000000", "#FDDA24", "#EF3340"],
    angle: 145,
    accent: "#FDDA24",
  },
  ch: {
    colors: ["#FF0000", "#FFFFFF", "#FF0000"],
    angle: 145,
    accent: "#FF0000",
  },
  at: {
    colors: ["#ED2939", "#FFFFFF", "#ED2939"],
    angle: 145,
    accent: "#ED2939",
  },
  se: {
    colors: ["#005B99", "#FECC00", "#005B99"],
    angle: 145,
    accent: "#FECC00",
  },
  no: {
    colors: ["#BA0C2F", "#FFFFFF", "#00205B"],
    angle: 145,
    accent: "#BA0C2F",
  },
  dk: {
    colors: ["#C8102E", "#FFFFFF", "#C8102E"],
    angle: 145,
    accent: "#C8102E",
  },
  fi: {
    colors: ["#003580", "#FFFFFF", "#003580"],
    angle: 145,
    accent: "#003580",
  },
  ie: {
    colors: ["#169B62", "#FFFFFF", "#FF883E"],
    angle: 145,
    accent: "#169B62",
  },
  pl: {
    colors: ["#FFFFFF", "#DC143C", "#FFFFFF"],
    angle: 145,
    accent: "#DC143C",
  },
  hr: {
    colors: ["#FF0000", "#FFFFFF", "#001B8F"],
    angle: 145,
    accent: "#FF0000",
  },
  rs: {
    colors: ["#C6363C", "#FFFFFF", "#003893"],
    angle: 145,
    accent: "#C6363C",
  },
  gr: {
    colors: ["#0D5EAF", "#FFFFFF", "#0D5EAF"],
    angle: 145,
    accent: "#0D5EAF",
  },
  cz: {
    colors: ["#FFFFFF", "#D7141A", "#11457E"],
    angle: 145,
    accent: "#D7141A",
  },
  hu: {
    colors: ["#CE2B37", "#FFFFFF", "#00843D"],
    angle: 145,
    accent: "#CE2B37",
  },
  ro: {
    colors: ["#002B7F", "#FCD116", "#CE1126"],
    angle: 145,
    accent: "#FCD116",
  },
  bg: {
    colors: ["#FFFFFF", "#00966E", "#D62612"],
    angle: 145,
    accent: "#00966E",
  },
  tr: {
    colors: ["#E30A17", "#FFFFFF", "#E30A17"],
    angle: 145,
    accent: "#E30A17",
  },
  ru: {
    colors: ["#FFFFFF", "#0039A6", "#D52B1E"],
    angle: 145,
    accent: "#D52B1E",
  },
  ua: {
    colors: ["#005BBB", "#FFD500", "#005BBB"],
    angle: 145,
    accent: "#FFD500",
  },
  sk: {
    colors: ["#FFFFFF", "#0B4EA2", "#EE1C25"],
    angle: 145,
    accent: "#EE1C25",
  },
  si: {
    colors: ["#FFFFFF", "#0052B4", "#ED1C24"],
    angle: 145,
    accent: "#ED1C24",
  },
  eu: {
    colors: ["#003399", "#FFCC00", "#003399"],
    angle: 145,
    accent: "#FFCC00",
  },

  // ── Africa ─────────────────────────────────────────
  ng: {
    colors: ["#008751", "#FFFFFF", "#008751"],
    angle: 145,
    accent: "#008751",
  },
  eg: {
    colors: ["#CE1126", "#FFFFFF", "#000000"],
    angle: 145,
    accent: "#CE1126",
  },
  ma: {
    colors: ["#C1272D", "#FFFFFF", "#C1272D"],
    angle: 145,
    accent: "#C1272D",
  },
  sn: {
    colors: ["#00853F", "#FDEF42", "#E31B23"],
    angle: 145,
    accent: "#FDEF42",
  },
  gh: {
    colors: ["#CE1126", "#FCD116", "#006B3F"],
    angle: 145,
    accent: "#FCD116",
  },
  cm: {
    colors: ["#007A5E", "#CE1126", "#FCD116"],
    angle: 145,
    accent: "#FCD116",
  },
  ci: {
    colors: ["#F77F00", "#FFFFFF", "#009E60"],
    angle: 145,
    accent: "#F77F00",
  },
  tn: {
    colors: ["#E70013", "#FFFFFF", "#E70013"],
    angle: 145,
    accent: "#E70013",
  },
  dz: {
    colors: ["#006633", "#FFFFFF", "#D21034"],
    angle: 145,
    accent: "#D21034",
  },
  za: {
    colors: ["#007A4D", "#FFB612", "#DE3831", "#002395"],
    angle: 145,
    accent: "#FFB612",
  },
  ke: {
    colors: ["#000000", "#CE1126", "#009A44"],
    angle: 145,
    accent: "#CE1126",
  },

  // ── North & Central America ────────────────────────
  us: {
    colors: ["#002868", "#FFFFFF", "#BF0A30"],
    angle: 145,
    accent: "#BF0A30",
  },
  ca: {
    colors: ["#FFFFFF", "#FF0000", "#FFFFFF"],
    angle: 145,
    accent: "#FF0000",
  },
  mx: {
    colors: ["#006341", "#FFFFFF", "#CE1126"],
    angle: 145,
    accent: "#006341",
  },
  cr: {
    colors: ["#002B7F", "#FFFFFF", "#CE1126"],
    angle: 145,
    accent: "#002B7F",
  },
  jm: {
    colors: ["#009B3A", "#FED100", "#000000"],
    angle: 145,
    accent: "#FED100",
  },
  cu: {
    colors: ["#002A8F", "#FFFFFF", "#CF142B"],
    angle: 145,
    accent: "#CF142B",
  },
  ht: {
    colors: ["#00209F", "#FFFFFF", "#D21034"],
    angle: 145,
    accent: "#D21034",
  },
  pa: {
    colors: ["#FFFFFF", "#D21034", "#002B7F"],
    angle: 145,
    accent: "#D21034",
  },

  // ── Asia ───────────────────────────────────────────
  jp: {
    colors: ["#FFFFFF", "#BC002D", "#FFFFFF"],
    angle: 145,
    accent: "#BC002D",
  },
  kr: {
    colors: ["#FFFFFF", "#003478", "#CD2E3A"],
    angle: 145,
    accent: "#003478",
  },
  cn: {
    colors: ["#DE2910", "#FFDE00", "#DE2910"],
    angle: 145,
    accent: "#FFDE00",
  },
  sa: {
    colors: ["#006C35", "#FFFFFF", "#006C35"],
    angle: 145,
    accent: "#006C35",
  },
  ir: {
    colors: ["#239F40", "#FFFFFF", "#DA0000"],
    angle: 145,
    accent: "#239F40",
  },
  iq: {
    colors: ["#CE1126", "#FFFFFF", "#000000"],
    angle: 145,
    accent: "#CE1126",
  },
  ae: {
    colors: ["#FF0000", "#009E60", "#FFFFFF", "#000000"],
    angle: 145,
    accent: "#FF0000",
  },
  qa: {
    colors: ["#8D1B3D", "#FFFFFF", "#8D1B3D"],
    angle: 145,
    accent: "#8D1B3D",
  },
  in: {
    colors: ["#FF9933", "#FFFFFF", "#138808"],
    angle: 145,
    accent: "#FF9933",
  },
  pk: {
    colors: ["#01411C", "#FFFFFF", "#01411C"],
    angle: 145,
    accent: "#01411C",
  },
  au: {
    colors: ["#00008B", "#FF0000", "#FFFFFF"],
    angle: 145,
    accent: "#FF0000",
  },
  nz: {
    colors: ["#00247D", "#FFFFFF", "#CC142B"],
    angle: 145,
    accent: "#CC142B",
  },
  il: {
    colors: ["#FFFFFF", "#0038B8", "#FFFFFF"],
    angle: 145,
    accent: "#0038B8",
  },

  // ── Default Fallback ─────────────────────────────
  __default: {
    colors: ["#1a1a2e", "#16213e", "#0f3460"],
    angle: 145,
    accent: "#22c55e",
  },
};

/**
 * Get the flag color palette for a given country code.
 * Falls back to a dark default theme if no match is found.
 */
export function getFlagPalette(countryCode: string | null): FlagPalette {
  if (!countryCode) return FLAG_PALETTES.__default;
  return FLAG_PALETTES[countryCode.toLowerCase()] ?? FLAG_PALETTES.__default;
}


