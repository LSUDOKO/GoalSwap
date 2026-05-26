@AGENTS.md

You are building **GoalSwap Arena** — a real-data World Cup trading platform on X Layer with Uniswap V4 Hooks, Telegram + X integration.

## Project truth
- All specs, architecture, contracts, routes, and UI components are in `about.md` — read it first.
- `AGENTS.md` contains the build rules and implementation order.
- This is a fresh Next.js 16.2.6 scaffold — everything must be built from scratch.
- No mock data. Every match event must flow real-world → oracle → hook → frontend → notification.

## Critical rules
1. **Never use mock/fake data.** Real sports APIs (API-Football, TheSportsDB, Sportmonks) or real contract calls.
2. **Follow the file structure in `about.md:974` exactly.** Create every file listed.
3. **Implementation order matters.** Phase 1 → Phase 5 per `about.md:1037`.
4. **Next.js 16 has breaking changes.** Read `node_modules/next/dist/docs/` before writing any code.
5. **Tailwind v4** — use `@tailwindcss/postcss` (already installed), different from v3 config.
6. **Keep it concise.** No explanatory comments in code unless absolutely necessary.
7. **Verify with `npm run build` / `npm run lint`** after each major change.
