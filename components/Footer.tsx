import Link from "next/link";
import Image from "next/image";
import { Send, AtSign, BookOpen, ExternalLink, Sparkles, Gauge, ArrowLeftRight, Trophy } from "lucide-react";

const footerLinks = {
  product: [
    { href: "/matches", label: "Matches", icon: Sparkles },
    { href: "/tokens", label: "Fan Tokens", icon: Gauge },
    { href: "/brackets", label: "Brackets", icon: ArrowLeftRight },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  resources: [
    { href: "https://t.me/GoalSwapArenaBot", label: "Telegram Bot", icon: Send, external: true },
    { href: "https://x.com", label: "X (Twitter)", icon: AtSign, external: true },
    { href: "https://docs.goalswap.xyz", label: "Documentation", icon: BookOpen, external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logo.png"
                alt="GoalSwap"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 bg-clip-text text-transparent font-[family-name:var(--font-metamorphous)] text-sm">
                GoalSwap Arena
              </span>
            </div>
            <p className="text-xs leading-6 text-zinc-500 max-w-xs">
              Real-data prediction markets for the World Cup 2026 and beyond.
              Built on <span className="text-emerald-400 font-medium">Uniswap V4</span> and{" "}
              <span className="text-emerald-400 font-medium">X Layer</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://t.me/GoalSwapArenaBot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              >
                <Send className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              >
                <AtSign className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://docs.goalswap.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((l) => {
                const Icon = l.icon;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Icon className="h-3 w-3 text-zinc-600" />
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((l) => {
                const Icon = l.icon;
                return (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Icon className="h-3 w-3 text-zinc-600" />
                      {l.label}
                      <ExternalLink className="h-2.5 w-2.5 text-zinc-700" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="inline-flex items-center gap-2 text-xs text-zinc-500 cursor-default">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-2 text-xs text-zinc-500 cursor-default">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-2 text-xs text-zinc-500 cursor-default">
                  Cookie Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-800/60 pt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-[11px] text-zinc-600">
            &copy; {new Date().getFullYear()} GoalSwap Arena. All rights reserved.
          </p>
          <p className="text-[11px] text-zinc-700">
            Built for the{" "}
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              X Layer + Uniswap V4 Hackathon 2026
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
