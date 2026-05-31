/**
 * GoalSwap Arena — Sidebar Navigation
 *
 * Collapsible sidebar with these specs:
 *   Expanded width: 260px
 *   Collapsed width: 72px
 *   Icon size: 20px
 *   Nav item height: 40px
 *   Section gap: 24px
 *   Padding: 16px
 *
 * Sections: Main, Markets, Account
 * Persists collapsed state in localStorage.
 * On mobile: hidden (the header's mobile overlay handles nav).
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Goal,
  Gamepad2,
  Activity,
  Trophy,
  Coins,
  BarChart3,
  Grid3x3,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Navigation Data ──────────────────────────────────────

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/matches", label: "Matches", icon: Goal },
      { href: "/games", label: "All Games", icon: Gamepad2 },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Markets",
    items: [
      { href: "/tokens", label: "Tokens", icon: Coins },
      { href: "/odds", label: "Odds", icon: BarChart3 },
      { href: "/brackets", label: "Brackets", icon: Grid3x3 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/status", label: "Status", icon: Shield },
    ],
  },
];

// ── Sidebar Component ────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe localStorage read
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  // Persist
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-white/[0.06] bg-background transition-all duration-300 ease-in-out shrink-0 h-screen sticky top-0 overflow-hidden z-40",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* ═══ Logo Area ═══ */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-white/[0.06] shrink-0",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="shrink-0"
          >
            <Image
              src="/logoin.png"
              alt="GoalSwap"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
          </motion.div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 bg-clip-text text-transparent font-[family-name:var(--font-metamorphous)] text-sm whitespace-nowrap overflow-hidden"
              >
                GoalSwap
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ═══ Navigation ═══ */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-none">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            {/* Section label — hidden when collapsed */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2 block overflow-hidden"
                >
                  {section.label}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-all duration-200 relative group",
                      "h-10", // 40px nav item height
                      collapsed ? "justify-center w-10 mx-auto" : "px-3",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]",
                    )}
                  >
                    {/* Icon — 20px */}
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0 transition-transform duration-200",
                        !collapsed && isActive && "scale-110",
                      )}
                    />

                    {/* Label — shown when expanded */}
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active indicator bar */}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className={cn(
                          "absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-emerald-400",
                          collapsed && "left-auto right-0",
                        )}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}

                    {/* Tooltip on hover when collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-xl pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        <span className="text-xs font-medium text-zinc-200">
                          {item.label}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ═══ Collapse Toggle ═══ */}
      <div className="border-t border-white/[0.06] p-4 shrink-0">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex items-center gap-3 rounded-lg transition-all duration-200 h-10 w-full",
            collapsed ? "justify-center" : "px-3",
            "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]",
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium"
                >
                  Collapse
                </motion.span>
              </AnimatePresence>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
