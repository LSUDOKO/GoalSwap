# GoalSwap Arena — Comprehensive TODO List

> Generated from `about.md` — the full project specification. Track progress here as we build.

---

## 📋 Phase 0 — Project Setup & Documentation (Pre-Day 1)

### Infrastructure Setup
- [ ] Create `.env` from template (`goalswap-docs/project-config/env-template.md`)
- [ ] Set up X Layer testnet RPC in project config
- [ ] Install Foundry (`foundryup`) + `v4-periphery` dependency
- [ ] Initialize `contracts/` Foundry project
- [ ] Install frontend dependencies: `wagmi`, `viem`, `RainbowKit`, `zustand`
- [ ] Install `@uniswap/universal-router-sdk` for swap integration
- [ ] Install `socket.io` + `socket.io-client` for WebSocket
- [ ] Set up Tailwind v4 + shadcn/ui components

### Documentation (✅ COMPLETE)
- [x] `goalswap-docs/` — Full project documentation folder (25 files)
  - [x] X Layer deployment guides (network info, faucet, Foundry deploy, verify, gas station)
  - [x] X Layer contracts reference (USDC, WETH, L2 predeploys, Safe wallet)
  - [x] Oracle integration (Chainlink price feeds)
  - [x] Real-time data (WebSocket endpoints, Flashblocks)
  - [x] Skills integration (Agentic Wallet, DEX Swap, DEX Bridge, Onchain Gateway, Security, Wallet Portfolio)
  - [x] Uniswap integration (Trading API, Universal Router, frontend setup, Permit2 approvals)
  - [x] Project config (env template, contract addresses)

---

## 🏗️ Phase 1 — Smart Contracts (Days 1–2)

### 1.1 Foundry Project Setup
- [ ] Create `contracts/` directory with `foundry.toml`
- [ ] Install `v4-periphery` dependency (`forge install`)
- [ ] Install OpenZeppelin contracts (`forge install OpenZeppelin/openzeppelin-contracts`)
- [ ] Install `forge-std` for testing
- [ ] Configure Solidity version + optimizer in `foundry.toml`
- [ ] Create `contracts/interfaces/` directory

### 1.2 WorldCupArenaHook.sol — THE CORE CONTRACT
- [ ] Inherit `BaseHook` from Uniswap V4 periphery
- [ ] Define `getHookPermissions()`:
  - [ ] `beforeSwap: true` — Dynamic fee logic
  - [ ] `afterSwap: true` — Value distribution + gamification
  - [ ] `afterInitialize: true` — Store pool metadata
  - [ ] `afterAddLiquidity: true` — Track LP positions
- [ ] Define all state variables:
  - [ ] `mapping(PoolId => PoolMetadata) poolMetadata`
  - [ ] `mapping(bytes32 => MatchState) matchStates`
  - [ ] `mapping(address => FanTokenState) fanTokenStates`
  - [ ] `mapping(bytes32 => BracketState) bracketStates`
  - [ ] `mapping(address => uint256) userXP`
  - [ ] `mapping(address => uint256) userStreak`
  - [ ] `mapping(address => mapping(bytes32 => uint256)) userMatchVolume`
  - [ ] `mapping(bytes32 => bytes) matchProofs`
  - [ ] `address public oracle`, `address public protocolTreasury`, `bool public paused`
- [ ] Define structs: `PoolMetadata`, `MatchState`, `FanTokenState`, `BracketState`
- [ ] Implement `beforeSwap` — Dynamic fee logic:
  - [ ] `minute <= 15` → 0.3%
  - [ ] Normal play → 1.0%
  - [ ] Within 5 min of goal → 3.0%
  - [ ] Red card OR `minute >= 90` → 5.0%
  - [ ] Penalty shootout → 10.0%
  - [ ] Match finished → 0.0%
  - [ ] Fan token panic-sell → 10.0%
  - [ ] MEV protection: `require(block.number >= lastSwapBlock[sender] + 2)`
- [ ] Implement `afterSwap` — Value distribution:
  - [ ] Match Prediction: LP 70%, Protocol 20%, Jackpot 10%
  - [ ] Fan Token: LP 60%, Protocol 15%, Jackpot 20%, Referral 5%
  - [ ] Meta-Market: LP 80%, Protocol 15%, Tournament 5%
  - [ ] Trophy minting logic (`_checkAndMintTrophy`)
