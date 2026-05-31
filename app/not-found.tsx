"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search, Sparkles, Send, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-500/3 blur-[120px]" />

      {/* Animated 404 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8"
      >
        <div className="text-[120px] font-bold leading-none sm:text-[160px]">
          <span className="bg-gradient-to-b from-zinc-700 to-zinc-900 bg-clip-text text-transparent">4</span>
          <span className="bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent">0</span>
          <span className="bg-gradient-to-b from-zinc-700 to-zinc-900 bg-clip-text text-transparent">4</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute -top-2 -right-4 sm:-top-4 sm:-right-8"
        >
          <span className="text-3xl sm:text-5xl">404</span>
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-2xl font-bold text-zinc-100 sm:text-3xl"
      >
        Page Not Found
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-3 max-w-md text-sm leading-6 text-zinc-500"
      >
        This page doesn&apos;t exist or has been moved. The match you&apos;re looking for
        might have ended, or the link might be incorrect.
      </motion.p>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-black transition-all hover:bg-emerald-400"
        >
          <Home className="h-4 w-4" />
          Back Home
        </Link>
        <Link
          href="/matches"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100"
        >
          <Search className="h-4 w-4" />
          Browse Matches
        </Link>
        <a
          href="https://t.me/GoalSwapArenaBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100"
        >
          <Send className="h-4 w-4" />
          Telegram Bot
        </a>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-2"
      >
        {[
          { href: "/matches", label: "Matches" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/tokens", label: "Fan Tokens" },
          { href: "/brackets", label: "Brackets" },
          { href: "/status", label: "System Status" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-all hover:border-zinc-700 hover:text-zinc-300"
          >
            {link.label}
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
