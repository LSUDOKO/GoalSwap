# 🏆 Production Build Prompt: GoalSwap Arena

> Real-Data World Cup Trading Platform · X Layer · Uniswap V4 Hooks · Telegram + X Integration

---

## 1. Project Mandate

Build **GoalSwap Arena** as a production-ready application using real sports data APIs, live oracle infrastructure, and dual-platform social integration (Telegram + X). No mock data. No manual triggers. Every match event must flow from real-world data → oracle → hook → frontend → user notification in under 5 seconds.

---

## 2. Real-Data Oracle Architecture

### 2.1 Sports Data Provider Stack

#### Primary Source: API-Football (`api-football.com`)

- **Endpoint:** `GET /v3/fixtures` — match schedule
- **Endpoint:** `GET /v3/fixtures?id={matchId}` — live scores
- **Polling interval:** 30 seconds during active matches
- **Rate limit:** 100 requests/day (free tier) — implement request batching
- **Data fields consumed:** `fixture.id`, `fixture.status.short` (NS, LIV, FT), `goals.home`, `goals.away`, `score.halftime`, `score.fulltime`, `events` (goals, red cards, substitutions)

#### Fallback Source: TheSportsDB (`thesportsdb.com`)

- Used when API-Football rate limit hit or downtime
- **Endpoint:** `GET /v1/json/3/eventsseason.php?id=4424&s=2024-2025`
- **Polling interval:** 60 seconds
- **Failover logic:** If primary source returns 429/500/timeout after 3 retries, switch to fallback

#### Tertiary Source: Sportmonks (`sportmonks.com`)

- Used for player-level data (Top Goalscorer props)
- **Endpoint:** `GET /football/v3/topscorers/season/{seasonId}`
- Updated daily, not per-match

---

### 2.2 Oracle Node Infrastructure

Build `oracle-node/` as a TypeScript/Node.js service.

**Architecture:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  API-Football   │────▶│  Oracle Parser   │────▶│  Web3 Signer    │
│  (Real Data)    │     │  (Data Validator)│     │  (Hot Wallet)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TheSportsDB    │     │  State Diffs     │     │  X Layer        │
│  (Fallback)     │     │  (Only Changed)  │     │  Hook Contract  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Redis Cache     │
                       │  (Match State)   │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  WebSocket       │
                       │  Broadcast       │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Telegram Bot    │
                       │  Push Service    │
                       └──────────────────┘