- [ ] Implement `updateMatchState` — Oracle function:
  - [ ] Oracle authorization check
  - [ ] Signature verification (replay protection)
  - [ ] Stale/future data validation (±300s window)
  - [ ] Score regression prevention
  - [ ] Goal detection + `GoalScored` event
  - [ ] Match settlement on finish
  - [ ] `MatchStateUpdated` event
- [ ] Implement multi-oracle support (`authorizedOracles`, `requiredOracleConfirmations`)
- [ ] Implement emergency pause (`pause()` / `unpause()`)
- [ ] Implement `settleMatch()` internal function

### 1.3 OutcomeTokenFactory.sol
- [ ] Create match outcome tokens (TeamA Win, Draw, TeamB Win)
- [ ] Create V4 pools for each outcome pair
- [ ] Mint/burn tokens based on match resolution
- [ ] Link to `WorldCupArenaHook`

### 1.4 OutcomeToken.sol (ERC-20 with Settlement)
- [ ] Inherit OpenZeppelin ERC-20
- [ ] `onlyHook` modifier for mint/burn
- [ ] `settle(bool _isWinner)` — called by hook
- [ ] `redeem()` — 1:1 USDC redemption for winning tokens

### 1.5 FanToken.sol (Bonding Curve)
- [ ] Bonding curve pricing: `BASE_PRICE + (totalMinted * SLOPE)`
- [ ] `buy(uint256 usdcAmount)` — mint tokens
- [ ] `sell(uint256 tokenAmount)` — burn tokens
- [ ] Auto-create V4 pool when 50% supply reached
- [ ] MAX_SUPPLY cap (1B tokens)

### 1.6 GoalSwapTrophies.sol (Soulbound SBT)
- [ ] ERC-721 with `_beforeTokenTransfer` blocking all transfers
- [ ] 5 tiers:
  - [ ] Tier 1: Lightning Reflex (traded within 60s of goal)
  - [ ] Tier 2: Bronze Nostradamus (1 correct upset)
  - [ ] Tier 3: Silver Prophet (5 correct in-play trades)
  - [ ] Tier 4: Golden Ball Trader (predicted tournament winner)
  - [ ] Tier 5: Arena Legend (top 100 all-time leaderboard)
- [ ] IPFS metadata with dynamic SVG generation
- [ ] Only `WorldCupArenaHook` can mint

### 1.7 BracketNFT.sol
- [ ] ERC-721 (transferable)
- [ ] `mint(bytes32[] memory predictedPath)` — Round of 16 → Final
- [ ] Prediction hash stored on-chain
- [ ] `validate()` — checks against actual tournament results
- [ ] Payout from tournament prize pool

### 1.8 Interfaces
- [ ] `contracts/interfaces/IWorldCupArenaHook.sol`

### 1.9 Testing & Deployment
- [ ] Write Foundry tests for hook fee calculations
- [ ] Write Foundry tests for `updateMatchState` logic
- [ ] Write Foundry tests for `OutcomeToken` settlement/redeem
- [ ] Write Foundry tests for `FanToken` bonding curve
- [ ] Run Slither + Mythril security scan
- [ ] Deploy `WorldCupArenaHook` to X Layer testnet
- [ ] Deploy `OutcomeTokenFactory` to X Layer testnet
- [ ] Deploy `GoalSwapTrophies` to X Layer testnet
- [ ] Deploy `BracketNFT` to X Layer testnet
- [ ] Verify all contracts on Oklink explorer
- [ ] Document deployed addresses in `goalswap-docs/project-config/contract-config.md`

---

## 🔮 Phase 2 — Oracle + Backend (Days 3–4)

### 2.1 Oracle Service Setup
- [ ] Create `oracle-service/` directory
- [ ] Initialize `oracle-service/package.json`
- [ ] Install dependencies: `viem`, `socket.io`, `axios`, `redis`, `dotenv`, `cors`, `express`
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Create `oracle-service/src/` directory

### 2.2 DataFetcher.ts
- [ ] `fetchLiveMatches()` — Poll API-Football every 30s for `LIV` status matches
- [ ] `fetchMatchEvents(matchId)` — Poll for detailed events (goals, cards, penalties)
- [ ] `fetchUpcomingMatches()` — Pre-load next 48 hours of fixtures
- [ ] Exponential backoff on failure: `1s → 2s → 4s → 8s → max 60s`
- [ ] Request deduplication (same matchId max once per 15s)
- [ ] TheSportsDB fallback when API-Football rate limit hit
- [ ] Sportmonks integration for player-level data (Top Goalscorer props)

