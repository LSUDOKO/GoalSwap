<!-- BEGIN:goalswap-arena-rules -->
# GoalSwap Arena — Agent Build Guide

## Project Overview
Production-ready World Cup 2026 trading platform. Users trade match outcomes, fan tokens, and bracket predictions. Real sports data drives dynamic fees via Uniswap V4 hooks. Telegram bot + X bot for alerts and engagement.

## Tech Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui |
| Web3 | wagmi + viem + RainbowKit |
| Charts | TradingView Lightweight Charts |
| State | Zustand |
| Smart Contracts | Solidity + Foundry (Uniswap V4 periphery) |
| Oracle | TypeScript/Node.js (API-Football + TheSportsDB + Sportmonks) |
| WebSocket | Socket.io (port 8080) |
| Telegram | `node-telegram-bot-api` |
| X Bot | Python — Tweepy + OpenAI |
| Indexer | The Graph (subgraph) |
| Infra | Vercel (frontend), AWS EC2 (oracle), Railway/Supabase (DB), Upstash (Redis) |

## Git Discipline
- **Commit after every meaningful change.** No long gaps without commits.
- Write clear, descriptive commit messages (what + why, not just what).
- Stage only relevant files — never commit secrets, `.env`, or `node_modules`.
- Before committing, run `git status` + `git diff` to verify intent.

## Coding Conventions
- **Solidity**: NatSpec on all public functions. Use OpenZeppelin `ReentrancyGuard`, `SafeERC20`.
- **TypeScript/TSX**: Strict types. No `any`. Use `wagmi` + `viem` for all chain interactions.
- **React**: Server Components by default. "use client" only when needed (hooks, interactivity).
- **CSS**: Tailwind utility classes. shadcn/ui components for primitives. No CSS modules.
- **Imports**: Prefer `@/` alias (e.g., `@/components/SwapBox`).
- **File naming**: PascalCase for components, camelCase for hooks/utils, lowercase for pages.

## Critical Architecture Decisions (from `about.md:1123`)
1. **Real sports API** — no mock data, API-Football free tier sufficient
2. **USDC as base currency** — simple settlement, no native token price risk
3. **Soulbound trophies** — free to mint, protocol pays gas
4. **Fan tokens** — bonding curves for natural price discovery
5. **Bracket NFTs** — transferable (creates secondary market)
6. **Oracle signatures on-chain** — prevents replay attacks
7. **Testnet deployment** — mainnet is bonus
8. **Multi-oracle** — start 1-of-1, upgrade to 2-of-3 post-launch

## File Structure Mandate
Build exactly what's in `about.md:974-1033`. Every file, every contract, every component. Do not skip any.

## Implementation Order
Follow phases from `about.md:1037-1075`:

### Phase 1 — Hook Contract (Days 1-2)
- Foundry project with `v4-periphery`
- `WorldCupArenaHook.sol` — full state, structs, dynamic fee logic, `updateMatchState`
- `OutcomeTokenFactory.sol`
- Foundry tests for fee calculations
- Deploy to X Layer testnet

### Phase 2 — Oracle + Backend (Days 3-4)
- `oracle-service/` with API-Football polling + TheSportsDB fallback
- `StateValidator`, `BlockchainWriter`, `RedisCache`
- WebSocket server (Socket.io, port 8080, rooms per match)
- `webhook-server` (port 3002)
- End-to-end: real goal → oracle → hook → WS → frontend

### Phase 3 — Frontend Core (Days 5-6)
- Next.js 16 + RainbowKit + wagmi
- `/matches` (grid with live/upcoming/finished)
- `/match/[matchId]` (SwapBox, LiveFeeTicker, EventTimeline)
- Zustand stores for match state + wallet
- Mobile responsive + PWA

### Phase 4 — Telegram Bot + NFTs (Days 7-8)
- `GoalSwapTrophies.sol` (SBT, 5 tiers)
- `BracketNFT.sol` (transferable)
- `FanTokenLauncher.sol` (bonding curve)
- `telegram-bot/` — all commands (`/live`, `/match`, `/alert`, `/portfolio`, etc.)
- Push alerts via webhook bridge
- `/profile` with trophy cabinet
- `/brackets` with bracket tree

### Phase 5 — AI + Polish (Days 9-10)
- `@GoalSwapAgent` X bot (Tweepy + OpenAI)
- AI suggestion cards on match detail page
- The Graph subgraph
- Demo video per `about.md:1079`
- Final testing: full match lifecycle simulation

## Submit Checklist (from `about.md:1109`)
- [ ] Hook deployed on X Layer with real oracle integration
- [ ] Oracle node running with API-Football + fallback
- [ ] WebSocket broadcasting real match updates
- [ ] Frontend live on Vercel with real match data
- [ ] `@GoalSwapArenaBot` live on Telegram
- [ ] The Graph subgraph indexing
- [ ] Demo video: real data → oracle → fee change → alert → trade → trophy
- [ ] X account posting with `@XLayerOfficial @Uniswap @flapdotsh`
- [ ] Google Form submitted before May 28, 23:59 UTC
- [ ] GitHub repo public with comprehensive README

## Environment Variables
See `about.md:945-968` for the full `.env` template.

## X (Twitter) Posting Schedule
See `about.md:1095-1104`. Tag `@XLayerOfficial @Uniswap @flapdotsh` on every post.
<!-- END:goalswap-arena-rules -->