```

#### `DataFetcher.ts`

- `fetchLiveMatches()` — Polls API-Football every 30s for matches with status `LIV`
- `fetchMatchEvents(matchId)` — Polls for detailed events (goals, cards, penalties)
- `fetchUpcomingMatches()` — Pre-loads next 48 hours of fixtures
- Implements exponential backoff on failure: `1s → 2s → 4s → 8s → max 60s`
- Request deduplication: Don't fetch same `matchId` more than once per 15 seconds

#### `StateValidator.ts`

- Maintains in-memory cache of last known state per `matchId`
- Compares new data to cached state
- Only emits `stateChanged` event if:
  - Score changed (goal detected)
  - Status changed (`LIV → FT`, or `NS → LIV`)
  - Red card added
  - Minute advanced by >2 (catches up after downtime)
- Validates data sanity: `homeScore + awayScore` cannot decrease, minute must increase or stay same

#### `BlockchainWriter.ts`

- Uses `viem`/`ethers.js` with a dedicated oracle wallet
- Calls `updateMatchState()` on hook contract **only** when `StateValidator` confirms a diff
- Implements nonce management for high-frequency updates (multiple goals in quick succession)
- **Gas strategy:** Use `estimateGas` + 20% buffer. If gas estimation fails, skip update and alert admin
- **Transaction queue:** If multiple matches update simultaneously, queue them with 2-second spacing to avoid nonce collisions
- Logs every transaction: `matchId`, `oldState`, `newState`, `txHash`, `blockNumber`

#### `RedisCache.ts`

- Stores current match states with 24h TTL
- Key format: `match:{matchId}:state` → JSON string
- Also stores: `match:{matchId}:lastUpdate`, `oracle:txCount:today`, `oracle:errors:today`
- Used for WebSocket replay — new client connects → gets cached state instantly

---

### 2.3 WebSocket Server

**File:** `websocket-server.ts`

- **Port:** 8080
- **Protocol:** Socket.io with rooms
- **Rooms per match:** `match:{matchId}`
- **Events emitted:**
  - `match:update` → `{ matchId, homeScore, awayScore, minute, status, feeTier, feeReason }`
  - `goal:scored` → `{ matchId, team, scorer, minute, newFee, priceImpact }`
  - `match:settled` → `{ matchId, winner, settlementTxHash }`
  - `fee:changed` → `{ matchId, oldFee, newFee, reason }`
- **Heartbeat:** Ping every 30s. Disconnect clients not responding after 90s
- **Rate limiting:** Max 10 connections per IP

---

### 2.4 Webhook Bridge for External Services

**File:** `webhook-server.ts` — Port: 3002

| Endpoint | Description |
|---|---|
| `POST /webhook/goal` | Receives goal events, forwards to Telegram + X bot services |
| `POST /webhook/settled` | Match ended, triggers settlement notifications |
| `GET /health` | Returns oracle status, last update timestamp, queue depth |

---

## 3. Telegram Bot Integration

### 3.1 Bot Architecture

- **Bot Name:** `@GoalSwapArenaBot`
- **Framework:** Node.js `node-telegram-bot-api` (shares codebase with oracle service)

---

### 3.2 Bot Features

#### A. Real-Time Match Alerts (Push Notifications)

User subscribes to teams or specific matches. When goal scored, bot sends instant message to all subscribers.

**Goal Alert Message:**
```
⚽ GOAL! Argentina 2-1 Brazil (67')

🏟️ Match: Argentina vs Brazil
⏱️ Minute: 67'
⚡ Fee Impact: Trading fee spiked to 3%

💰 Argentina Win token: +42%
📉 Brazil Win token: -38%

[Trade Now] [View Match]
```

Buttons use `InlineKeyboardMarkup`:
- **Trade Now** → Deep link: `https://goalswap.xyz/match/arg-bra-2026`
- **Set Alert** → `/alert arg-bra price 0.25`
- **Share** → Pre-filled message for user to forward

#### B. Group Chat Integration

Bot works in Telegram groups (up to 200,000 members).

**Commands:**

| Command | Description |
|---|---|
| `/start` | Welcome message with feature list |
| `/live` | All currently live World Cup matches with scores and fee tiers |
| `/match {team}` | Search match by team name, returns current state + trading link |
| `/odds {matchId}` | Implied probabilities from pool prices |
| `/alert {matchId} {condition}` | Set custom alerts (see below) |
| `/portfolio {wallet}` | Show portfolio summary if wallet connected |
| `/leaderboard` | Top 10 global traders this week |
| `/trophies {wallet}` | Show user's SBT trophy count |
| `/referral` | Generate referral link |

**Alert types:**
- `/alert arg-bra goal` — Notify when goal scored
- `/alert arg-bra price 0.30` — Notify when ARG Win token hits $0.30
- `/alert arg-bra fee 5` — Notify when fee reaches 5%

#### C. Admin Commands (Owner only)

| Command | Description |
|---|---|
| `/status` | Oracle health, active matches, queue depth, error count |
| `/forceupdate {matchId}` | Manually trigger oracle update (emergency only) |
| `/broadcast {message}` | Send message to all subscribers |

#### D. Notification Preferences

Users configure via `/settings`:

- Goal alerts: ON/OFF
- Fee spike alerts: ON/OFF
- Settlement alerts: ON/OFF
- Daily summary: ON/OFF
- **Language support:** English, Spanish, Portuguese, French, Arabic, German, Japanese, Korean, Chinese, Russian, Italian, Dutch

---

### 3.3 Telegram Bot — Database Schema

```sql
CREATE TABLE telegram_users (
    user_id     BIGINT PRIMARY KEY,
    username    VARCHAR(50),
    first_name  VARCHAR(100),
    language    VARCHAR(10) DEFAULT 'en',
    wallet_address VARCHAR(42),
    created_at  TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES telegram_users(user_id),
    match_id    VARCHAR(50),
    team_token  VARCHAR(42),
    alert_type  VARCHAR(20), -- 'goal', 'price', 'fee', 'settlement'
    alert_value DECIMAL(10,4), -- for price/fee thresholds
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id        SERIAL PRIMARY KEY,
    user_id   BIGINT,
    match_id  VARCHAR(50),
    type      VARCHAR(20),
    message   TEXT,
    sent_at   TIMESTAMP DEFAULT NOW(),
    delivered BOOLEAN DEFAULT FALSE
);
```

---

### 3.4 Bot Message Templates

**Goal Alert:**
```
⚽ *GOAL SCORED*

*{team}* {homeScore}-{awayScore} *{opponent}*
⏱️ {minute}'

💹 Market Impact:
• {team} Win Token: {priceChange}
• Trading Fee: {fee}% ({feeReason})

🏆 Trophy Opportunity: Trade within 60s to earn "Lightning Reflex" SBT

[▶️ Trade Now]({frontendUrl})
```

**Fee Spike Alert:**
```
⚡ *FEE SPIKE ALERT*

*{teamA} vs {teamB}*
New Fee: *{fee}%* (was {oldFee}%)
Reason: {reason}

💡 Tip: High fees = high volatility = high LP yield

[Provide Liquidity]({lpUrl})
```

**Settlement Alert:**
```
🏁 *MATCH ENDED*

*{teamA} {finalScore} {teamB}*

✅ Winning tokens now redeemable 1:1 USDC
🔥 Losing tokens auto-burned
💰 LP dividends distributed

Your positions: [View Portfolio]({profileUrl})
```

---

### 3.5 Telegram ↔ Frontend Bridge

- **Deep linking:** `https://t.me/GoalSwapArenaBot?start=ref_{code}` for referrals
- **Telegram Mini App (Optional):** WebApp integration for in-Telegram trading
  - URL: `https://goalswap.xyz/telegram`
  - Uses Telegram WebApp JS API for authentication
  - Simplified interface optimized for mobile vertical screen

---

### 3.6 Interactive Conversation Flows

**Setting a Price Alert:**
```
User:  /alert
Bot:   Which match? Send team name or match ID.
User:  Argentina
Bot:   Found: Argentina vs Brazil (LIVE, 67'). What type of alert?
       [Goal] [Price] [Fee] [Settlement]
User:  (clicks Price)
Bot:   Enter target price for Argentina Win token (current: $0.31):
User:  0.40
Bot:   ✅ Alert set! I'll notify you when Argentina Win token reaches $0.40.
       Manage alerts: /alerts
```

**Live Match Discovery:**
```
User:  /live
Bot:   🔴 LIVE MATCHES (3)

       1. 🇦🇷 Argentina 2-1 Brazil 🇧🇷 (67')
          Fee: 3% | Vol: $45K | [Trade]

       2. 🇩🇪 Germany 0-0 France 🇫🇷 (23')
          Fee: 0.3% | Vol: $12K | [Trade]

       3. 🇪🇸 Spain 1-0 England 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (89')
          Fee: 5% | Vol: $89K | [Trade]

       [◀️] [▶️] [Refresh]
```

**Goal Notification (Auto-Push):**
```
⚽ GOAL! Argentina 3-1 Brazil (72')

Scorer: Lionel Messi (penalty)

📊 Market Impact:
Argentina Win: $0.42 (+35%)
Brazil Win: $0.08 (-60%)
Draw: $0.02 (-80%)

⚡ Fee: 3% (Post-Goal Volatility)
⏳ Elevated for 4:12

🏆 Lightning Reflex SBT available for 60s!

[Trade Argentina Win] [Trade Brazil Comeback] [View Match]
```

---

### 3.7 Group Chat Features

When added to a group:
- Pin message showing current live matches
- Auto-update pinned message every 5 minutes
- `/live` command works for all group members
- Goal alerts sent to group (configurable by admin)
- **Anti-spam:** Max 1 auto-alert per minute per group

---

## 4. Smart Contracts — Production Specifications

### 4.1 `WorldCupArenaHook.sol`

**Inheritance:** Must inherit `BaseHook` from Uniswap V4 periphery.

**Hook Permissions** (`getHookPermissions()`):
- `beforeSwap: true` — Dynamic fee logic
- `afterSwap: true` — Value distribution + gamification
- `afterInitialize: true` — Store pool metadata
- `afterAddLiquidity: true` — Track LP positions for gamification

#### State Variables

```
mapping(PoolId => PoolMetadata)                          poolMetadata
mapping(bytes32 => MatchState)                           matchStates
mapping(address => FanTokenState)                        fanTokenStates
mapping(bytes32 => BracketState)                         bracketStates
mapping(address => uint256)                              userXP
mapping(address => uint256)                              userStreak
mapping(address => mapping(bytes32 => uint256))          userMatchVolume
mapping(bytes32 => bytes)                                matchProofs
address                                                  oracle
address                                                  protocolTreasury
bool                                                     paused
```

#### Structs

**`PoolMetadata`:**
```
MarketType marketType  // MATCH_PREDICTION | FAN_TOKEN | META_MARKET
bytes32    matchId
bytes32    tournamentId
address    teamToken
bool       isSettled
```

**`MatchState`:**
```
uint8   homeScore
uint8   awayScore
uint16  minute          // 0–120
uint8   redCards
bool    penaltyShootout
bool    isFinished
uint256 lastGoalTimestamp
uint256 lastUpdateBlock
```

**`FanTokenState`:**
```
uint256 bondingCurveProgress  // 0–10000 basis points
uint256 jackpotBalance
uint256 totalVolume
bool    fundingGoalReached
```

**`BracketState`:**
```
bytes32[] predictedPath   // ordered array of match IDs
uint256   stakeAmount
bool      isValidated
uint256   creationTime
```

#### `beforeSwap` — Dynamic Fee Logic

| Condition | Fee |
|---|---|
| `minute <= 15` (kickoff) | 0.3% |
| Normal play | 1.0% |
| Within 5 minutes of a goal | 3.0% |
| Red card OR `minute >= 90` | 5.0% |
| Penalty shootout | 10.0% |
| Match finished (settlement mode) | 0.0% |
| Fan token, team winning, user selling | 10.0% (panic-sell penalty) |
| Fan token, other conditions | 3.0% |
| Meta-market (bracket/prop) | 1.0% |

Also applies **MEV protection**: `require(block.number >= lastSwapBlock[sender] + 2)`.

#### `afterSwap` — Value Distribution

| Market Type | LP | Protocol | Jackpot | Referral | Tournament |
|---|---|---|---|---|---|
| Match Prediction | 70% | 20% | 10% | — | — |
| Fan Token | 60% | 15% | 20% | 5% | — |
| Meta-Market | 80% | 15% | — | — | 5% |

Also calls `_checkAndMintTrophy(sender, key, meta)`:
- Traded within 60s of goal → mint **Lightning Reflex** SBT (Tier 1)
- Correctly predicted upset → mint **Bronze Nostradamus** (Tier 2)
- Traded 5+ times in one match → mint **Arena Veteran** (Tier 3)

#### `updateMatchState` — Production Oracle Function

```solidity
function updateMatchState(
    bytes32 matchId,
    uint8   homeScore,
    uint8   awayScore,
    uint16  minute,
    uint8   redCards,
    bool    isFinished,
    uint256 timestamp,
    bytes memory signature
) external {
    require(msg.sender == oracle, "Unauthorized oracle");

    bytes32 messageHash = keccak256(abi.encodePacked(
        matchId, homeScore, awayScore, minute, redCards, isFinished, timestamp
    ));
    require(verifyOracleSignature(messageHash, signature), "Invalid signature");

    // Prevent stale or future data
    require(timestamp >= block.timestamp - 300, "Stale data");
    require(timestamp <= block.timestamp + 60,  "Future data");

    MatchState storage state = matchStates[matchId];

    // Prevent score regression
    require(homeScore >= state.homeScore, "Invalid home score");
    require(awayScore >= state.awayScore, "Invalid away score");
    require(minute    >= state.minute || isFinished, "Invalid minute");

    bool goalScored = (homeScore > state.homeScore) || (awayScore > state.awayScore);

    state.homeScore      = homeScore;
    state.awayScore      = awayScore;
    state.minute         = minute;
    state.redCards       = redCards;
    state.isFinished     = isFinished;
    state.lastUpdateBlock = block.number;
    matchProofs[matchId] = signature;

    if (goalScored) {
        state.lastGoalTimestamp = block.timestamp;
        emit GoalScored(matchId, homeScore, awayScore, minute, block.timestamp);
    }

    if (isFinished && !state.isFinished) {
        settleMatch(matchId);
    }

    emit MatchStateUpdated(matchId, homeScore, awayScore, minute, msg.sender, timestamp);
}
```

#### Multi-Oracle Support (Future-Proofing)

```solidity
mapping(address => bool) public authorizedOracles;
uint256 public requiredOracleConfirmations = 1; // Upgrade to 2-of-3 post-launch

function addOracle(address _oracle) external onlyOwner {
    authorizedOracles[_oracle] = true;
}
```

#### Emergency Pause

```solidity
bool public paused;
modifier whenNotPaused() { require(!paused, "Paused"); _; }
function pause()   external onlyOwner { paused = true; }
function unpause() external onlyOwner { paused = false; }
```

---

### 4.2 `OutcomeToken.sol` (ERC-20 with Settlement)

```solidity
contract OutcomeToken is ERC20 {
    address public hook;
    address public usdc;
    bool    public isSettled;
    bool    public isWinner;

    modifier onlyHook() { require(msg.sender == hook, "Only hook"); _; }

    function mint(address to, uint256 amount) external onlyHook {
        _mint(to, amount);
    }

    function settle(bool _isWinner) external onlyHook {
        isSettled = true;
        isWinner  = _isWinner;
    }

    function redeem() external {
        require(isSettled,             "Not settled");
        require(isWinner,              "Not winner");
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0,           "No balance");
        _burn(msg.sender, balance);
        IERC20(usdc).transfer(msg.sender, balance); // 1:1 USDC redemption
    }
}
```

---

### 4.3 `FanToken.sol` (Bonding Curve)

```solidity
contract FanToken is ERC20 {
    uint256 public constant BASE_PRICE  = 0.001 ether; // In USDC (6 decimals)
    uint256 public constant SLOPE       = 0.0001 ether;
    uint256 public constant MAX_SUPPLY  = 1_000_000_000 * 10**6; // 1B tokens

    uint256 public totalMinted;

    function getCurrentPrice() public view returns (uint256) {
        return BASE_PRICE + (totalMinted * SLOPE);
    }

    function buy(uint256 usdcAmount) external {
        uint256 price          = getCurrentPrice();
        uint256 tokensToMint   = (usdcAmount * 10**6) / price;
        require(totalMinted + tokensToMint <= MAX_SUPPLY, "Max supply");

        IERC20(usdc).transferFrom(msg.sender, address(this), usdcAmount);
        _mint(msg.sender, tokensToMint);
        totalMinted += tokensToMint;

        // Auto-deposit 50% to V4 pool when funding goal reached
        if (totalMinted >= MAX_SUPPLY / 2 && !poolCreated) {
            _createV4Pool();
        }
    }

    function sell(uint256 tokenAmount) external {
        // Hook applies dynamic fee; base is 5% before hook adjustment
        uint256 price      = getCurrentPrice();
        uint256 usdcReturn = (tokenAmount * price) / 10**6;
        _burn(msg.sender, tokenAmount);
        totalMinted -= tokenAmount;
        // USDC routing handled by hook's afterSwap
    }
}
```

---

### 4.4 `GoalSwapTrophies.sol` (Soulbound SBT)

**Tiers:**

| Tier | Name | Condition |
|---|---|---|
| 1 | Lightning Reflex | Traded within 60s of a goal |
| 2 | Bronze Nostradamus | 1 correct upset prediction |
| 3 | Silver Prophet | 5 correct in-play trades |
| 4 | Golden Ball Trader | Predicted tournament winner |
| 5 | Arena Legend | Top 100 on all-time leaderboard |

- Inherit ERC-721 with `_beforeTokenTransfer` override blocking all transfers (soulbound)
- Metadata on IPFS with dynamic SVG generation: tier, match details, timestamp
- Only `WorldCupArenaHook` can mint

---

### 4.5 `BracketNFT.sol`

- ERC-721 (transferable, tradable)
- `mint(bytes32[] memory predictedPath)` — takes ordered match predictions from Round of 16 to Final
- Stores prediction hash on-chain
- After tournament: `validate()` checks if path matches actual results
- Correct brackets receive payout from tournament prize pool

---

## 5. Frontend — Real Data Integration

### 5.1 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Web3 | wagmi + viem + RainbowKit |
| Charts | TradingView Lightweight Charts |
| Animations | Framer Motion |
| State | Zustand |
| Build target | Static export → Vercel/IPFS |

---

### 5.2 Data Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   WebSocket  │────▶│  Oracle Node │
│   (Next.js)  │◄────│   (Socket.io)│◄────│  (Real API)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   wagmi/viem │────▶│  X Layer     │
│   (Swaps)    │◄────│  Hook        │
└──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  Telegram    │
│  Mini App    │
│  (Optional)  │
└──────────────┘
```

---

### 5.3 Pages & Routes

#### `/` — Landing Page
- Hero section with live match countdown
- Three pillar cards: Match Markets · Fan Tokens · Meta-Markets
- CTA: Connect Wallet (RainbowKit)
- Footer: contract addresses, X links, docs

#### `/matches` — Match Listing
- Grid of live/upcoming matches (real data from Oracle Redis cache via `GET /api/matches?status=live`)
- Real World Cup 2026 matches from API-Football
- Cards: team flags, live score, minute, current implied odds from pool prices
- Color coding: 🟢 Live · 🟡 Upcoming · ⚫ Finished
- Filter by: Live Now · Today · Upcoming · Finished

#### `/match/[matchId]` — Core Trading Interface

- **Header:** Team A vs Team B, live score, minute, match status
- **Price chart:** Real-time candlestick (TradingView Lightweight Charts). When goal happens, score animates with scale bounce
- **Swap Box:**
  - Dropdown: Select outcome (Team A Win / Draw / Team B Win)
  - Input: USDC amount
  - Display: Expected tokens, current fee %, implied probability
  - Button: "Buy Prediction" → triggers swap through hook
- **Live Fee Indicator:** Current fee % with color:
  - ⚪ Gray → 0.3% Standard Play
  - 🟡 Yellow → 1.0% Normal
  - 🟠 Orange → 3.0% Post-Goal Volatility
  - 🔴 Red → 5.0% Red Card / Final Minutes
  - 🟣 Purple → 10.0% Penalty Shootout
- **Event Timeline:** Goals, red cards, substitutions. Click event to see fee at that moment
- **Countdown timer** if post-goal: "Elevated fee for 4:32 more"
- **Recent Activity:** Real swaps with addresses, amounts, fees, timestamp. Auto-scrolls

#### `/tokens` — Fan Token Marketplace
- Real country tokens with live prices from V4 pools
- "Team Form" indicator: last 3 match results (W/W/L) from API-Football
- "Next Match" countdown per team
- Live jackpot vault balance from contract

#### `/brackets` — Tournament Meta-Markets
- Real World Cup 2026 bracket (48 teams, 12 groups)
- Group standings from API-Football
- "Group Winner" tokens: trade on which team wins each group
- "Top Goalscorer" market: player list with real season stats from Sportmonks
- Bracket minting: click through Round of 16 → Final, pay USDC, mint NFT

#### `/profile` — User Dashboard
- Active positions: match predictions, fan tokens, bracket NFTs
- PnL summary: realized + unrealized
- Trophy cabinet: grid of SBT NFTs with tier badges
- Streak counter: 🔥 5 Day Trading Streak
- Referral link: copy + invitee stats

#### `/leaderboard` — Global Rankings
- Tabs: Match Leaders · Fan Token Traders · Bracket Masters · All-Time XP
- Columns: Rank, Address, Volume, PnL, Trophies, XP
- Top 3 highlighted with gold/silver/bronze styling

---

### 5.4 Custom React Hooks

#### `useLiveMatch(matchId)`
- Connects to Socket.io room `match:{matchId}` on mount
- Maintains: `matchState`, `feeTier`, `priceHistory`, `recentTrades`
- On `goal:scored`: Plays sound effect, shows confetti animation, flashes fee indicator
- On `fee:changed`: Animates fee number with color transition (green → yellow → red)
- Cleanup: Disconnects socket on unmount

#### `usePoolPrice(poolKey)`
- Polls `PoolManager.slot0` every 5 seconds for price
- Calculates implied probability: `impliedProb = tokenPrice / (tokenPrice + otherTokenPrice)`
- Computes edge: `edge = impliedProb - historicalProb`

---

### 5.5 Key UI Components

**`MatchCard`** — Responsive card, min-width 280px. Live indicator: pulsing red dot. Odds display: three progress bars (Team A / Draw / Team B) showing pool price ratios.

**`SwapBox`** — Similar to Uniswap UI but adds:
- "Fee Impact" row: current dynamic fee %
- "Implied Probability" row: e.g. "Pool implies 35% chance"
- "Risk Score" badge: Low / Medium / High based on time remaining + score deficit

**`LiveFeeTicker`** — Fixed position, shows current fee %, reason string, countdown to fee reset. Fee number pulses when it changes.

**`TrophyMintModal`** — Auto-triggered when hook mints trophy. Framer Motion scale-in animation. Shows: trophy tier, match details, XP gained, share-to-X button.

---

### 5.6 Mobile Requirements
- All pages fully responsive
- Swap box thumb-friendly (large tap targets)
- PWA manifest for "Add to Home Screen"
- Bottom nav bar: Matches · Tokens · Brackets · Profile

---

### 5.7 Notification System

**`NotificationProvider`** (React Context) — Browser push via Service Worker:

| Type | Trigger |
|---|---|
| `GOAL` | Subscribed match scored |
| `FEE_SPIKE` | Fee crossed user alert threshold |
| `SETTLEMENT` | Position settled |
| `TROPHY` | New SBT earned |

---

## 6. AI Agent — X Bot + In-App

### 6.1 X Bot: `@GoalSwapAgent`

**Stack:** Python — Tweepy + OpenAI API (GPT-4 mini)

**Auto-posting** every 15 minutes during live matches:
```
67' ARG 2-1 BRA. Argentina Win token surged +40%.
Current fee: 3%. Implied prob: 68%.
Historical comeback rate for 1-goal deficit at 67': 12%.
Trade: [link]
```

**Reply handler** — When @mentioned:
1. Parse question intent (buy suggestion, odds explanation, match status)
2. Query current pool state from indexer
3. Query match state from oracle
4. Generate response with GPT-4 mini
5. Include direct swap link to frontend

**Hashtag strategy:** `#WorldCup2026 #GoalSwap #XLayer #UniswapV4`

### 6.2 In-App AI Suggestions

On match detail page, show **"AI Insight"** card:
```
Argentina is 1-0 down at 55'. Historically, they equalize
23% of the time in this situation. 'Argentina Win' token
trades at $0.31 (implied 31%). Edge: +6%.
```

**Auto-Trade feature (advanced):**
- User sets rule: "If Team A goes 1-0 down at 60+ minutes, buy $50 of Team A Win token"
- Backend monitors oracle; when condition met, executes swap via smart wallet delegation

---

## 7. Indexer & Analytics

### 7.1 The Graph Subgraph

Index all events from: `WorldCupArenaHook`, `OutcomeTokenFactory`, `FanTokenLauncher`, `GoalSwapTrophies`, `BracketNFT`.

```graphql
type Swap @entity {
  id:          ID!
  pool:        Pool!
  sender:      Bytes!
  amountIn:    BigInt!
  amountOut:   BigInt!
  feeTier:     Int!
  feeReason:   String!
  match:       Match!
  timestamp:   Int!
  blockNumber: Int!
}

type Match @entity {
  id:         ID!
  homeTeam:   String!
  awayTeam:   String!
  homeScore:  Int!
  awayScore:  Int!
  minute:     Int!
  status:     String!
  feeTier:    Int!
  pools:      [Pool!]!
  swaps:      [Swap!]!
  volumeUSD:  BigDecimal!
}

type User @entity {
  id:            ID! # wallet address
  totalVolumeUSD: BigDecimal!
  totalPnL:      BigDecimal!
  xp:            Int!
  streak:        Int!
  trophies:      [Trophy!]!
  swaps:         [Swap!]!
}
```

### 7.2 REST API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/matches` | All matches from Redis cache |
| `GET /api/match/:matchId` | Detailed match state + pool data |
| `GET /api/pool/:poolId/price` | Current token price + implied probability |
| `GET /api/leaderboard/:type` | `volume` / `pnl` / `streak` / `trophies` |
| `GET /api/user/:address` | Portfolio summary |
| `GET /api/stats/global` | Total volume, active users, fees generated |

---

## 8. Security & Monitoring

### 8.1 Oracle Security
- **Multi-sig oracle wallet:** 2-of-3 signers for contract ownership changes
- **Rate limiting:** Max 1 update per match per 15 seconds
- **Sanity checks:** Scores cannot decrease, minute must advance, max score sanity check
- **Downtime alerts:** If no update for 5 minutes during live match, page admin
- **Fallback oracle:** Secondary node on different server/provider

### 8.2 Contract Security
- Use `ReentrancyGuard` on all external functions (OpenZeppelin)
- Use `SafeERC20` for all token transfers
- `emergencyWithdraw` for stuck tokens (owner only, 24h timelock)
- Run **Slither + Mythril** scan before mainnet deployment
- Bug bounty: $1,000 for critical findings post-launch

### 8.3 Monitoring Stack

| Tool | Purpose |
|---|---|
| Datadog / Grafana | Oracle latency, tx success rate, gas costs |
| Sentry | Frontend error tracking |
| PagerDuty | Critical alerts (oracle down, contract paused, gas spikes) |
| Telegram admin channel | Real-time bot + oracle status |

---

## 9. Deployment Infrastructure

| Service | Provider | Specs |
|---|---|---|
| Frontend | Vercel | Pro plan, edge caching |
| Oracle Node | AWS EC2 | t3.medium, low-latency region |
| WebSocket | AWS EC2 + ELB | Separate instance, horizontal scaling |
| Database | Railway / Supabase | PostgreSQL, daily backups |
| Redis | Upstash | Serverless, global replication |
| Subgraph | The Graph Studio | Hosted service |
| Telegram Bot | AWS Lambda | Serverless, auto-scaling |

---

## 10. Environment Variables

```env
# Oracle
API_FOOTBALL_KEY=your_key
SPORTSDB_KEY=your_key
ORACLE_PRIVATE_KEY=0x...
X_LAYER_RPC=https://rpc.xlayer.tech

# Contract Addresses
HOOK_CONTRACT=0x...
OUTCOME_FACTORY=0x...
FAN_TOKEN_LAUNCHER=0x...
TROPHY_NFT=0x...
BRACKET_NFT=0x...

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_ID=your_telegram_id

# Frontend
NEXT_PUBLIC_HOOK_ADDRESS=0x...
NEXT_PUBLIC_WS_URL=wss://ws.goalswap.xyz
NEXT_PUBLIC_API_URL=https://api.goalswap.xyz
ANTHROPIC_API_KEY=... # server-side only via Next.js API route
```

---

## 11. File Structure

```
goalswap-arena/
├── contracts/
│   ├── WorldCupArenaHook.sol       ← THE HOOK (main innovation)
│   ├── OutcomeTokenFactory.sol
│   ├── FanTokenLauncher.sol
│   ├── GoalSwapTrophies.sol
│   ├── BracketNFT.sol
│   └── interfaces/
│       └── IWorldCupArenaHook.sol
├── frontend/
│   ├── app/
│   │   ├── page.tsx                ← Landing
│   │   ├── matches/page.tsx
│   │   ├── match/[matchId]/page.tsx
│   │   ├── tokens/page.tsx
│   │   ├── brackets/page.tsx
│   │   ├── profile/page.tsx
│   │   └── leaderboard/page.tsx
│   ├── components/
│   │   ├── MatchCard.tsx
│   │   ├── SwapBox.tsx
│   │   ├── LiveFeeTicker.tsx
│   │   ├── TrophyMintModal.tsx
│   │   ├── FanTokenCard.tsx
│   │   ├── BracketTree.tsx
│   │   └── LeaderboardTable.tsx
│   ├── hooks/
│   │   ├── useMatchState.ts
│   │   ├── usePoolMetadata.ts
│   │   └── useSwap.ts
│   └── lib/
│       ├── contracts.ts            ← ABIs + addresses
│       └── oracle.ts
├── oracle-service/
│   ├── src/
│   │   ├── index.ts                ← Oracle server
│   │   ├── DataFetcher.ts
│   │   ├── StateValidator.ts
│   │   ├── BlockchainWriter.ts
│   │   ├── RedisCache.ts
│   │   ├── websocket-server.ts
│   │   └── webhook-server.ts
│   └── package.json
├── telegram-bot/
│   ├── src/
│   │   ├── index.ts                ← Bot entry point
│   │   ├── commands.ts             ← All command handlers
│   │   ├── notifications.ts        ← Push alert service
│   │   └── db.ts                   ← PostgreSQL schema + queries
│   └── package.json
├── ai-agent/
│   ├── bot.py                      ← X bot (Tweepy + OpenAI)
│   └── requirements.txt
├── indexer/
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/mappings.ts
└── README.md
```

---

## 12. Implementation Order (Priority Queue)

### Phase 1 — Hook Contract (Days 1–2)
1. Set up Foundry project with `v4-periphery` dependency
2. Write `WorldCupArenaHook.sol` — all state variables, structs, `beforeSwap`/`afterSwap`
3. Write `OutcomeTokenFactory.sol`
4. Write Foundry tests for hook fee calculations
5. Deploy to X Layer testnet. Verify contracts

### Phase 2 — Oracle + Backend (Days 3–4)
1. Build `oracle-service` with API-Football polling + TheSportsDB fallback
2. Implement `StateValidator` and `BlockchainWriter`
3. Connect oracle to hook contract
4. Build WebSocket server for frontend real-time updates
5. Build `webhook-server` for Telegram push bridge
6. Test end-to-end: real goal → oracle updates → hook fee changes → frontend receives WS event

### Phase 3 — Frontend Core (Days 5–6)
1. Scaffold Next.js 14 + RainbowKit + wagmi
2. Build `/matches` with live match cards
3. Build `/match/[matchId]` with `SwapBox` + `LiveFeeTicker`
4. Connect swap to hook contract via wagmi
5. Add mobile responsiveness + PWA manifest

### Phase 4 — Telegram Bot + NFTs (Days 7–8)
1. Deploy `GoalSwapTrophies.sol` and `BracketNFT.sol`
2. Build `telegram-bot` service with all commands
3. Connect Telegram notifications to webhook bridge
4. Build `/profile` with trophy cabinet
5. Build `/brackets` with visual bracket tree
6. Implement X sharing + shareable trophy cards

### Phase 5 — AI + Polish (Days 9–10)
1. Build `@GoalSwapAgent` Python X bot
2. Add AI suggestion cards to match detail page
3. Deploy The Graph subgraph
4. Record demo video
5. Final testing: simulate full match lifecycle (pre-match → goal → red card → settlement → trophy mint)
6. Submit

---

## 13. Demo Video Script (90 seconds)

| Time | Scene |
|---|---|
| 0–10s | "5 billion people will watch the World Cup. Most will just watch. A few will trade it." |
| 10–25s | Show live match. Argentina scores. Fee jumps from 1% → 3% in real-time |
| 25–40s | One-click buy "Argentina Win" token. Wallet confirmation. Token appears in portfolio |
| 40–55s | Show fan token page. $ARG token. Jackpot vault. "When Argentina wins, sellers pay 10%" |
| 55–70s | Show bracket NFT minting. "Predict the entire tournament path. Mint it. Trade it." |
| 70–85s | Trophy auto-mints. "Proof you called it before anyone else." |
| 85–90s | "GoalSwap Arena. Built on X Layer. Powered by Uniswap V4 Hooks. Trade the Cup." |

---

## 14. X (Twitter) Posting Schedule

> **Required tags on every post:** `@XLayerOfficial @Uniswap @flapdotsh`

| Day | Post |
|---|---|
| 1 | Announce project + architecture diagram thread |
| 3 | Video: real oracle updating hook fee after API-Football goal event |
| 5 | Frontend reveal: mobile screen recording of one-click swap |
| 7 | Bracket league creation tutorial |
| 9 | Demo video (1–3 min) + submission thread |
| 10 | Final submission confirmation + Google Form screenshot |

---

## 15. Submission Checklist

- [ ] `WorldCupArenaHook.sol` deployed on X Layer with real oracle integration
- [ ] Oracle node running on AWS with API-Football + TheSportsDB fallback
- [ ] WebSocket server broadcasting real match updates
- [ ] Next.js frontend live on Vercel with real match data
- [ ] `@GoalSwapArenaBot` live on Telegram with all commands working
- [ ] The Graph subgraph indexing all hook events
- [ ] Demo video: real data → oracle update → fee change → Telegram alert → user trade → trophy mint
- [ ] X account active with `@XLayerOfficial @Uniswap @flapdotsh` tags
- [ ] Google Form submitted before **May 28, 23:59 UTC**
- [ ] GitHub repo public with comprehensive README including all contract addresses

---

## 16. Critical Design Decisions

| Decision | Rationale |
|---|---|
| Real sports API (no mock) | Production credibility; API-Football free tier sufficient for hackathon |
| USDC as base currency | All pools settle in USDC — simple, no native token price risk |
| Soulbound trophies are free to mint | Protocol pays gas — maximizes adoption and social sharing |
| Fan tokens use bonding curves | Natural price discovery and early-adopter rewards |
| Bracket NFTs are transferable | Creates secondary market activity and additional LP fees |
| Oracle signatures on-chain | Prevents replay attacks; enables on-chain dispute resolution |
| Testnet deployment is sufficient | Mainnet is bonus — focus on demonstrability, not mainnet gas costs |
| Multi-oracle architecture (1-of-1 now) | Start with single oracle, upgrade path to 2-of-3 multi-sig post-hackathon |

---

*Copy this entire document into your AI agent. It contains every contract interface, page route, component spec, oracle architecture, Telegram bot command, and deployment step needed to build GoalSwap Arena from zero to submission-ready.*