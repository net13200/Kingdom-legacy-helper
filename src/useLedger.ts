import { useCallback, useEffect, useRef, useState } from "react";
import { commit, redo, undo, type History } from "./logic/history";
import { loadHistory, saveHistory } from "./logic/storage";
import type { ActionResult } from "./logic/turn";
import type { LedgerResult } from "./logic/campaigns";
import type { Campaign, LedgerState } from "./logic/types";

export type CampaignAction = (c: Campaign) => ActionResult | Campaign;

export interface Toast {
  id: number;
  messages: string[];
  tone: "info" | "warn" | "error";
}

/** App state with undo/redo, saved to the device after every change. */
export function useLedger() {
  const [history, setHistory] = useState<History<LedgerState>>(loadHistory);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => saveHistory(history), [history]);

  const notify = useCallback((messages: string[], tone: Toast["tone"] = "info") => {
    if (messages.length === 0) return;
    setToast({ id: ++toastId.current, messages, tone });
  }, []);

  const campaign = history.present.campaigns.find((c) => c.id === history.present.activeId) ?? history.present.campaigns[0];

  /** Run a game action on the active campaign and record it for undo. */
  const act = useCallback(
    (label: string, action: CampaignAction, opts: { silent?: boolean } = {}) => {
      const h = historyRef.current;
      const current = h.present.campaigns.find((c) => c.id === h.present.activeId) ?? h.present.campaigns[0];
      const out = action(current);
      const result: ActionResult = "campaign" in out && "notices" in out ? out : { campaign: out as Campaign, notices: [] };
      if (result.error) {
        notify([result.error], "error");
        return false;
      }
      if (result.campaign !== current) {
        const present: LedgerState = {
          ...h.present,
          campaigns: h.present.campaigns.map((c) => (c.id === current.id ? result.campaign : c)),
        };
        setHistory(commit(h, present, label));
      }
      if (!opts.silent) {
        const warn = result.notices.some((n) => /last turn|deck is empty/i.test(n));
        notify(result.notices, warn ? "warn" : "info");
      }
      return true;
    },
    [notify],
  );

  /** Run an action on the whole ledger (save slots). */
  const actLedger = useCallback(
    (label: string, action: (l: LedgerState) => LedgerResult) => {
      const h = historyRef.current;
      const out = action(h.present);
      if (out.error) {
        notify([out.error], "error");
        return false;
      }
      if (out.ledger !== h.present) setHistory(commit(h, out.ledger, label));
      notify(out.notices);
      return true;
    },
    [notify],
  );

  const replaceLedger = useCallback((label: string, ledger: LedgerState) => {
    setHistory((h) => commit(h, ledger, label));
  }, []);

  const doUndo = useCallback(() => {
    const { history: next, label } = undo(historyRef.current);
    if (label === null) return notify(["Nothing to undo."]);
    setHistory(next);
    notify([`Undid: ${label}`]);
  }, [notify]);

  const doRedo = useCallback(() => {
    const { history: next, label } = redo(historyRef.current);
    if (label === null) return notify(["Nothing to redo."]);
    setHistory(next);
    notify([`Redid: ${label}`]);
  }, [notify]);

  return {
    ledger: history.present,
    campaign,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoLabel: history.past.at(-1)?.label ?? null,
    act,
    actLedger,
    replaceLedger,
    undo: doUndo,
    redo: doRedo,
    toast,
    notify,
    dismissToast: () => setToast(null),
  };
}
