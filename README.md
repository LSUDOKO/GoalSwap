<img width="1500" height="500" alt="Goal Swap" src="https://github.com/user-attachments/assets/44d28fa2-b5c7-4802-9787-8982b8a8becb" />
<!-- <img width="2000" height="2000" alt="House" src="https://github.com/user-attachments/assets/148d1047-89ef-4fc2-a6ff-5357add11e00" /> -->

# GoalSwap Arena — Trade the World Cup

**Live prediction markets for World Cup 2026 and beyond.**  
Built on **X Layer** + **Uniswap V4 dynamic fee hooks** with real-time oracle data.

[![X Layer](https://img.shields.io/badge/X%20Layer-Testnet-22c55e)](https://www.oklink.com/xlayer-test)
[![Uniswap V4](https://img.shields.io/badge/Uniswap-V4-ff007a)](https://uniswap.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🚀 Live Deployments

| Service | URL |
|---------|-----|
| **Frontend** | [https://goalswap.vercel.app](https://goalswap.vercel.app) |
| **Oracle API** | [https://goalswap.onrender.com](https://goalswap.onrender.com) |
| **WebSocket** | `wss://goalswap.onrender.com` (shared port) |
| **Telegram Bot** | [@Goalswap_bot](https://t.me/Goalswap_bot) |
| **GitHub** | [github.com/LSUDOKO/GoalSwap](https://github.com/LSUDOKO/GoalSwap) |

---

## Overview

GoalSwap Arena lets users trade match outcome prediction tokens, team fan tokens, and bracket predictions — all settled in **USDC** on X Layer. Unlike traditional prediction markets, every trade flows through **Uniswap V4 liquidity pools** with fees that adjust dynamically based on live match events.

### How It Works

```
Real sports API → Oracle Service (Render) → WebSocket broadcast → Frontend (Vercel)
                    ↓                                  ↓
       Telegram Bot push alerts ← → Uniswap V4 Hook (dynamic fee adjustment)
                                        ↓
                                  On-chain settlement
```

1. **Connect** your wallet via RainbowKit
2. **Browse** live matches with real-time scores and fee tiers
3. **Trade** outcome tokens (win/lose/draw) or team fan tokens
4. **Collect** soulbound trophies, earn XP, and climb the leaderboard

---

## Architecture

```
goalswap-arena/
├── app/                      # Next.js 16 App Router pages
│   ├── /                     # Landing page (hero, features, CTA)
│   ├── /matches              # Match grid with live/upcoming/finished
│   ├── /match/[matchId]      # Match detail — SwapBox, FeeTicker, Timeline, AI Insights
│   ├── /tokens               # Fan tokens with bonding curve + buy/sell
│   ├── /brackets             # Bracket prediction NFTs
│   ├── /leaderboard          # Trader rankings (volume, PnL, trophies, streak)
│   ├── /profile              # Wallet portfolio, trophy cabinet
│   └── /games                # Multi-sport game browser
│
├── components/               # React components
│   ├── SwapBox.tsx           # Core trading interface
│   ├── MatchCard.tsx         # Match grid card
│   ├── LiveFeeTicker.tsx     # Dynamic fee display
│   ├── EventTimeline.tsx     # Match events timeline
│   ├── AiInsightCard.tsx     # AI-powered trading insights ⭐
│   ├── NewsFeed.tsx          # Activity feed
│   └── ui/                   # shadcn/ui primitives
│
├── contracts/                # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── hooks/            # WorldCupArenaHook.sol (dynamic fee engine)
│   │   ├── tokens/           # FanToken, OutcomeToken, OutcomeTokenFactory, BracketNFT, GoalSwapTrophies
│   │   ├── interfaces/       # IWorldCupArenaHook, IGoalSwapTrophies
│   │   └── mock/             # MockPoolManager, MockUSDC
│   ├── test/                 # Foundry tests (OutcomeTokenFactory, WorldCupArenaHook, lifecycle)
│   └── script/               # Deployment scripts (Deploy, DeployAll, TestLifecycle)
│
├── oracle-service/           # TypeScript oracle backend
│   └── src/
│       ├── index.ts          # Main entry — orchestrates full pipeline
│       ├── DataFetcher.ts    # API-Football polling (football, NBA, basketball, 10+ sports)
│       ├── MultiSportFetcher.ts  # Multi-sport fallback fetcher
│       ├── StateValidator.ts # Diff engine — detects goals, red cards, status changes
│       ├── BlockchainWriter.ts   # On-chain settlement via viem
│       ├── RedisCache.ts     # Match state caching (Upstash / local Redis)
│       ├── webhook-server.ts # REST API on :3002 + webhook endpoints
│       ├── websocket-server.ts   # Socket.io on :8081
│       ├── XBot.ts           # X (Twitter) bot integration
│       ├── fees.ts           # Fee tier calculation logic
│       └── types.ts          # Shared TypeScript types
│
├── telegram-bot/             # Node.js Telegram bot
│   └── src/
│       ├── index.ts          # Bot entry point
│       ├── commands/         # /live, /match, /alert, /portfolio, /leaderboard, /brackets, /start, /admin
│       └── services/         # API client, database, notifications
│
├── indexer/                  # The Graph subgraph
│   ├── schema.graphql        # GraphQL schema (Match, OutcomeToken, FanToken, Pool, Trophy, Bracket, Trader)
│   ├── subgraph.yaml         # Manifest — event handlers on Hook + tokens
│   ├── src/mappings.ts       # Event handler logic
│   └── abis/                 # Contract ABIs (all 7 contracts)
│
├── ai-agent/                 # X bot (Python — Tweepy + OpenAI)
│   ├── bot.py                # Auto-posting + reply handler
│   └── requirements.txt
│
├── lib/                      # Frontend utilities
│   ├── oracle.ts             # REST API client (matches, tokens, leaderboard, portfolio)
│   ├── contracts.ts          # Contract interaction helpers (read/write)
│   ├── socket.ts             # WebSocket client (live match updates)
│   ├── format.ts             # Formatting utilities
│   └── utils.ts              # cn() helper (clsx + tailwind-merge)
│
├── hooks/                    # React hooks
│   ├── useMatchState.ts      # Live match state via WebSocket
│   ├── usePoolMetadata.ts    # V4 pool metadata reader
│   └── useSwap.ts            # Token swap hook
│
└── stores/                   # Zustand state stores
    ├── matchStore.ts         # Match state management
    └── walletStore.ts        # Wallet state management
```

---

## Smart Contracts (Deployed on X Layer Testnet)

### X Layer Testnet — Chain ID 1952

| Contract | Address | Purpose |
|----------|---------|---------|
| **WorldCupArenaHook** | [`0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF`](https://www.oklink.com/xlayer-test/address/0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF) | Dynamic fee logic — adjusts swap fees based on match events |
| **OutcomeTokenFactory** | [`0x2CD9fd3078932A9fbC8cA9384FA6a75536587022`](https://www.oklink.com/xlayer-test/address/0x2CD9fd3078932A9fbC8cA9384FA6a75536587022) | Creates 3 outcome tokens (Home/Draw/Away) per match + V4 pools |
| **GoalSwapTrophies** | [`0x6788921d3d3956C10554f1aEc8d9d4B279c9A735`](https://www.oklink.com/xlayer-test/address/0x6788921d3d3956C10554f1aEc8d9d4B279c9A735) | Soulbound achievement NFTs (5 tiers, free mint) |
| **BracketNFT** | [`0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3`](https://www.oklink.com/xlayer-test/address/0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3) | Transferable bracket prediction NFTs |
| **MockUSDC** | `0x2ECDAcB97eE840da3391E63038D7E086129A13d5` | Test USDC for settlement |
| **MockPoolManager** | `0x0Bf02B5765dBbC15b5C1b56412Fc73e70F782564` | Demo swap execution (simulateSwap) |
| **Deployer (Oracle)** | `0x4FD969A5E6c9f3fff2cA37B473E30b39106F0F99` | Oracle signer wallet |

All contracts verified on [X Layer Testnet Explorer](https://www.oklink.com/xlayer-test).

### Fee Tiers (Dynamic)

| Condition | Fee |
|-----------|-----|
| Kickoff (minute ≤ 15) | 0.3% |
| Normal play | 1.0% |
| Within 5 min of goal | 3.0% |
| Red card OR minute ≥ 90 | 5.0% |
| Penalty shootout | 10.0% |
| Match finished | 0.0% (settlement) |
| Fan token panic-sell | 10.0% |

### Trophy Tiers (Soulbound)

| Tier | Name | Condition |
|------|------|-----------|
| 1 | Lightning Reflex | Trade within 60s of a goal |
| 2 | Bronze Nostradamus | 1 correct upset prediction |
| 3 | Silver Prophet | 5 correct in-play trades |
| 4 | Golden Ball Trader | Predicted tournament winner |
| 5 | Arena Legend | Top 100 all-time leaderboard |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| **Web3** | wagmi v2, viem v2, RainbowKit |
| **Charts** | TradingView Lightweight Charts |
| **Animation** | Framer Motion |
| **State** | Zustand |
| **Icons** | lucide-react |
| **Smart Contracts** | Solidity, Foundry, Uniswap V4 Periphery |
| **Oracle** | TypeScript/Node.js — API-Football, TheSportsDB, Sportmonks |
| **WebSocket** | Socket.io (port 8081) |
| **Cache** | Redis / Upstash |
| **Telegram** | `node-telegram-bot-api` |
| **X Bot** | Python — Tweepy + OpenAI |
| **Indexer** | The Graph (subgraph) |
| **Infrastructure** | Vercel (frontend), Render (oracle + Telegram bot), Upstash (Redis) |

---

## Key Features

### 🧠 AI-Powered Trading Insights
Contextual match analysis on every match detail page — generated from live match state, fee tier, score differential, and historical data:
- **Fee-based insights:** Low/normal/high fee recommendations with actionable trading suggestions
- **Comeback probability:** Historical comeback rates for trailing teams based on goal deficit and time remaining
- **Late-game analysis:** ~38% of matches see a goal in the final 15 minutes
- **Stoppage time alerts:** High volatility warnings during extra time
- **Red card impact:** Statistical analysis of advantage shifts
- **Multi-goal thrillers:** Momentum compounding in high-scoring matches
- **Pre-match opportunities:** Lock-in odds before kickoff
- **Trophy opportunities:** Lightning Reflex SBT alerts when goals are scored
- Designed to be replaced by GPT-4o-mini API route in production

### Match Outcome Trading
Buy prediction tokens for match outcomes — win, lose, or draw. Trade positions in real time as odds shift.

### Dynamic Fee Engine
Uniswap V4 hooks monitor live match events. Goals, red cards, and high volatility trigger automatic fee changes — protecting LPs while keeping markets liquid.

### Fan Token Bonds
Launch and trade team-branded fan tokens through automated bonding curves. Natural price discovery without manual market making. Price grows with every buy.

### Soulbound Trophies
Earn non-transferable on-chain achievements for trading volume, prediction streaks, and bracket accuracy. Free to mint — protocol pays gas.

### Bracket Predictions
Mint transferable NFT brackets with your World Cup predictions. Trade bracket futures in a secondary market.

### Real-Time Data
Oracle nodes pull match data from API-Football, TheSportsDB, and Sportmonks at sub-minute intervals. WebSockets push score changes instantly.

### 🤖 Telegram Bot — @Goalswap_bot
- `/live` — Live matches with scores and fee tiers
- `/match {team}` — Search match by team
- `/alert {matchId} {condition}` — Custom goal/price/fee alerts
- `/portfolio {wallet}` — Portfolio summary
- `/leaderboard` — Top 10 global traders
- Auto-push goal notifications with inline trading buttons (pushed from oracle via webhook)
- Multi-language support (EN, ES, PT, FR, AR, DE, JA, KO, ZH, RU, IT, NL)

### 🐦 X Bot — @GoalSwapAgent
- Auto-posts every 15 minutes during live matches
- Reply handler for @mentions with GPT-4 mini generated responses
- Hashtag strategy: `#WorldCup2026 #GoalSwap #XLayer #UniswapV4`

### 📊 The Graph Subgraph
- Indexes all events from WorldCupArenaHook, OutcomeTokenFactory, FanToken, GoalSwapTrophies, BracketNFT
- Entities: Match, Pool, Swap, User, Trophy, Bracket
- Enables leaderboard queries and historical analytics

---

## Deployment

The platform runs on **Vercel** (frontend) + **Render** (oracle + Telegram bot).

### Deploying Oracle to Render

1. Push to GitHub — `render.yaml` in project root auto-configures the oracle service
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New Web Service** → select your repo
3. Verify settings: Root Directory = `oracle-service`, Build = `npm install && npm run build`, Start = `npm run start`
4. Add all env vars from `oracle-service/.env` (API keys, contract addresses, wallet key)
5. Deploy — the oracle starts with 56 seeded matches across 13 sports

### Deploying Telegram Bot to Render

1. Create a new Web Service from the same repo
2. Verify settings: Root Directory = `telegram-bot`, Build = `npm install && npm run build`, Start = `npm run start`
3. Add env vars: `TELEGRAM_BOT_TOKEN`, `ORACLE_API_URL`, `FRONTEND_URL`
4. Add `TELEGRAM_BOT_WEBHOOK_URL` to the oracle's env (pointing to `https://your-bot.onrender.com/webhook/alert`)

### Deploying Frontend to Vercel

```bash
vercel login
vercel --prod
```

Set these env vars in Vercel Dashboard:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | `aa5133abbd30c8e1836400f800b3f6e0` |
| `NEXT_PUBLIC_API_URL` | `https://goalswap.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `https://goalswap.onrender.com` |
| `NEXT_PUBLIC_HOOK_ADDRESS` | `0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF` |
| `NEXT_PUBLIC_POOL_MANAGER_ADDRESS` | `0x0Bf02B5765dBbC15b5C1b56412Fc73e70F782564` |
| `NEXT_PUBLIC_USDC_ADDRESS` | `0x2ECDAcB97eE840da3391E63038D7E086129A13d5` |

---

## Getting Started (Local Dev)

### Prerequisites

- Node.js >= 20
- Redis (local or Upstash)
- API keys (see Environment Variables)

### 1. Clone & Install

```bash
git clone https://github.com/LSUDOKO/GoalSwap.git
cd goalswap

# Install frontend dependencies
npm install

# Install oracle dependencies
cd oracle-service && npm install && cd ..

# Install Telegram bot dependencies
cd telegram-bot && npm install && cd ..

# Install X bot dependencies
cd ai-agent && pip install -r requirements.txt && cd ..
```

### 2. Environment Variables

**Frontend** — `cp .env.local.example .env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_API_URL` | Oracle REST API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |
| `NEXT_PUBLIC_HOOK_ADDRESS` | WorldCupArenaHook contract |
| `NEXT_PUBLIC_POOL_MANAGER_ADDRESS` | MockPoolManager (simulateSwap) |
| `NEXT_PUBLIC_USDC_ADDRESS` | USDC token address |
| `NEXT_PUBLIC_TROPHIES_ADDRESS` | GoalSwapTrophies address |

**Oracle** — `cp oracle-service/.env.example oracle-service/.env`:

| Variable | Description |
|----------|-------------|
| `API_SPORTS_KEY` | API-Football & api-sports.io key |
| `SPORTMONKS_TOKEN` | Sportmonks API token |
| `ORACLE_PRIVATE_KEY` | Wallet private key for on-chain writes |
| `X_LAYER_RPC` | X Layer RPC URL |
| `REDIS_URL` | Redis connection string (omit = in-memory fallback) |
| `TELEGRAM_BOT_WEBHOOK_URL` | Telegram bot webhook for push alerts |

### 3. Run Locally

```bash
# Terminal 1 — Start oracle service
cd oracle-service && npm run dev

# Terminal 2 — Start Telegram bot
cd telegram-bot && npm run dev

# Terminal 3 — Start the frontend
cd goalswap && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Local Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | `:3000` | Next.js app |
| REST API | `:3002` | Match data, tokens, leaderboard |
| WebSocket | `:8080` | Live match updates |
| Telegram Bot | `:3003` | Push alert webhook bridge |

---

## API Endpoints (Oracle REST API — port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Oracle health + Redis status |
| `GET` | `/stats` | Detailed oracle statistics |
| `GET` | `/api/matches?status=live\|finished\|all&sport=football\|basketball\|nba\|all` | Match list |
| `GET` | `/api/match/:matchId` | Match detail + fee tier |
| `GET` | `/api/tokens` | All fan tokens with bonding curve data |
| `GET` | `/api/token/:symbol` | Single fan token detail |
| `POST` | `/api/token/:symbol/trade` | Buy/sell fan tokens |
| `GET` | `/api/leaderboard/:type` | Leaderboard (volume, pnl, trophies, streak) |
| `GET` | `/api/user/:address` | User portfolio summary |
| `GET` | `/api/stats/global` | Global platform stats |
| `GET` | `/api/integrations` | System integration status |
| `GET` | `/api/activity` | Recent activity feed |
| `POST` | `/webhook/goal` | Goal event webhook |
| `POST` | `/webhook/settled` | Match settlement webhook |

---

## Critical Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Real sports API — no mock data** | Production credibility; API-Football free tier sufficient |
| **USDC as base currency** | Simple settlement, no native token price risk |
| **Soulbound trophies free to mint** | Protocol pays gas, maximizes adoption |
| **Fan tokens use bonding curves** | Natural price discovery without manual market making |
| **Bracket NFTs transferable** | Creates secondary market for bracket futures |
| **Oracle signatures on-chain** | Prevents replay attacks |
| **Testnet deployment first** | Focus on demonstrability; mainnet is bonus |
| **Multi-oracle (1-of-1 now)** | Upgrade path to 2-of-3 multisig post-launch |

---

## Phase 5 — AI + Polish (Complete)

### ✅ AI Insight Card
New `components/AiInsightCard.tsx` component on every match detail page:
- 9 insight types covering all match states (pre-match, live, finished)
- Contextual: fee-based, score-based, time-based, event-based insights
- Historical data references (comeback rates, late-game goal percentages)
- Expandable UI with "Show more" toggle
- Animated refresh, live indicator, severity badges (Signal/Caution/Risk)
- Not financial advice disclaimer

### ✅ X Bot — @GoalSwapAgent
- Auto-posting every 15 minutes during live matches
- Reply handler with GPT-4 mini for @mention questions
- Hashtag strategy: `#WorldCup2026 #GoalSwap #XLayer #UniswapV4`

### ✅ The Graph Subgraph
- Full schema with Swap, Match, User entities
- Event handlers for all contract events
- Ready for deployment to The Graph Studio

### ✅ Demo Video Script
- 90-second storyboard with 7 scenes
- Covers: live match → dynamic fee → one-click trade → fan tokens → bracket NFTs → AI insights → trophies
- Production notes for screen recording, audio, and post-production
- Required tags: `@XLayerOfficial @Uniswap @flapdotsh`

### ✅ Telegram Bot — @Goalswap_bot
- 10+ commands: `/live`, `/match`, `/alert`, `/portfolio`, `/leaderboard`, `/brackets`, `/trophies`, `/referral`, `/settings`, `/alerts`
- Goal/fee/settlement auto-push notifications via oracle webhook
- Deployed on Render (free tier, polling prevents spin-down)
- Multi-language support (11 languages)

---

## Development

### Smart Contracts (Foundry)

```bash
cd contracts

# Build
forge build

# Test
forge test -vvv

# Deploy to X Layer Testnet
forge script script/DeployAll.s.sol --rpc-url https://testrpc.xlayer.tech --broadcast --verify
```

### Frontend

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

### The Graph Subgraph

```bash
cd indexer
npm run codegen
npm run build
npm run deploy
```

---

## Submission Checklist

- [x] **WorldCupArenaHook.sol** deployed on X Layer with real oracle integration
- [x] **Oracle node** running on Render — 13 sports, 56 seeded matches, API keys configured
- [x] **WebSocket + HTTP** shared on single port (Render compatible)
- [x] **Next.js frontend** live on Vercel — connected to Render backend
- [x] **@Goalswap_bot** deployed on Render — 10+ commands + push alerts from oracle
- [x] **Oracle → Telegram bot webhook** — real-time goal/settlement push integration
- [x] **Demo video script** prepared (90 seconds, 7 scenes)
- [x] **Smart contracts verified** on X Layer Testnet Explorer
- [x] **GitHub repo** public with comprehensive README

---

## License

Built for the **X Layer + Uniswap V4 Hackathon 2026**.

---

## Links

- [X Layer Explorer](https://www.oklink.com/xlayer-test)
- [Uniswap V4 Docs](https://docs.uniswap.org/contracts/v4)
- [API-Football](https://www.api-sports.io)
- [The Graph](https://thegraph.com)
- [RainbowKit](https://www.rainbowkit.com)
- [Wagmi](https://wagmi.sh)