### 2.3 StateValidator.ts
- [ ] In-memory cache of last known state per `matchId`
- [ ] Compare new data vs cached state
- [ ] Emit `stateChanged` only when:
  - Score changed (goal detected)
  - Status changed (`LIV → FT`, `NS → LIV`)
  - Red card added
  - Minute advanced by >2 (catch-up after downtime)
- [ ] Data sanity checks: scores can't decrease, minute must increase

### 2.4 BlockchainWriter.ts
- [ ] Use `viem` with dedicated oracle wallet
- [ ] Call `updateMatchState()` on hook contract
- [ ] Nonce management for high-frequency updates
- [ ] Gas strategy: `estimateGas` + 20% buffer
- [ ] Transaction queue with 2-second spacing between updates
- [ ] Logging: `matchId`, `oldState`, `newState`, `txHash`, `blockNumber`

### 2.5 RedisCache.ts
- [ ] Store current match states with 24h TTL
- [ ] Key format: `match:{matchId}:state`, `match:{matchId}:lastUpdate`
- [ ] Oracle metrics: `oracle:txCount:today`, `oracle:errors:today`
- [ ] WebSocket replay — new client gets cached state instantly

### 2.6 WebSocket Server
- [ ] Create `websocket-server.ts` (Socket.io, port 8080)
- [ ] Rooms per match: `match:{matchId}`
- [ ] Emit events:
  - `match:update` → state, fees
  - `goal:scored` → team, scorer, minute, new fee
  - `match:settled` → winner, settlement TxHash
  - `fee:changed` → old/new fee, reason
- [ ] Heartbeat: ping every 30s, disconnect after 90s
- [ ] Rate limiting: max 10 connections per IP

### 2.7 Webhook Server
- [ ] Create `webhook-server.ts` (Express, port 3002)
- [ ] `POST /webhook/goal` → forwards to Telegram + X
- [ ] `POST /webhook/settled` → settlement notifications
- [ ] `GET /health` → oracle status, last update, queue depth

### 2.8 Database Setup
- [ ] Set up PostgreSQL on Railway/Supabase
- [ ] Run `telegram-bot/db.ts` schema migrations
- [ ] Create API endpoints:
  - `GET /api/matches` — all matches from Redis
  - `GET /api/match/:matchId` — detailed match state + pool data
  - `GET /api/pool/:poolId/price` — price + implied probability
  - `GET /api/leaderboard/:type` — volume/pnl/streak/trophies
  - `GET /api/user/:address` — portfolio summary
  - `GET /api/stats/global` — total volume, active users, fees

### 2.9 End-to-End Test
- [ ] Test: real goal → oracle update → hook fee change → WS broadcast → frontend receives event
- [ ] Test: API-Football rate limit → TheSportsDB fallback
- [ ] Test: multiple simultaneous match updates
- [ ] Test: oracle downtime → automatic reconnection

---

## 🖥️ Phase 3 — Frontend Core (Days 5–6)

### 3.1 Scaffold & Dependencies
- [ ] Install wagmi, viem, RainbowKit
- [ ] Install zustand for state management
- [ ] Install TradingView Lightweight Charts
- [ ] Install Framer Motion for animations
- [ ] Install socket.io-client
- [ ] Install Buffer polyfill (for browser compatibility)
- [ ] Install `@tanstack/react-query` (if needed)
- [ ] Set up RainbowKit with X Layer chain config
- [ ] Set up wagmi config with X Layer + supported chains
- [ ] Set up CORS proxy in `next.config.ts` for Uniswap Trading API
- [ ] Set up Buffer polyfill in `app/layout.tsx`

### 3.2 State Management (Zustand)
- [ ] `useMatchStore` — match states, live scores, fee tiers
- [ ] `useWalletStore` — wallet connection, chain info
- [ ] `usePortfolioStore` — positions, PnL, trophies

### 3.3 Custom Hooks
- [ ] `useLiveMatch(matchId)` — Socket.io room connection
  - [ ] Maintain: `matchState`, `feeTier`, `priceHistory`, `recentTrades`
  - [ ] On `goal:scored`: sound effect, confetti, flash fee indicator
  - [ ] On `fee:changed`: animate fee number with color transition
  - [ ] Cleanup on unmount
- [ ] `usePoolPrice(poolKey)` — poll `PoolManager.slot0` every 5s
  - [ ] Calculate implied probability
  - [ ] Compute edge vs historical probability
