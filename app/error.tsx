"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-red-500/3 blur-[120px]" />

      {/* Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10"
      >
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-2xl font-bold text-zinc-100 sm:text-3xl"
      >
        Something went wrong
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-3 max-w-md text-sm leading-6 text-zinc-500"
      >
        An unexpected error occurred. Our team has been notified. Try refreshing
        the page or heading back to the homepage.
      </motion.p>

      {/* Error digest */}
      {error.digest && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-[10px] text-zinc-700 font-mono"
        >
          Error ID: {error.digest}
        </motion.p>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <button
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-black transition-all hover:bg-emerald-400"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back Home
        </Link>
      </motion.div>
    </div>
  );
}
