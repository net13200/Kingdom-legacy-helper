/** Generic undo/redo stack. Pure: every function returns a new History. */
export interface HistoryEntry<T> {
  state: T;
  /** What the action that moved away from this state was called, e.g. "Advance". */
  label: string;
}

export interface History<T> {
  past: HistoryEntry<T>[];
  present: T;
  future: HistoryEntry<T>[];
}

export const UNDO_LIMIT = 50;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Record a change. A no-op change (same object) is not recorded. */
export function commit<T>(h: History<T>, next: T, label: string, limit = UNDO_LIMIT): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, { state: h.present, label }];
  return { past: past.slice(Math.max(0, past.length - limit)), present: next, future: [] };
}

export function undo<T>(h: History<T>): { history: History<T>; label: string | null } {
  const last = h.past[h.past.length - 1];
  if (!last) return { history: h, label: null };
  return {
    history: {
      past: h.past.slice(0, -1),
      present: last.state,
      future: [{ state: h.present, label: last.label }, ...h.future],
    },
    label: last.label,
  };
}

export function redo<T>(h: History<T>): { history: History<T>; label: string | null } {
  const [next, ...rest] = h.future;
  if (!next) return { history: h, label: null };
  return {
    history: { past: [...h.past, { state: h.present, label: next.label }], present: next.state, future: rest },
    label: next.label,
  };
}
