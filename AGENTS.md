# Mobile-First ASCII Hacker Casino — AGENTS.md

## Project Overview
- Purpose: A mobile-first, offline-capable, retro terminal-style casino experience with a neon green on black aesthetic.
- Theme: ASCII hacker/terminal UI with scanlines, glow, and blocky panel layout.
- UX goals:
  - Fast, tap-friendly gameplay on phones (portrait primary).
  - Multiple game terminals on the home page (Blackjack, Slots, Video Poker), with a separate weekly leaderboard page.
  - Clear, high-contrast readouts for score/bankroll and game state.
  - A fixed HUD with a scrolling ticker banner above it.

## Tech Stack
- Languages: HTML5, CSS3, Vanilla JavaScript (no frameworks).
- Storage: `localStorage` via a single key (`casino_state_v1`).
- Runtime assumptions:
  - Works as static files in any modern browser.
  - Uses global scripts (not ES modules) to support direct `file://` usage.
- Hosting assumptions:
  - Static hosting only (no server or build step required).

## Visual / Design Rules
- Global palette:
  - Background: `#000000` (black) with subtle radial green gradients.
  - Primary neon green: `#00ff66` for most text, borders, and buttons.
  - Score value color: yellow `#ffd000` with glow.
  - Result colors: win = gold (`#ffcc33`), loss = red (`#ff3344`), push = white (`#ffffff`).
- Typography:
  - Monospace terminal stack: `SFMono-Regular, Menlo, Consolas, "Courier New", monospace`.
  - Uppercase headers and labels; small pixel-like sizes (12px for labels and headers).
- Scanlines + glow:
  - `body::before` adds scanlines via `repeating-linear-gradient` and `mix-blend-mode: screen`.
  - Text glow via `text-shadow`.
- Panels:
  - `.panel` uses a green border, dark translucent background, and inset glow.
  - Panel headers are uppercase and slightly letter-spaced.
- Ticker:
  - `#ticker` is fixed at the top, above the HUD, with a looping scroll animation.
  - Height is controlled by `--ticker-height` (32px mobile, 40px desktop).
  - Ticker uses the same neon/scanline aesthetic and a CSS keyframe loop.
- HUD rules:
  - Top-left label: `SCORE` (green).
  - Top-left value: yellow `#ffd000` with yellow glow.
  - Buttons are green; hover inverts to green background and dark text.
  - Button taps are optimized for mobile: `touch-action: manipulation` + `user-select: none`.
- Layout constraints:
  - The blackjack terminal auto-sizes to its content; no internal scrolling is expected.
  - The overall page may scroll if the terminal grows on small screens.
  - Actions grid is 2 columns on mobile and 4 columns at `min-width: 720px`.
  - Card faces are bold; borders remain normal weight.
  - Mobile card layout wraps to multiple rows when needed; desktop keeps cards on a single row.

## Architecture
- Global modules (no bundler):
  - `window.CasinoState` exposes state management functions.
  - `window.CasinoSettlement` exposes shared payout/settlement helpers.
  - `window.BlackjackGame` exposes `initBlackjack` to wire gameplay to the DOM.
  - `window.SlotsGame` exposes `initSlots` to wire gameplay to the DOM.
  - `window.VideoPokerGame` exposes `initVideoPoker` to wire gameplay to the DOM.
- Initialization flow:
  - `index.html` loads `js/core/state.js`, `js/core/settlement.js`, game scripts, then `js/app.js`.
  - `js/app.js`:
    - Boots the state layer via `loadState()`.
    - Wires the Save Score modal.
    - Initializes blackjack, slots, and video poker via their `init*` functions.
    - Updates the HUD bankroll and listens for `bankroll:change` events.
- Leaderboard flow:
  - `leaderboard.html` loads `js/core/state.js` and `js/leaderboard.js`.
  - `js/leaderboard.js` reads state and renders the leaderboard list.
- Card rendering:
  - Card ASCII is rendered as HTML spans (`.ascii-card`) with `<br>` line breaks.
  - Ranks/suits are wrapped in `.card-face` for bolding.
  - Card container is a flex row; on mobile it wraps to multiple rows.
- Status rendering:
  - Status uses `innerHTML` to colorize win/loss/push labels.
  - Settlement messaging is unified and includes WAGER/PAYOUT/NET or BET RETURNED.

## File Structure
- `index.html`
  - Home page with HUD, blackjack panel, betting controls, action buttons, and the Save Score modal.
  - Links to `leaderboard.html` from the HUD.
- `leaderboard.html`
  - Leaderboard-only page with the same HUD and a single leaderboard panel.
- `css/styles.css`
  - All styling: neon terminal UI, scanlines, layout, and button states.
- `js/core/state.js`
  - State storage and persistence logic.
  - Exposes `CasinoState` global API.
- `js/core/settlement.js`
  - Shared payout helpers: `computeSettlement` and `formatSettlementMessage`.
  - Exposes `CasinoSettlement` global API.
- `js/games/blackjack.js`
  - Blackjack game logic and DOM wiring.
  - Exposes `BlackjackGame.initBlackjack`.
- `js/games/slots.js`
  - Slots game logic and DOM wiring.
  - Exposes `SlotsGame.initSlots`.
