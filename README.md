<img width="1500" height="500" alt="GoalSwap Arena — Trade the World Cup" src="https://github.com/user-attachments/assets/44d28fa2-b5c7-4802-9787-8982b8a8becb" />

<div align="center">

# ⚽ GoalSwap Arena

### **The World's First Dynamic-Fee Prediction Market for Live Sports**

[![X Layer](https://img.shields.io/badge/X%20Layer-Testnet-22c55e?style=for-the-badge&logo=ethereum)](https://www.oklink.com/xlayer-test)
[![Uniswap V4](https://img.shields.io/badge/Uniswap-V4%20Hooks-ff007a?style=for-the-badge)](https://uniswap.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)]()

[**🚀 Live Demo**](https://goalswap.vercel.app) · [**📖 Docs**](#-how-x-layer-is-used) · [**🏗️ Architecture**](#-architecture) · [**🤖 Telegram Bot**](https://t.me/Goalswap_bot) · [**📺 Demo Video Script**](#-demo-video)

</div>

---

## 🎯 The Problem

**$3.5 trillion** is wagered on the World Cup every tournament — but **95% of it goes to centralized bookmakers** that:

- **Set the odds** — users have zero influence on pricing
- **Take 5-15% vig** — hidden fees that crush long-term profitability  
- **Block winners** — account restrictions for profitable bettors
- **No transparency** — no verifiable settlement, no public ledger
- **No real-time adaptation** — odds update slowly, missing live-match volatility

Prediction markets solve transparency, but **existing platforms (Polymarket, Azuro) don't adapt fees to live events**. A goal in the 89th minute is treated the same as a goal in the 5th minute. That's broken.

> **"What if the fee structure itself responded to what happens on the pitch?"**

---

## 💡 The Solution

**GoalSwap Arena** is a **real-time sports prediction market** where:

1. **Oracle nodes** pull live match data from API-Football every 30 seconds
2. **Uniswap V4 Hooks** automatically adjust swap fees based on match events — goals, red cards, penalties, final minutes
3. **Users trade** outcome tokens (Win/Draw/Lose) and team fan tokens on Uniswap V4 pools
4. **Settlement** happens 1:1 in USDC — winners redeem, losers' tokens burn
5. **Gamification** — soulbound trophies, XP, brackets, and leaderboards keep users engaged

```
┌──────────────────────────────────────────────────────────────────┐
│                    REAL WORLD → BLOCKCHAIN PIPELINE               │
│                                                                  │
│  🌍 Real Match  ──▶  🔮 Oracle  ──▶  🪝 V4 Hook  ──▶  💱 Swap  │
│     (API-Football)    (Render)     (Dynamic Fee)     (X Layer)  │
│                            │                                     │
│                            ▼                                     │
│                      📱 Frontend + 🤖 Telegram                   │
│                       (Vercel)         (Render)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⛓️ How X Layer Is Used

**X Layer** (Chain ID `1952`) is the settlement layer for all GoalSwap Arena transactions. Here's why X Layer and how we use it:

### Why X Layer?

| Advantage | Impact |
|-----------|--------|
| **Low gas fees** | Sub-cent transactions make micro-trades viable ($1-$100 trades) |
| **Fast finality** | ~2s block times enable real-time trading during live matches |
| **EVM-compatible** | Full Uniswap V4, wagmi, viem, and RainbowKit compatibility |
| **OKX ecosystem** | Native integration with OKX wallet, DEX, and bridge infrastructure |
| **Scalability** | Handles high-throughput during peak match hours (millions of users) |

### On-Chain Components (All Deployed on X Layer Testnet)

| Contract | Address | What It Does |
|----------|---------|--------------|
| **WorldCupArenaHook** | [`0x3E19f...D11CF`](https://www.oklink.com/xlayer-test/address/0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF) | The core innovation — a Uniswap V4 hook that reads live match state and adjusts swap fees dynamically |
| **OutcomeTokenFactory** | [`0x2CD9f...7022`](https://www.oklink.com/xlayer-test/address/0x2CD9fd3078932A9fbC8cA9384FA6a75536587022) | Creates 3 outcome tokens (Home Win / Draw / Away Win) per match + auto-deploys V4 pools |
| **GoalSwapTrophies** | [`0x67889...A735`](https://www.oklink.com/xlayer-test/address/0x6788921d3d3956C10554f1aEc8d9d4B279c9A735) | Soulbound NFTs (5 tiers) — free to mint, protocol pays gas |
| **BracketNFT** | [`0xE3fD4...D9F3`](https://www.oklink.com/xlayer-test/address/0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3) | Transferable bracket prediction NFTs — ERC-721, tradeable on secondary market |
| **MockUSDC** | `0x2ECDA...13d5` | Test USDC settlement token |
| **MockPoolManager** | `0x0Bf02...2564` | Demo swap execution for live trading |

### X Layer Data Flow

```
                        X Layer Testnet (Chain 1952)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  Oracle Wallet  │───▶│ WorldCupArenaHook│                   │
│  │  (Signs + Sends)│    │  .updateMatch()  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│                    ┌─────────────┼─────────────┐                │
│                    ▼             ▼              ▼                │
│            ┌────────────┐ ┌──────────┐ ┌─────────────┐         │
│            │BeforeSwap  │ │AfterSwap │ │ Match State │         │
│            │ Dynamic    │ │ Fee      │ │  Storage    │         │
│            │ Fee Calc   │ │ Split    │ │  (Goals,    │         │
│            └────────────┘ └──────────┘ │   Cards,    │         │
│                                        │   Minutes)  │         │
│                    │                   └─────────────┘         │
│                    ▼                                            │
│            ┌────────────┐     ┌──────────────┐                 │
│            │OutcomeToken│     │ GoalSwap     │                 │
│            │  Factory   │     │ Trophies     │                 │
│            │ (3 tokens  │     │ (SBT mint)   │                 │
│            │  per match)│     └──────────────┘                 │
│            └────────────┘                                      │
│                    │                                            │
│                    ▼                                            │
│            ┌────────────┐                                      │
│            │  V4 Pool   │  ← Users swap here                   │
│            │ (USDC pair)│                                       │
│            └────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🪝 How Uniswap V4 Hooks Are Used

This is the **core innovation** of GoalSwap Arena. Uniswap V4's hook system lets us inject custom logic into the swap lifecycle — something impossible in V2/V3.

### The Hook: `WorldCupArenaHook.sol`

Our hook implements 4 lifecycle callbacks:

| Hook | When It Fires | What GoalSwap Does |
|------|--------------|-------------------|
| `beforeSwap` | Before every swap | **Calculates dynamic fee** based on live match state |
| `afterSwap` | After every swap | **Splits fees** (70% LP / 20% protocol / 10% jackpot) + **checks trophy eligibility** |
| `afterInitialize` | When pool is created | **Stores metadata** (match ID, market type, teams) |
| `afterAddLiquidity` | When LP adds funds | **Tracks LP positions** for gamification rewards |

### Dynamic Fee Engine

The fee isn't static — it **changes in real-time** based on what's happening in the match:

```solidity
// Simplified beforeSwap logic
function beforeSwap(...) external view returns (int24, uint24) {
    MatchState memory state = matchStates[poolMeta.matchId];
    
    uint24 fee;
    string memory reason;
    
    if (state.isFinished) {
        fee = 0;           // Settlement — no fee
        reason = "Settlement";
    } else if (state.penaltyShootout) {
        fee = 100000;      // 10% — maximum volatility
        reason = "Penalty Shootout";
    } else if (state.redCards > 0 || state.minute >= 90) {
        fee = 50000;       // 5% — red card or stoppage time
        reason = "Red Card / Final Minutes";
    } else if (isNearGoal(state)) {
        fee = 30000;       // 3% — goal just happened (within 5 min)
        reason = "Post-Goal Volatility";
    } else if (state.minute <= 15) {
        fee = 3000;        // 0.3% — kickoff window, low volatility
        reason = "Kickoff Window";
    } else {
        fee = 10000;       // 1% — normal play
        reason = "Normal Play";
    }
    
    return (0, fee);
}
```

### Fee Tiers — Real-Time Adaptation

| Match Event | Fee | Why |
|-------------|-----|-----|
| ⚽ **Kickoff** (0-15') | **0.3%** | Low volatility, encourage early positions |
| 🎯 **Normal play** | **1.0%** | Standard trading conditions |
| 🔥 **Within 5 min of goal** | **3.0%** | Price impact is massive — fee protects LPs |
| 🟥 **Red card** or **90+ min** | **5.0%** | High volatility, reduced liquidity |
| ⚽⚽ **Penalty shootout** | **10.0%** | Maximum uncertainty |
| 🏁 **Match finished** | **0.0%** | Settlement — no fee on redemption |
| 💸 **Fan token panic-sell** | **10.0%** | Team losing + user selling = anti-dump |

### Fee Revenue Distribution (afterSwap)

```
Every swap fee is automatically split:

┌─────────────────────────────────────────────────┐
│  MATCH PREDICTION SWAP FEES                     │
│                                                 │
│  ████████████████████████████░░░░░░░░  70% LP   │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  20% Prot  │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10% Jack  │
│                                                 │
│  FAN TOKEN SWAP FEES                            │
│                                                 │
│  ████████████████████░░░░░░░░░░░░░░░░  60% LP   │
│  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15% Prot  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  20% Jack  │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Refer │
│                                                 │
│  META-MARKET SWAP FEES (Brackets)               │
│                                                 │
│  ████████████████████████████████░░░░  80% LP   │
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15% Prot  │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Tour  │
└─────────────────────────────────────────────────┘
```

### Why This Matters

| Traditional DEX | GoalSwap Arena |
|----------------|----------------|
| Fixed fee tiers (0.01%, 0.05%, 0.3%, 1%) | Dynamic fee that adapts to real-world events |
| LPs take uniform risk | LPs compensated proportionally to volatility |
| No event awareness | Hook reads live match state from oracle |
| Static pricing model | Pricing model evolves with the game |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          GOALSWAP ARENA ARCHITECTURE                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │   API-Football  │    │  TheSportsDB    │    │   Sportmonks    │      │
│  │   (Primary)     │    │  (Fallback)     │    │   (Tertiary)    │      │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
│           │                      │                      │                │
│           └──────────────────────┼──────────────────────┘                │
│                                  ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ORACLE SERVICE (Render)                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐     │    │
│  │  │  Data    │→ │  State   │→ │  Blockchain │→ │  Redis   │     │    │
│  │  │ Fetcher  │  │Validator │  │  Writer     │  │  Cache   │     │    │
│  │  └──────────┘  └──────────┘  └──────┬─────┘  └──────────┘     │    │
│  │                                      │                          │    │
│  │              ┌───────────────────────┼──────────────┐          │    │
│  │              ▼                       ▼              ▼          │    │
│  │     ┌──────────────┐     ┌──────────────┐  ┌───────────┐     │    │
│  │     │  WebSocket   │     │  REST API    │  │  Webhook  │     │    │
│  │     │  (Socket.io) │     │  (Express)   │  │  Bridge   │     │    │
│  │     └──────┬───────┘     └──────┬───────┘  └─────┬─────┘     │    │
│  └────────────┼────────────────────┼────────────────┼────────────┘    │
│               │                    │                │                  │
│  ┌────────────┼────────────────────┼────────────────┼────────────┐    │
│  │            ▼                    ▼                ▼            │    │
│  │  ┌──────────────┐     ┌──────────────┐  ┌───────────┐       │    │
│  │  │  FRONTEND    │     │  TELEGRAM    │  │  X BOT    │       │    │
│  │  │  (Vercel)    │     │  BOT (Render)│  │  (Python) │       │    │
│  │  │  Next.js 16  │     │  @Goalswap_bot│  │ @GoalSwap │       │    │
│  │  │  + wagmi     │     │  10+ commands│  │  Agent    │       │    │
│  │  └──────────────┘     └──────────────┘  └───────────┘       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│               │                                                       │
│               ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              X LAYER TESTNET (Chain 1952)                    │    │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │    │
│  │  │ WorldCup   │ │Outcome   │ │ Trophy   │ │  Bracket     │  │    │
│  │  │ Arena Hook │ │Token Fctry│ │  NFT     │ │  NFT         │  │    │
│  │  └────────────┘ └──────────┘ └──────────┘ └──────────────┘  │    │
│  │                  ┌──────────────┐                             │    │
│  │                  │  V4 Pools    │  ← User swaps happen here  │    │
│  │                  │  (USDC pairs)│                             │    │
│  │                  └──────────────┘                             │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  THE GRAPH (Subgraph) — Indexes all on-chain events          │    │
│  │  Swap · Match · User · Trophy · Bracket · FanToken entities  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Live Deployments

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | [goalswap.vercel.app](https://goalswap.vercel.app) | ✅ Live |
| **Oracle API** | [goalswap.onrender.com](https://goalswap.onrender.com) | ✅ Live (56 matches) |
| **WebSocket** | `wss://goalswap.onrender.com` | ✅ Live |
| **Telegram Bot** | [@Goalswap_bot](https://t.me/Goalswap_bot) | ✅ Live (10+ commands) |
| **Smart Contracts** | [X Layer Testnet](https://www.oklink.com/xlayer-test/address/0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF) | ✅ Verified |
| **GitHub** | [github.com/LSUDOKO/GoalSwap](https://github.com/LSUDOKO/GoalSwap) | ✅ Public |

---

## ✨ Key Features

### ⚡ Real-Time Dynamic Fees
Uniswap V4 hooks adjust swap fees **every time** the match state changes. A goal in the 89th minute triggers a 5% fee spike. A red card pushes it to 5%. Penalty shootout? 10%. LPs are always fairly compensated for the risk they take.

### 🧠 AI-Powered Trading Insights
Every match detail page includes contextual AI analysis — comeback probability, fee-based recommendations, late-game volatility alerts, and trophy opportunities. Generated from live match state, historical data, and fee tier.

### ⚽ Match Outcome Trading
Buy prediction tokens for Win / Draw / Lose. Trade in real-time as odds shift with every goal, card, and minute. Settlement is automatic — winners redeem 1:1 USDC, losers' tokens burn.

### 🎭 Fan Token Bonding Curves
Team-branded tokens with automated bonding curves. Natural price discovery — every buy increases the price. When 50% of supply is minted, a V4 pool auto-launches. Jackpot vaults accumulate from trading fees.

### 🏆 Soulbound Trophies (SBT)
5 tiers of non-transferable achievement NFTs — free to mint, protocol pays gas:

| Tier | Name | How to Earn |
|------|------|-------------|
| 1 | ⚡ Lightning Reflex | Trade within 60s of a goal |
| 2 | 🥉 Bronze Nostradamus | 1 correct upset prediction |
| 3 | 🥈 Silver Prophet | 5 correct in-play trades |
| 4 | 🥇 Golden Ball Trader | Predicted tournament winner |
| 5 | 👑 Arena Legend | Top 100 all-time leaderboard |

### 📋 Bracket Prediction NFTs
Mint transferable ERC-721 brackets predicting the entire tournament path. Trade bracket futures in a secondary market. Correct brackets earn payouts from the tournament prize pool.

### 📱 Telegram Bot — @Goalswap_bot
10+ commands with real-time push alerts:

| Command | What It Does |
|---------|-------------|
| `/live` | All live matches with scores and fee tiers |
| `/match {team}` | Search match by team name |
| `/alert {matchId} {condition}` | Custom alerts (goal/price/fee) |
| `/portfolio {wallet}` | Portfolio summary |
| `/leaderboard` | Top 10 global traders |
| `/brackets` | Bracket prediction NFTs |
| `/trophies` | Trophy cabinet display |
| `/linkwallet` | Link wallet address |

Auto-push notifications: goal alerts, fee spikes, settlements — all pushed from the oracle via webhook bridge.

### 🐦 X Bot — @GoalSwapAgent
Auto-posts every 15 minutes during live matches with real-time market data. Reply handler for @mentions with AI-generated responses.

### 📊 The Graph Subgraph
Indexes all on-chain events from every contract. Entities: Match, Pool, Swap, User, Trophy, Bracket, FanToken. Powers the leaderboard, portfolio, and analytics pages.

---

## 🏛️ Smart Contracts

### All Deployed & Verified on X Layer Testnet

| Contract | Address | Explorer |
|----------|---------|----------|
| **WorldCupArenaHook** | `0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF` | [View →](https://www.oklink.com/xlayer-test/address/0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF) |
| **OutcomeTokenFactory** | `0x2CD9fd3078932A9fbC8cA9384FA6a75536587022` | [View →](https://www.oklink.com/xlayer-test/address/0x2CD9fd3078932A9fbC8cA9384FA6a75536587022) |
| **GoalSwapTrophies** | `0x6788921d3d3956C10554f1aEc8d9d4B279c9A735` | [View →](https://www.oklink.com/xlayer-test/address/0x6788921d3d3956C10554f1aEc8d9d4B279c9A735) |
| **BracketNFT** | `0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3` | [View →](https://www.oklink.com/xlayer-test/address/0xE3fD44B189F481E0FBE887b0F0dE938d4107D9F3) |
| **MockUSDC** | `0x2ECDAcB97eE840da3391E63038D7E086129A13d5` | [View →](https://www.oklink.com/xlayer-test/address/0x2ECDAcB97eE840da3391E63038D7E086129A13d5) |
| **MockPoolManager** | `0x0Bf02B5765dBbC15b5C1b56412Fc73e70F782564` | [View →](https://www.oklink.com/xlayer-test/address/0x0Bf02B5765dBbC15b5C1b56412Fc73e70F782564) |
| **Oracle Signer** | `0x4FD969A5E6c9f3fff2cA37B473E30b39106F0F99` | [View →](https://www.oklink.com/xlayer-test/address/0x4FD969A5E6c9f3fff2cA37B473E30b39106F0F99) |

### Contract Interactions

```
User Wallet
    │
    ├──▶ OutcomeTokenFactory.createMatch() ──▶ Creates 3 ERC-20 tokens + V4 pool
    │
    ├──▶ MockPoolManager.simulateSwap() ──▶ Executes trade through hook
    │         │
    │         └──▶ WorldCupArenaHook.beforeSwap() ──▶ Calculates dynamic fee
    │         └──▶ WorldCupArenaHook.afterSwap()  ──▶ Splits fees + checks trophies
    │
    ├──▶ OutcomeToken.redeem() ──▶ Burns winning token, returns USDC 1:1
    │
    ├──▶ BracketNFT.mintBracket() ──▶ Mints prediction NFT
    │
    └──▶ GoalSwapTrophies.mint() ──▶ Mints soulbound achievement (protocol pays gas)

Oracle Wallet
    │
    └──▶ WorldCupArenaHook.updateMatchState() ──▶ Updates score, minute, status
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) | SSR/SSG for performance |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Consistent, accessible UI |
| **Web3** | wagmi v2 + viem v2 + RainbowKit | Wallet connection + contract interaction |
| **Charts** | TradingView Lightweight Charts | Real-time price candlesticks |
| **Animation** | Framer Motion | Smooth transitions + micro-interactions |
| **State** | Zustand | Lightweight global state |
| **Smart Contracts** | Solidity + Foundry + Uniswap V4 Periphery | On-chain logic |
| **Oracle** | TypeScript/Node.js | API-Football + TheSportsDB + Sportmonks |
| **WebSocket** | Socket.io | Real-time score + fee broadcasts |
| **Cache** | Redis / Upstash | Match state caching |
| **Telegram** | node-telegram-bot-api | Bot commands + push alerts |
| **X Bot** | Python (Tweepy + OpenAI) | Auto-posting + AI replies |
| **Indexer** | The Graph (subgraph) | On-chain event indexing |
| **Infra** | Vercel (frontend) + Render (oracle + bot) | Zero-downtime deployment |

---

## 📂 Project Structure

```
goalswap/
├── app/                          # Next.js 16 App Router
│   ├── page.tsx                  # Landing — hero, features, CTA
│   ├── matches/page.tsx          # Match grid — live/upcoming/finished
│   ├── match/[matchId]/page.tsx  # Core trading — SwapBox, FeeTicker, AI Insights
│   ├── tokens/page.tsx           # Fan token marketplace
│   ├── brackets/page.tsx         # Bracket prediction NFTs
│   ├── leaderboard/page.tsx      # Trader rankings
│   ├── profile/page.tsx          # Wallet portfolio + trophy cabinet
│   ├── odds/page.tsx             # Live odds dashboard
│   ├── games/page.tsx            # Multi-sport browser
│   ├── activity/page.tsx         # Activity feed
│   └── status/page.tsx           # Oracle health status
│
├── components/                   # React components
│   ├── SwapBox.tsx               # Core trading interface (buy/redeem)
│   ├── MatchCard.tsx             # Match grid card with live indicator
│   ├── LiveFeeTicker.tsx         # Dynamic fee display
│   ├── EventTimeline.tsx         # Match events (goals, cards, subs)
│   ├── AiInsightCard.tsx         # AI-powered trading insights
│   ├── NewsFeed.tsx              # Activity feed
│   └── ui/                       # shadcn/ui primitives
│
├── contracts/                    # Solidity (Foundry)
│   ├── src/hooks/                # WorldCupArenaHook.sol
│   ├── src/tokens/               # FanToken, OutcomeToken, OutcomeTokenFactory
│   ├── src/tokens/GoalSwapTrophies.sol  # SBT trophies
│   ├── src/tokens/BracketNFT.sol        # Transferable bracket NFTs
│   ├── src/interfaces/           # IWorldCupArenaHook, IGoalSwapTrophies
│   ├── test/                     # Foundry tests
│   └── script/                   # Deploy scripts
│
├── oracle-service/               # TypeScript oracle backend
│   └── src/
│       ├── index.ts              # Main orchestrator
│       ├── DataFetcher.ts        # API-Football polling
│       ├── MultiSportFetcher.ts  # Multi-sport support (13 sports)
│       ├── StateValidator.ts     # Diff engine — detects goals, cards, status
│       ├── BlockchainWriter.ts   # On-chain writes via viem
│       ├── RedisCache.ts         # Match state caching
│       ├── websocket-server.ts   # Socket.io (port 8081)
│       └── webhook-server.ts     # REST API (port 3002) + Telegram bridge
│
├── telegram-bot/                 # Node.js Telegram bot
│   └── src/
│       ├── index.ts              # Bot entry (auto-detects Render vs local)
│       ├── commands/             # /live, /match, /alert, /portfolio, /leaderboard
│       └── services/             # API client, DB, notifications
│
├── ai-agent/                     # X bot (Python)
│   ├── bot.py                    # Tweepy + OpenAI auto-posting
│   └── requirements.txt
│
├── indexer/                      # The Graph subgraph
│   ├── schema.graphql            # GraphQL schema
│   ├── subgraph.yaml             # Event handler manifest
│   └── src/mappings.ts           # Event handler logic
│
├── hooks/                        # React hooks
│   ├── useSwap.ts                # Token swap execution
│   ├── useMatchState.ts          # Live match via WebSocket
│   └── usePoolMetadata.ts        # V4 pool metadata reader
│
├── lib/                          # Frontend utilities
│   ├── oracle.ts                 # REST API client
│   ├── contracts.ts              # Contract ABIs + addresses
│   └── socket.ts                 # WebSocket client
│
└── stores/                       # Zustand stores
    ├── matchStore.ts
    └── walletStore.ts
```

---

## 📊 Data Sources

### Oracle Pipeline (Real Data — No Mocks)

| Source | What We Get | Frequency |
|--------|------------|-----------|
| **API-Football** | Match schedule, live scores, events, lineup | Every 30s during live matches |
| **TheSportsDB** | Fallback data when API-Football is rate-limited | Every 60s |
| **Sportmonks** | Player-level data (top scorers, assists) | Daily |

### How Oracle Updates Reach the Blockchain

```
1. DataFetcher polls API-Football every 30s
   │
2. StateValidator compares new data to cached state
   │  (Only emits if score/status/minute actually changed)
   │
3. BlockchainWriter signs + sends updateMatchState() to X Layer
   │  (Nonce management, gas estimation, tx queue)
   │
4. RedisCache stores new state (24h TTL)
   │
5. WebSocket broadcasts to all connected frontend clients
   │
6. Webhook Bridge pushes alerts to Telegram bot
   │
7. Telegram bot sends goal/fee/settlement messages to subscribers
```

**End-to-end latency: ~3-5 seconds** from real goal → on-chain update → frontend + Telegram notification.

---

## 🖥️ Getting Started

### Prerequisites

- Node.js >= 20
- Redis (local or Upstash)
- API keys (API-Football, optional Sportmonks)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/LSUDOKO/GoalSwap.git
cd goalswap

# Install all dependencies
npm install
cd oracle-service && npm install && cd ..
cd telegram-bot && npm install && cd ..

# Set up environment
cp .env.local.example .env.local
cp oracle-service/.env.example oracle-service/.env
# Edit .env files with your API keys

# Start all services (3 terminals)
cd oracle-service && npm run dev    # Terminal 1 — Oracle (port 3002)
cd telegram-bot && npm run dev      # Terminal 2 — Telegram bot (port 3003)
npm run dev                          # Terminal 3 — Frontend (port 3000)
```

### Environment Variables

**Frontend** (`.env.local`):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_API_URL` | Oracle REST API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |
| `NEXT_PUBLIC_HOOK_ADDRESS` | WorldCupArenaHook contract |
| `NEXT_PUBLIC_POOL_MANAGER_ADDRESS` | MockPoolManager contract |
| `NEXT_PUBLIC_USDC_ADDRESS` | USDC token address |

**Oracle** (`oracle-service/.env`):

| Variable | Description |
|----------|-------------|
| `API_SPORTS_KEY` | API-Football API key |
| `SPORTMONKS_TOKEN` | Sportmonks token (optional) |
| `ORACLE_PRIVATE_KEY` | Oracle wallet private key |
| `X_LAYER_RPC` | X Layer RPC URL |
| `REDIS_URL` | Redis URL (omit = in-memory fallback) |
| `TELEGRAM_BOT_WEBHOOK_URL` | Telegram webhook bridge URL |

---

## 🎬 Demo Video

Our 90-second demo video script covers the full user journey:

| Time | Scene |
|------|-------|
| **0-10s** | Hook — *"5 billion people will watch the World Cup. Most will just watch."* |
| **10-25s** | Live match — Goal scored → fee jumps 1% → 3% in real-time |
| **25-40s** | One-click trade — Buy "Argentina Win" tokens, wallet confirm, done |
| **40-55s** | Fan tokens — Bonding curves, jackpot vaults, auto-pool creation |
| **55-70s** | Bracket NFTs — Predict tournament path, mint, trade |
| **70-85s** | AI insights + trophies — Contextual analysis + soulbound mint |
| **85-90s** | Closing — *"Built on X Layer. Powered by Uniswap V4 Hooks."* |

> **Required tags:** `@XLayerOfficial @Uniswap @flapdotsh`

---

## 🔐 Security

- **Oracle signatures** — On-chain signature verification prevents replay attacks
- **Score regression protection** — Scores can never decrease on-chain
- **Stale data protection** — Updates older than 5 minutes are rejected
- **MEV protection** — `require(block.number >= lastSwapBlock[sender] + 2)`
- **ReentrancyGuard** — All external functions protected (OpenZeppelin)
- **Emergency pause** — Owner can pause all trading instantly
- **Multi-oracle ready** — Architecture supports 2-of-3 multisig upgrade

---

## 📋 Submission Checklist

- [x] **WorldCupArenaHook.sol** deployed on X Layer with real oracle integration
- [x] **Oracle node** running — 13 sports, 56 seeded matches, real API keys
- [x] **WebSocket + HTTP** sharing single port (Render-compatible)
- [x] **Next.js frontend** live on Vercel — connected to Render oracle
- [x] **@Goalswap_bot** deployed on Render — 10+ commands + push alerts
- [x] **Oracle → Telegram webhook** — real-time goal/settlement notifications
- [x] **Smart contracts verified** on [X Layer Testnet Explorer](https://www.oklink.com/xlayer-test)
- [x] **The Graph subgraph** ready for deployment
- [x] **Demo video script** prepared (90 seconds, 7 scenes)
- [x] **GitHub repo** public with comprehensive README

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

### Built for the **X Layer + Uniswap V4 Hackathon 2026**

**[🚀 Try GoalSwap Arena →](https://goalswap.vercel.app)** · **[🤖 Telegram Bot →](https://t.me/Goalswap_bot)** · **[📜 Smart Contracts →](https://www.oklink.com/xlayer-test/address/0x3E19f269DF50d0a8fc32ee774E7C338A8cDF11CF)**

</div>