- [ ] `useGoalSwap()` — Uniswap Trading API integration
  - [ ] `getQuote()` — fetch quote from Trading API
  - [ ] `executeSwap()` — spread quote, handle permitData, broadcast tx

### 3.4 Core Components
- [ ] **`MatchCard`** — Responsive card (min-width 280px)
  - [ ] Live indicator: pulsing red dot
  - [ ] Odds display: three progress bars (Team A / Draw / Team B)
  - [ ] Team flags, live score, minute
  - [ ] Color coding: 🟢 Live · 🟡 Upcoming · ⚫ Finished
- [ ] **`SwapBox`** — Core trading UI
  - [ ] Dropdown: Select outcome (Team A Win / Draw / Team B Win)
  - [ ] Input: USDC amount
  - [ ] Display: Expected tokens, current fee %, implied probability
  - [ ] "Fee Impact" row
  - [ ] "Implied Probability" row
  - [ ] "Risk Score" badge (Low/Medium/High)
  - [ ] Button: "Buy Prediction" → triggers swap through hook
- [ ] **`LiveFeeTicker`** — Fixed position fee display
  - [ ] Current fee % with color coding:
    - ⚪ Gray → 0.3% Standard Play
    - 🟡 Yellow → 1.0% Normal
    - 🟠 Orange → 3.0% Post-Goal Volatility
    - 🔴 Red → 5.0% Red Card / Final Minutes
    - 🟣 Purple → 10.0% Penalty Shootout
  - [ ] Reason string
  - [ ] Countdown to fee reset (post-goal)
  - [ ] Fee number pulses on change
- [ ] **`EventTimeline`** — Match events list
  - [ ] Goals, red cards, substitutions
  - [ ] Click event → see fee at that moment
- [ ] **`TrophyMintModal`** — Auto-triggered trophy mint animation
  - [ ] Framer Motion scale-in
  - [ ] Trophy tier, match details, XP gained
  - [ ] Share-to-X button
- [ ] **`FanTokenCard`** — Fan token display
  - [ ] Team country token + live price
  - [ ] "Team Form" indicator (last 3 match results)
  - [ ] "Next Match" countdown
  - [ ] Live jackpot vault balance
- [ ] **`BracketTree`** — Visual bracket for tournament predictions
- [ ] **`LeaderboardTable`** — Global rankings
  - [ ] Tabs: Match Leaders · Fan Token Traders · Bracket Masters · All-Time XP
  - [ ] Top 3: gold/silver/bronze styling

### 3.5 Library Files
- [ ] `lib/contracts.ts` — ABIs + contract addresses for all deployed contracts
- [ ] `lib/oracle.ts` — Oracle API client for REST endpoints

### 3.6 Pages & Routes

#### `/` — Landing Page
- [ ] Hero section with live match countdown
- [ ] Three pillar cards: Match Markets · Fan Tokens · Meta-Markets
- [ ] CTA: Connect Wallet (RainbowKit)
- [ ] Footer: contract addresses, X links, docs

#### `/matches` — Match Listing
- [ ] Grid of live/upcoming/finished matches
- [ ] Filter by: Live Now · Today · Upcoming · Finished
- [ ] Real data from Oracle Redis (via `GET /api/matches`)

#### `/match/[matchId]` — Core Trading Interface
- [ ] Header: Team A vs Team B, live score, minute, status
- [ ] Price chart: TradingView Lightweight Candlestick
- [ ] SwapBox component
- [ ] LiveFeeTicker component
- [ ] EventTimeline component
- [ ] Recent Activity feed (real swaps)
- [ ] Score animation + confetti on goal

#### `/tokens` — Fan Token Marketplace
- [ ] Real country tokens with live V4 pool prices
- [ ] Team form + next match info
- [ ] Jackpot vault balances

#### `/brackets` — Tournament Meta-Markets
- [ ] Real World Cup 2026 bracket (48 teams, 12 groups)
- [ ] Group standings from API-Football
- [ ] "Group Winner" tokens
- [ ] "Top Goalscorer" market (Sportmonks data)
- [ ] Bracket minting flow

#### `/profile` — User Dashboard
- [ ] Active positions (predictions, fan tokens, bracket NFTs)
- [ ] PnL summary (realized + unrealized)
- [ ] Trophy cabinet (grid of SBT NFTs with tier badges)
- [ ] Streak counter 🔥
- [ ] Referral link + invitee stats

