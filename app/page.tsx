"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Wallet,
  Search,
  ArrowLeftRight,
  Trophy,
  Goal,
  Gauge,
  Medal,
  Radio,
  Coins,
  Network,
  Sparkles,
  ExternalLink,
  Send,
} from "lucide-react";
import { GradientBars } from "@/components/ui/gradient-bars-background";
import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { IntegrationsStatus } from "@/components/IntegrationsStatus";
import { NewsFeed } from "@/components/NewsFeed";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const hl = "hl";

const howItWorks = [
  {
    step: "01",
    icon: Wallet,
    title: "Connect Your Wallet",
    desc: "Link your wallet via RainbowKit to start trading. GoalSwap settles entirely in USDC on X Layer — no native token price risk, no slippage gymnastics.",
    highlights: ["Wallet", "USDC on X Layer"],
  },
  {
    step: "02",
    icon: Search,
    title: "Pick a Match",
    desc: "Browse the live and upcoming matches grid. Every fixture displays real-time scores, dynamic fee brackets, and available outcome markets. Filter by league or tournament.",
    highlights: ["dynamic fee brackets"],
  },
  {
    step: "03",
    icon: ArrowLeftRight,
    title: "Trade Outcomes",
    desc: "Buy prediction tokens for win / lose / draw. As the match unfolds and odds shift, trade your positions in and out to lock profit or cut loss — just like any other market.",
    highlights: ["prediction tokens", "lock profit"],
  },
  {
    step: "04",
    icon: Trophy,
    title: "Collect & Compete",
    desc: "Winning trades earn trophies, XP, and leaderboard rank. Climb the global standings, unlock soulbound achievement badges, and prove you are the sharpest trader in the arena.",
    highlights: ["trophies", "leaderboard rank"],
  },
];

const features = [
  {
    icon: Goal,
    title: "Outcome Trading",
    desc: "Buy and sell prediction tokens for match winners, goal totals, and in-play events. Each position is a tokenized bet that you can trade in real time as odds shift across the liquidity pool.",
    highlights: ["prediction tokens", "trade in real time"],
  },
  {
    icon: Gauge,
    title: "Dynamic Fee Engine",
    desc: "Uniswap V4 hooks monitor live match events — goals, red cards, VAR reviews. When volatility spikes, swap fees adjust automatically to protect LPs while keeping markets liquid.",
    highlights: ["Uniswap V4 hooks", "swap fees adjust automatically"],
  },
  {
    icon: Medal,
    title: "Soulbound Trophies",
    desc: "Earn non-transferable on-chain achievements for trading volume, prediction streaks, and bracket accuracy. Minted free — the protocol pays gas so your trophy cabinet costs nothing.",
    highlights: ["non-transferable", "protocol pays gas"],
  },
  {
    icon: Radio,
    title: "Real-Time Data",
    desc: "Oracle nodes pull match data from API-Football and TheSportsDB at sub-minute intervals. WebSockets push score changes, cards, and substitutions to your client instantly.",
    highlights: ["Oracle nodes", "WebSockets"],
  },
  {
    icon: Coins,
    title: "Fan Token Bonds",
    desc: "Launch and trade team-branded fan tokens through automated bonding curves. Natural price discovery without manual market making — buy early, earn as your team gains popularity.",
    highlights: ["bonding curves", "price discovery"],
  },
  {
    icon: Network,
    title: "Bracket Predictions",
    desc: "Mint transferable NFT brackets with your World Cup predictions. Trade your bracket futures in a secondary market — the earlier you predict, the more your bracket appreciates.",
    highlights: ["NFT brackets", "secondary market"],
  },
];

