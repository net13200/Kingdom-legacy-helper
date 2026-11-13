# Kingdom Ledger

**Part of [SugiGames](https://net13200.github.io/SugiGames/)**, the Sugi (杉, Japanese for cedar) family of calm little games and helpers. Like the other Sugi apps, it opens with the 杉 kanji painted stroke by stroke (tap to skip), and it lives on the SugiGames portal under **Game night**.

Kingdom Ledger is a bookkeeping companion for the solo legacy card game *Kingdom Legacy: Feudal Kingdom* (FryxGames). It keeps count for you: resources, deck, turns and rounds. It never makes decisions for you and never shows anything about cards you haven't discovered. There is no card database or card text in the app.

Live: https://net13200.github.io/Kingdom-legacy-helper/

Unofficial fan-made helper. *Kingdom Legacy* is © FryxGames.

## What it does (Phase 1: turn screen)

- **Resources**: Coin, Metal, Wood, Stone, Sword, Trade Good, with big − / + buttons and **Clear all**. Add custom resources for expansions from the menu.
- **Turn buttons**: **New turn (play 4)**, **Advance (+2)**, **Upgrade** and **Pass**. Each one clears your resources automatically (new cards entered play, or the turn ended) and says so in a short message.
- **Deck counter**: enter the deck size at the start of the round. The app takes 4 per turn and 2 per Advance, plays fewer when fewer are left, and warns **Last turn of the round** when the deck runs out.
- **End-of-turn checklist**: end-of-turn effects → discard (except cards that stay in play) → new turn or end of round. When the deck is empty, the end-of-round steps appear with a **Start round N** button.
- **Undo / redo** for every action (50 steps, the last 30 survive closing the app).
- **Saves automatically** on the device after every change. **Export / import** the whole campaign as a JSON backup from the menu.
- Dark mode by default, light mode in the menu. Works fully offline once opened.

Coming next, one phase at a time: round and discovery tracker, kingdom log, rules reference, campaigns.

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
  - `history.ts`: the undo / redo stack.
  - `backup.ts`: backup format, validation and repair of saved data.
  - `defaults.ts`, `types.ts`: starting values and the data model.
- `src/components/`: the turn screen, the menu and the toast.
- `src/sw-template.js`: the offline service worker. The build fills in the list of files to cache.
- `public/splash.js`: the SugiGames intro animation, shared with the portal.
