"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";

const navLinks = [
  { href: "/matches", label: "Matches" },
  { href: "/games", label: "All Games" },
  { href: "/activity", label: "Activity" },
  { href: "/tokens", label: "Tokens" },
  { href: "/brackets", label: "Brackets" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/odds", label: "Odds" },
  { href: "/status", label: "Status" },
  { href: "/profile", label: "Profile" },
];

// Core nav links always visible on desktop; the rest go in a "More" dropdown
const primaryLinks = navLinks.slice(0, 6);
const moreLinks = navLinks.slice(6);

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const scrolled = useScroll(10);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close "More" dropdown on click outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
      <header
        className={cn(
          "sticky top-0 z-50 mx-auto w-full border-b transition-all md:ease-out",
          isLanding
            ? "border-transparent"
            : "bg-zinc-950 border-transparent",
          isLanding && scrolled && !open && "bg-zinc-950/95 supports-[backdrop-filter]:bg-zinc-950/50 border-zinc-800 backdrop-blur-lg md:rounded-md md:border md:top-4 md:max-w-6xl md:shadow",
          isLanding && open && "bg-zinc-950/90",
        )}
      >
        <nav
          className={cn(
            "flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
            { "md:px-2": scrolled && isLanding },
          )}
        >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image
              src="/logoin.png"
              alt="GoalSwap"
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
          </motion.div>
          <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 bg-clip-text text-transparent font-[family-name:var(--font-metamorphous)] text-sm">
            GoalSwap
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* More Dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                moreLinks.some((l) => isActive(l.href))
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              More
              <motion.svg
                animate={{ rotate: moreOpen ? 180 : 0 }}
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </motion.svg>
            </button>

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/50"
                >
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="ml-2">
            <ConnectButton
              label="Connect Wallet"
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
              showBalance={{ smallScreen: false, largeScreen: true }}
            />
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="md:hidden">
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 right-0 bottom-0 left-0 z-50 bg-zinc-950/95 border-t border-zinc-800 overflow-y-auto md:hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-full flex-col justify-between gap-y-2 p-4"
            >
              <div className="grid gap-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-2 pb-8">
                <ConnectButton
                  label="Connect Wallet"
                  accountStatus="avatar"
                  showBalance={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