const logos = [
  { src: "https://svgl.app/library/uniswap_wordmark.svg", alt: "Uniswap" },
  { src: "https://svgl.app/library/vercel_wordmark.svg", alt: "Vercel" },
  { src: "https://svgl.app/library/wagmi-wordmark-light.svg", alt: "Wagmi" },
  { src: "https://svgl.app/library/the_graph_wordmark.svg", alt: "The Graph" },
  { src: "https://svgl.app/library/socket-io-wordmark-light.svg", alt: "Socket.io" },
  { src: "https://svgl.app/library/rainbowkit-wordmark-light.svg", alt: "RainbowKit" },
  { src: "https://svgl.app/library/viem-wordmark-light.svg", alt: "Viem" },
];

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative min-h-screen overflow-hidden border-b border-zinc-800 flex items-center">
        <GradientBars numBars={15} gradientFrom="rgb(52, 211, 153)" gradientTo="transparent" animationDuration={2.5} />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/20 to-zinc-950/50" />

        <div className="relative w-full mx-auto max-w-7xl px-4 py-32 sm:px-6 sm:py-40 lg:py-48">
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-4xl text-center">
            <motion.div
              variants={fadeUp} custom={0}
              className="mb-6 inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-400"
            >
              <Radio className="mr-2 h-3 w-3 text-emerald-400" />
              Multi-sport trading on X Layer + Uniswap V4
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1}
              className="text-5xl font-bold tracking-tight text-zinc-100 sm:text-7xl lg:text-8xl"
            >
              Trade Any{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 bg-clip-text text-transparent font-[family-name:var(--font-metamorphous)]">
                Sport
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2}
              className="mt-6 text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8 max-w-2xl mx-auto"
            >
              Real-data prediction markets powered by Uniswap V4 dynamic fee hooks.
              Trade football, basketball, NBA, and more — all on <span className={hl}>X Layer</span>.
            </motion.p>

            <motion.div variants={fadeUp} custom={3}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link
                href="/matches"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-500 px-8 text-sm font-semibold text-black transition-all hover:bg-emerald-400 hover:scale-[1.02]"
              >
                <Sparkles className="h-4 w-4" />
                Browse Matches
              </Link>
              {!isConnected && (
                <ConnectButton label="Connect Wallet" accountStatus="avatar" showBalance={false} />
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Powered By ── */}
      <section className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="mb-6 text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold">
            Infrastructure Partners
          </p>
          <LogoCloud logos={logos} />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-b border-zinc-800 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-5">
              <ArrowLeftRight className="h-3 w-3 text-emerald-400" />
              How It Works
            </span>
            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
              Start in four moves
            </h2>
            <p className="mt-3 text-sm text-zinc-500 max-w-lg mx-auto">
              From connect to collect — the shortest path between you and the World Cup
              trading arena takes just <span className={hl}>four steps</span>.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-transparent lg:block" />

            <div className="grid gap-6 lg:grid-cols-4 lg:gap-8">
              {howItWorks.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} custom={i}
                    className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 lg:pt-12"
                  >
                    {/* connector dot */}
                    <div className="absolute left-6 top-8 hidden h-3 w-3 rounded-full border-2 border-emerald-500 bg-zinc-950 lg:block" />

                    {/* step icon */}
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>

                    <div className="text-[11px] font-bold text-emerald-500/40 tracking-widest mb-2">
                      {step.step}
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100 mb-2">
                      {step.title}
                    </h3>

                    <p className="text-xs leading-6 text-zinc-500">
                      {step.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-zinc-800 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-5">
              <Gauge className="h-3 w-3 text-emerald-400" />
              Platform
            </span>
            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-3 text-sm text-zinc-500 max-w-lg mx-auto">
              A complete trading stack — from <span className={hl}>real-time oracles</span> to{" "}
              <span className={hl}>dynamic fee hooks</span> — purpose-built for live sports.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 transition-all hover:border-emerald-500/30 hover:bg-zinc-900/60 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.08)]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/40 text-emerald-400 transition-colors group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs leading-6 text-zinc-500">
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Live Activity & Integrations ── */}
      <section className="border-b border-zinc-800 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-5">
              <Radio className="h-3 w-3 text-emerald-400" />
              Live System Status
            </span>
            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
              Everything Connected
            </h2>
            <p className="mt-3 text-sm text-zinc-500 max-w-lg mx-auto">
              Every integration — from <span className={hl}>real-time oracles</span> to{" "}
              <span className={hl}>Telegram bots</span> — is live and monitored.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <NewsFeed />
            <IntegrationsStatus />
          </div>

          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <Link
              href="/status"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-5 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all"
            >
              <Network className="h-4 w-4" />
              Full System Dashboard
              <span className="text-zinc-600">→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/0 via-emerald-500/3 to-zinc-900/0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-emerald-500/5 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 sm:p-14"
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50">
              <Sparkles className="h-7 w-7 text-emerald-400" />
            </div>

            <h2 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
              Ready to Trade?
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500 max-w-lg mx-auto">
              Connect your wallet, browse live matches across{" "}
              <span className={hl}>football, basketball, and NBA</span>, and start
              trading outcomes powered by real-time oracle data and Uniswap V4 liquidity.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/matches"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-black transition-all hover:bg-emerald-400"
              >
                <Sparkles className="h-4 w-4" />
                Browse Matches
              </Link>
              <Link
                href="/games"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100"
              >
                <Radio className="h-4 w-4" />
                Live Games
              </Link>
              <a
                href="https://t.me/GoalSwapArenaBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100"
              >
                <Send className="h-4 w-4" />
                Telegram Bot
                <ExternalLink className="h-3 w-3 text-zinc-600" />
              </a>
            </div>

            <p className="mt-6 text-[11px] text-zinc-600">
              No account needed. Just connect your wallet and start trading in seconds.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