#### `/leaderboard` — Global Rankings
- [ ] Tabs: Match Leaders · Fan Token Traders · Bracket Masters · All-Time XP
- [ ] Columns: Rank, Address, Volume, PnL, Trophies, XP
- [ ] Top 3 highlighted

### 3.7 Notification System
- [ ] `NotificationProvider` (React Context)
- [ ] Browser push via Service Worker
- [ ] Notification types: `GOAL`, `FEE_SPIKE`, `SETTLEMENT`, `TROPHY`

### 3.8 Mobile & PWA
- [ ] All pages fully responsive
- [ ] Swap box thumb-friendly (large tap targets)
- [ ] PWA manifest for "Add to Home Screen"
- [ ] Bottom nav bar: Matches · Tokens · Brackets · Profile

### 3.9 Build & Verify
- [ ] `npm run build` — check for build errors
- [ ] `npm run lint` — check for lint errors
- [ ] Test wallet connection + swap flow on X Layer testnet
- [ ] Verify real-time WebSocket data rendering

---

## 🤖 Phase 4 — Telegram Bot + NFTs (Days 7–8)

### 4.1 Telegram Bot Setup
- [ ] Create `telegram-bot/` directory
- [ ] Initialize `telegram-bot/package.json`
- [ ] Install `node-telegram-bot-api`, `dotenv`, `axios`
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Create bot on Telegram via @BotFather → `@GoalSwapArenaBot`
- [ ] Set bot token in `.env`

### 4.2 Bot Commands
- [ ] `/start` — Welcome message with feature list
- [ ] `/live` — All currently live matches with scores + fee tiers
- [ ] `/match {team}` — Search match by team name
- [ ] `/odds {matchId}` — Implied probabilities from pool prices
- [ ] `/alert {matchId} {condition}` — Set custom alerts
- [ ] `/portfolio {wallet}` — Portfolio summary
- [ ] `/leaderboard` — Top 10 global traders
- [ ] `/trophies {wallet}` — SBT trophy count
- [ ] `/referral` — Generate referral link
- [ ] `/settings` — Notification preferences (language, alert toggles)
- [ ] `/alerts` — List/manage existing alerts
- [ ] Admin commands: `/status`, `/forceupdate`, `/broadcast`
- [ ] Multi-language support: EN, ES, PT, FR, AR, DE, JA, KO, ZH, RU, IT, NL

### 4.3 Alert System
- [ ] Goal alerts (auto-push to subscribers)
- [ ] Fee spike alerts
- [ ] Price threshold alerts (`/alert arg-bra price 0.30`)
- [ ] Settlement alerts
- [ ] Anti-spam: max 1 auto-alert per minute per group

### 4.4 Group Chat Integration
- [ ] Pin message with current live matches
- [ ] Auto-update pinned message every 5 minutes
- [ ] `/live` for all group members
- [ ] Goal alerts to group (configurable)

### 4.5 Interactive Flows
- [ ] Price alert setup conversation
- [ ] Live match discovery
- [ ] Goal notification auto-push (rich card with buttons)

### 4.6 Message Templates
- [ ] Goal Alert (with inline keyboard: Trade Now / Set Alert / Share)
- [ ] Fee Spike Alert
- [ ] Settlement Alert
- [ ] Live Match Discovery (with pagination)

### 4.7 Database Schema (PostgreSQL)
- [ ] `telegram_users` table
- [ ] `subscriptions` table
- [ ] `notifications` table
- [ ] Run migrations

### 4.8 Telegram ↔ Frontend Bridge
- [ ] Deep linking: `https://t.me/GoalSwapArenaBot?start=ref_{code}`
- [ ] Optional: Telegram Mini App integration
- [ ] WebApp URL: `https://goalswap.xyz/telegram`

### 4.9 Notification Service
- [ ] Push alert service (`notifications.ts`)
- [ ] Connect to webhook bridge from oracle
- [ ] Notification queue + delivery tracking

---

## 🧠 Phase 5 — AI + Polish (Days 9–10)

### 5.1 X Bot — @GoalSwapAgent
- [ ] Create `ai-agent/` directory
- [ ] Set up Python virtual environment
- [ ] Install: `tweepy`, `openai`, `python-dotenv`
- [ ] Create `ai-agent/bot.py`
- [ ] Auto-posting every 15 min during live matches
- [ ] Reply handler for @mentions:
  - Parse question intent
  - Query pool state from indexer
  - Query match state from oracle
  - Generate response with GPT-4 mini
  - Include swap link