- `js/games/video-poker.js`
  - Video Poker (Jacks or Better) logic and DOM wiring.
  - Exposes `VideoPokerGame.initVideoPoker`.
- `js/app.js`
  - Home page bootstrap, Save Score modal logic, bankroll updates.
- `js/leaderboard.js`
  - Leaderboard page rendering logic.
- `.DS_Store`
  - macOS metadata (not used by the app).

## Gameplay Logic
- Betting flow:
  - Chip buttons (`$5/$10/$25/$50`) add to the total bet.
  - Each chip tap immediately deducts the chip amount from the bankroll (reserved bet).
  - The bet amount is shown in `#bet-display`.
- Blackjack:
  - `DEAL` starts a hand only if a bet is > 0 and the game is idle/roundOver.
  - On deal, the deck is freshly shuffled and both dealer and player get two cards.
  - `HIT` draws a card. If player value > 21, player busts.
  - `STAND` ends player turn and triggers dealer AI.
  - Dealer draws until total >= 17 (stands on soft 17).
  - Dealer value display shows visible card total during player turn; full total after reveal.
  - Payout multipliers: blackjack 2.5x, win 2x, push 1x, loss 0x.
  - `NEW HAND` clears the table and refunds any reserved bet if no hand is in progress.
- Slots:
  - Three reels with weighted symbols: `7`, `B`, `X`, `*`, `$`.
  - `SPIN` triggers animation; reels stop left-to-right with staggered timing.
  - Payout multipliers: 3 match = 5x, 2 match = 2x, no match = 0x.
- Video Poker (Jacks or Better):
  - `DEAL` draws 5 cards; player toggles HOLD; `DRAW` replaces non-held cards.
  - Hand evaluation order: Royal Flush → Straight Flush → Four Kind → Full House → Flush → Straight (A-2-3-4-5 allowed) → Three Kind → Two Pair → Jacks or Better → Loss.
  - Payout multipliers: Royal 250x, Straight Flush 50x, Four Kind 25x, Full House 9x, Flush 6x, Straight 4x, Three Kind 3x, Two Pair 2x, Jacks or Better 1x.
  - Inline console.assert tests run on load to validate hand evaluation.
- Settlement messaging:
  - All games use `CasinoSettlement` to compute wager/payout/net.
  - Status line includes WAGER/PAYOUT/NET or BET RETURNED for 1x outcomes.

## Persistence + Data Handling
- Storage key: `casino_state_v1` in `localStorage`.
- Stored state shape:
  - `bankroll`: number (rounded to 0.1 via `setBankroll`).
  - `seeded`: boolean (used once to seed bankroll).
  - `username`: string.
  - `emoji`: string.
  - `leaderboard`: array of `{ name, emoji, score, ts }`.
  - `leaderboardWeekId`: string, e.g. `2026-W05`.
- Seeding behavior:
  - Default bankroll is `1000`.
  - On first load or if `seeded` is false, bankroll is set to 1000 if <= 0.
- Weekly leaderboard reset:
  - Week ID uses ISO week logic computed in UTC.
  - If stored week ID differs from current, leaderboard resets to empty.
- Leaderboard logic:
  - Entries are sorted by `score` (desc), then timestamp (desc).
  - Top 10 entries are retained.
- Eventing:
  - `bankroll:change` is dispatched via `CustomEvent` when available, with an older `document.createEvent` fallback.

## Development Rules
- Do not convert scripts back to ES modules. The app relies on global scripts for `file://` compatibility.
- Preserve the `casino_state_v1` schema and existing keys to avoid breaking saved data.
- Keep `window.CasinoState`, `window.CasinoSettlement`, and game globals as integration points.
- Preserve the neon terminal aesthetic, scanlines, and panel layout.
- Keep the score value yellow in the HUD. It is a key visual emphasis element.
- Keep suits as ASCII letters (`S/H/D/C`) unless the UI explicitly changes.
- Do not remove the weekly reset behavior in `state.js` without a migration plan.
- Do not reintroduce fixed heights or internal scrolling in the blackjack panel.
- Keep card HTML structure (`.ascii-card` + `.card-face`) to preserve mobile wrapping and bold faces.
- Use the shared settlement helper for all payout/status messaging to avoid `+$0` inconsistencies.

## Local Development + Deployment
- Local run:
  - Open `index.html` directly in a browser (no build step).
  - `leaderboard.html` is a separate page for scores.
- Testing:
  - Manual testing only. Verify bet accumulation, deduction, deal flow, and payouts.
  - Check leaderboard saving and weekly reset behavior.
- Deployment:
  - Static hosting only (e.g., GitHub Pages, Netlify, S3).
  - No server-side dependencies or build tools required.

## Known Limitations / Future Expansion Areas
- Limitations (current behavior):
  - Only blackjack, slots, and video poker are implemented.
  - Deck is reshuffled for every hand (no shoe or persistence).
  - Leaderboard is local to the browser (not shared across devices).
  - Weekly reset uses UTC week and only runs on load.
  - No sound, no animations beyond CSS hover and scanlines.
- Expansion hints from structure:
  - `window.CasinoState` centralizes bankroll/leaderboard for additional games.
  - Additional games can be added as new scripts that follow the `initGame({ rootEl, state })` pattern.
