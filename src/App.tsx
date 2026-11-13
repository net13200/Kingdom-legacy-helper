import { useEffect, useState } from "react";
import { useLedger } from "./useLedger";
import { loadTheme, saveTheme } from "./logic/storage";
import type { Theme } from "./logic/types";
import { TurnScreen } from "./components/TurnScreen";
import { RoundsScreen } from "./components/RoundsScreen";
import { KingdomScreen } from "./components/KingdomScreen";
import { RulesScreen } from "./components/RulesScreen";
import { CampaignScreen } from "./components/CampaignScreen";
import { Menu } from "./components/Menu";
import { ToastView } from "./components/ToastView";
import { discoveryPending } from "./logic/discovery";
import { activeExpansion, isFinalRound } from "./logic/turn";

const TABS = [
  { id: "turn", label: "Turn", icon: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h3" },
  { id: "rounds", label: "Rounds", icon: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { id: "kingdom", label: "Kingdom", icon: "M4 18h16M5 18l-1-9 4 3 4-6 4 6 4-3-1 9" },
  { id: "rules", label: "Rules", icon: "M5 4h9a5 5 0 0 1 5 5v11H10a5 5 0 0 1-5-5zM9 9h6M9 13h4" },
  { id: "campaign", label: "Campaign", icon: "M6 21V4M6 4h11l-2 4 2 4H6" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const TAB_KEY = "kingdom-ledger/tab";

function loadTab(): TabId {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.some((x) => x.id === t) ? (t as TabId) : "turn";
  } catch {
    return "turn";
  }
}

export default function App() {
  const store = useLedger();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<TabId>(loadTab);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#16131d" : "#f6f1e7");
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }, [tab]);

  const { campaign } = store;
  const exp = activeExpansion(campaign);
  const badges: Partial<Record<TabId, boolean>> = { rounds: discoveryPending(campaign), campaign: campaign.gameOver };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Kingdom Ledger</h1>
          <p className="topbar-sub">
            {campaign.name} · {exp ? `${exp.name} · ` : ""}Round {campaign.round.number}
            {campaign.turn.number > 0 && <> · Turn {campaign.turn.number}</>}
            {isFinalRound(campaign) && !campaign.gameOver && <> · <strong className="final-tag">FINAL</strong></>}
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

      <main className="content" id="main">
        {tab === "turn" && <TurnScreen campaign={campaign} act={store.act} goTo={(t) => setTab(t as TabId)} />}
        {tab === "rounds" && <RoundsScreen campaign={campaign} act={store.act} />}
        {tab === "kingdom" && <KingdomScreen campaign={campaign} act={store.act} />}
        {tab === "rules" && <RulesScreen />}
        {tab === "campaign" && <CampaignScreen campaign={campaign} act={store.act} ledger={store.ledger} actLedger={store.actLedger} />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? "is-on" : ""}`} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
            {badges[t.id] && <span className="tab-dot" aria-label="needs attention" />}
          </button>
        ))}
      </nav>

      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} theme={theme} setTheme={setTheme} store={store} />
      <ToastView toast={store.toast} onDismiss={store.dismissToast} />
    </div>
  );
}
