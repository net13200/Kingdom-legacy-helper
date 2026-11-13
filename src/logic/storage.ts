import { normalizeLedger } from "./backup";
import { createHistory, type History } from "./history";
import { newLedger } from "./defaults";
import type { LedgerState, Theme } from "./types";

const KEY = "kingdom-ledger/v1";
const THEME_KEY = "kingdom-ledger/theme";
/** Undo steps kept across app restarts. */
const SAVED_UNDO = 30;

export function loadHistory(): History<LedgerState> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createHistory(newLedger());
    const data = JSON.parse(raw);
    const present = normalizeLedger(data?.present);
    if (!present) return createHistory(newLedger());
    const past = Array.isArray(data.past)
      ? data.past.flatMap((e: { state?: unknown; label?: unknown }) => {
          const state = normalizeLedger(e?.state);
          return state ? [{ state, label: typeof e.label === "string" ? e.label : "Change" }] : [];
        })
      : [];
    return { past, present, future: [] };
  } catch {
    return createHistory(newLedger());
  }
}

export function saveHistory(h: History<LedgerState>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ present: h.present, past: h.past.slice(-SAVED_UNDO) }));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
}

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}