- [ ] Hashtag strategy: `#WorldCup2026 #GoalSwap #XLayer #UniswapV4`
- [ ] Set up X API credentials (API key, API secret, Access token, Bearer token)

### 5.2 In-App AI Suggestions
- [ ] AI Insight card on match detail page
  - Historical comeback probability
  - Edge calculation: `impliedProb - historicalProb`
  - Contextual trade suggestion
- [ ] Auto-Trade feature (advanced):
  - User sets conditional rules
  - Backend monitors oracle
  - Executes swap via smart wallet delegation

### 5.3 The Graph Subgraph
- [ ] Create `indexer/` directory
- [ ] Write `schema.graphql` — Swap, Match, User entities
- [ ] Write `subgraph.yaml` — data sources config
- [ ] Write `src/mappings.ts` — event handlers
- [ ] Deploy to The Graph Studio
- [ ] Verify indexing of all hook events

### 5.4 Demo Video (90 seconds)
| Time | Scene |
|------|-------|
| 0-10s | Opening: "5 billion people will watch the World Cup..." |
| 10-25s | Live match. Argentina scores. Fee jumps 1% → 3% |
| 25-40s | One-click buy "Argentina Win" token. Wallet confirmation. |
| 40-55s | Fan token page. $ARG token. Jackpot vault. |
| 55-70s | Bracket NFT minting. Predict tournament path. |
| 70-85s | Trophy auto-mints on trade. |
| 85-90s | Closing: "GoalSwap Arena. Built on X Layer. Powered by Uniswap V4 Hooks." |

### 5.5 X Posting Schedule
| Day | Post |
|-----|------|
| 1 | Announce project + architecture diagram thread |
| 3 | Video: oracle updating hook fee after real goal |
| 5 | Frontend reveal: mobile one-click swap |
| 7 | Bracket league creation tutorial |
| 9 | Demo video (1-3 min) + submission thread |
| 10 | Final submission confirmation + Google Form screenshot |

**Every post must tag:** `@XLayerOfficial @Uniswap @flapdotsh`

### 5.6 Final Testing
- [ ] Full match lifecycle simulation:
  1. Pre-match state (NS → upcoming)
  2. Kickoff (NS → LIV, fee drops)
  3. Goal scored (fee spikes 1% → 3%)
  4. Telegram alert sent
  5. User trades (swap executed through hook)
  6. Red card (fee 5%)
  7. Match ends (FT, settlement, trophy mint)
  8. Winning tokens redeemed 1:1 USDC
  9. Losing tokens burned
  10. Leaderboard updated

### 5.7 Submission Preparation
- [ ] Make GitHub repo public
- [ ] Write comprehensive README with contract addresses
- [ ] Record demo video (screen recording + voiceover)
- [ ] Submit Google Form before **May 28, 23:59 UTC**
- [ ] Schedule X posts
- [ ] Final build check: `npm run build` + `forge test`

---

## ✅ Submission Checklist

- [ ] **WorldCupArenaHook.sol** deployed on X Layer with real oracle integration
- [ ] **Oracle node** running on AWS with API-Football + TheSportsDB fallback
- [ ] **WebSocket server** broadcasting real match updates
- [ ] **Next.js frontend** live on Vercel with real match data
- [ ] **@GoalSwapArenaBot** live on Telegram with all commands working
- [ ] **The Graph subgraph** indexing all hook events
- [ ] **Demo video**: real data → oracle update → fee change → Telegram alert → user trade → trophy mint
- [ ] **X account** active with `@XLayerOfficial @Uniswap @flapdotsh` tags
- [ ] **Google Form** submitted before **May 28, 23:59 UTC**
- [ ] **GitHub repo** public with comprehensive README including all contract addresses

---

## 📊 Progress Tracker

| Phase | Tasks Total | Tasks Done | Progress |
|-------|------------|------------|----------|
| Phase 0 — Setup & Docs | ~20 | ~25 (over-delivered) | ✅ |
| Phase 1 — Smart Contracts | ~55 | 0 | ⬜ |
| Phase 2 — Oracle + Backend | ~40 | 0 | ⬜ |
| Phase 3 — Frontend Core | ~70 | 0 | ⬜ |
| Phase 4 — Telegram Bot + NFTs | ~35 | 0 | ⬜ |
| Phase 5 — AI + Polish | ~30 | 0 | ⬜ |
| **Total** | **~250** | **25** | **~10%** |

---

*Last updated: May 26, 2026*
*Source: about.md — GoalSwap Arena Production Build Prompt*
