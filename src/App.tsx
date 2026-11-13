import { useEffect, useState } from "react";
import { useLedger } from "./useLedger";
import { loadTheme, saveTheme } from "./logic/storage";
import type { Theme } from "./logic/types";
import { TurnScreen } from "./components/TurnScreen";
import { Menu } from "./components/Menu";
import { ToastView } from "./components/ToastView";

export default function App() {
  const store = useLedger();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#16131d" : "#f6f1e7");
    saveTheme(theme);
  }, [theme]);

  const { campaign } = store;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Kingdom Ledger</h1>
          <p className="topbar-sub">
            {campaign.name} · Round {campaign.round.number}
            {campaign.turn.number > 0 && <> · Turn {campaign.turn.number}</>}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={store.undo}
          aria-disabled={!store.canUndo}
          aria-label={store.undoLabel ? `Undo: ${store.undoLabel}` : "Undo (nothing to undo)"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menu and settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <main className="content">
        <TurnScreen campaign={campaign} act={store.act} />
      </main>

      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        theme={theme}
        setTheme={setTheme}
        store={store}
      />
      <ToastView toast={store.toast} onDismiss={store.dismissToast} />
    </div>
  );
}
