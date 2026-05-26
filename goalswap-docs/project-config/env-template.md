# GoalSwap Environment Variables

> Complete `.env` template for local development and deployment.

## Full Env Template

Copy this to your project root `.env` file:

```env
# ── Oracle ──────────────────────────────────────────────
API_FOOTBALL_KEY=your_key
SPORTSDB_KEY=your_key
ORACLE_PRIVATE_KEY=0x...
X_LAYER_RPC=https://rpc.xlayer.tech
X_LAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon

# ── Contract Addresses ─────────────────────────────────
HOOK_CONTRACT=0x...
OUTCOME_FACTORY=0x...
FAN_TOKEN_LAUNCHER=0x...
TROPHY_NFT=0x...
BRACKET_NFT=0x...

# ── Telegram ───────────────────────────────────────────
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_ID=your_telegram_id

# ── Frontend ──────────────────────────────────────────
NEXT_PUBLIC_HOOK_ADDRESS=0x...
NEXT_PUBLIC_WS_URL=wss://ws.goalswap.xyz
NEXT_PUBLIC_API_URL=https://api.goalswap.xyz
ANTHROPIC_API_KEY=sk-ant-...     # server-side only via Next.js API route

# ── X (Twitter) Bot ───────────────────────────────────
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_TOKEN_SECRET=...
OPENAI_API_KEY=sk-...

# ── Database ──────────────────────────────────────────
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# ── The Graph ──────────────────────────────────────────
SUBGRAPH_API_KEY=...

# ── X Layer ──────────────────────────────────────────
XLAYER_MAINNET_RPC=https://rpc.xlayer.tech
XLAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon
XLAYER_MAINNET_CHAIN_ID=196
XLAYER_TESTNET_CHAIN_ID=1952

# ── OKX Onchain OS (optional) ─────────────────────────
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
```

## Where to Get Keys

| Service | URL |
|---------|-----|
| API-Football | [https://www.api-football.com/](https://www.api-football.com/) |
| TheSportsDB | [https://www.thesportsdb.com/](https://www.thesportsdb.com/) |
| Sportmonks | [https://www.sportmonks.com/](https://www.sportmonks.com/) |
| Telegram Bot | [https://t.me/BotFather](https://t.me/BotFather) |
| X/Twitter Dev | [https://developer.twitter.com/](https://developer.twitter.com/) |
| OpenAI | [https://platform.openai.com/](https://platform.openai.com/) |
| OKX Dev Portal | [https://web3.okx.com/onchainos/dev-portal](https://web3.okx.com/onchainos/dev-portal) |

## Security

- **Never** commit `.env` to git — add to `.gitignore`
- Use `.env.local` for Next.js secrets (auto-ignored by Next.js)
- Store production secrets in Vercel Environment Variables
