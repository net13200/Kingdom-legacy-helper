# Kingdom Ledger

**Part of [SugiGames](https://net13200.github.io/SugiGames/)**, the Sugi (杉, Japanese for cedar) family of calm little games and helpers. Like the other Sugi apps, it opens with the 杉 kanji painted stroke by stroke (tap to skip), and it lives on the SugiGames portal under **Game night**.

Kingdom Ledger is a bookkeeping companion for the solo legacy card game *Kingdom Legacy: Feudal Kingdom* (FryxGames). It keeps count for you: resources, deck, turns and rounds. It never makes decisions for you and never shows anything about cards you haven't discovered. There is no card database or card text in the app.

Live: https://net13200.github.io/Kingdom-legacy-helper/

Unofficial fan-made helper. *Kingdom Legacy* is © FryxGames.

## What it does

Five tabs, all offline, all saved on the device after every change, with undo / redo for every action (50 steps; the last 30 survive closing the app).

**Turn**
- Resources (Coin, Metal, Wood, Stone, Sword, Trade Good, plus custom ones for expansions) with big − / + buttons and **Clear all**.
- **New turn (play 4)**, **Advance (+2)**, **Upgrade**, **Pass** and **Time effect**. Each one that brings in cards or ends the turn clears your resources and says so.
- Deck counter: 4 per turn, 2 per Advance, fewer when fewer are left, a **Last turn of the round** warning at 0, and −1 / +1 for effects that move cards onto or off the deck.
- End-of-turn and end-of-round checklists, then **Start round N** (or scoring after the final round).

**Rounds**
- Current round, **Discover next: #X and #Y**, and "Was #X a parchment card?" (a parchment card is the only card discovered that round, and is destroyed).
- Reset-window status (open until #23 is discovered, with the cards to set aside), a countdown to #70 and a **FINAL ROUND** banner.
- An editable discovery counter, "discovered by a card effect", and round history with notes.

**Kingdom**: a log you fill in yourself as you discover cards (nothing is pre-filled): serial, name, type, keywords, orientation, status, resource stickers, other stickers, marked checkboxes, crossed-out one-time effects, equipment, fame and notes. Filter by status or type, search by name or number. Running fame, purged fame and score preview.

**Rules**: your own notes in one file, `src/content/rules.md` (placeholders for now), plus a link to the official rules PDF.

**Campaign**: kingdom name and code, save slots, score (kingdom fame + purged fame) and the base-game score, the expansion tracker (up to 10, each once, score after each, purge steps), and the purge helper (purge 12, purge 1 permanent card, running purged fame).

**Menu**: dark / light mode, custom resources, JSON export / import.

The app never shows anything about cards you haven't discovered: there is no card data in it.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (add --host to open it from your phone on the same Wi-Fi)
npm test           # unit tests for the game logic (Vitest)
npm run build      # production build in dist/
npm run preview    # serve the production build, offline mode included
```

The service worker (offline support) only runs in the production build, so test offline with `npm run build && npm run preview`.

## Install it on an iPhone

1. Open the live link in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open Kingdom Ledger from the home screen. It runs full screen and works offline.

Your data stays on that phone, in that home-screen app. Use **Menu → Export JSON** now and then to keep a backup (save it to Files or send it to yourself), and **Import JSON** to restore it or move it to another device.

## Deploy it for free

### GitHub Pages (set up already)

`.github/workflows/deploy.yml` builds, tests and publishes the app on every push to `main`.

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow by hand from the **Actions** tab).

The app is then at `https://<user>.github.io/Kingdom-legacy-helper/`. It uses relative paths, so it works under any folder name.

### Netlify

Drag the `dist/` folder onto https://app.netlify.com/drop, or connect the repository with build command `npm run build` and publish directory `dist`.

## How the code is organised

- `src/logic/`: all game rules as pure functions, with Vitest tests next to them.
  - `turn.ts`: resources, deck counting, turn and round flow.
  - `discovery.ts`: discovery order, parchment cards, the reset window and the final round.
  - `kingdom.ts`: the card log, fame and score.
  - `purge.ts`, `expansions.ts`, `campaigns.ts`: purges, expansions and save slots.
  - `history.ts`: the undo / redo stack.
  - `backup.ts`: backup format, validation, and upgrading older saves.
  - `markdown.ts`: the small Markdown reader for the rules notes.
  - `defaults.ts`, `types.ts`: starting values and the data model.
- `src/components/`: one file per tab, plus the card editor, menu and toast.
- `src/content/rules.md`: your rules notes.
- `src/sw-template.js`: the offline service worker. The build fills in the list of files to cache.
- `public/splash.js`: the SugiGames intro animation, shared with the portal.
