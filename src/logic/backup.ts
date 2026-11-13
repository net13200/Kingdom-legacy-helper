import { END_OF_ROUND_STEPS, END_OF_TURN_STEPS, freshRound, freshTurn, zeroCounts } from "./defaults";
import type { Campaign, LedgerState, ResourceDef } from "./types";

export const BACKUP_KIND = "kingdom-ledger-backup";

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  exportedAt: string;
  ledger: LedgerState;
}

export function toBackup(ledger: LedgerState, now = new Date()): BackupFile {
  return { kind: BACKUP_KIND, exportedAt: now.toISOString(), ledger };
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `kingdom-ledger-${d}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bools = (v: unknown, length: number) =>
  Array.from({ length }, (_, i) => (Array.isArray(v) ? v[i] === true : false));

function normalizeResources(v: unknown): ResourceDef[] | null {
  if (!Array.isArray(v)) return null;
  const out: ResourceDef[] = [];
  for (const r of v) {
    if (!isObj(r) || typeof r.id !== "string" || typeof r.name !== "string") return null;
    out.push({ id: r.id, name: r.name, icon: typeof r.icon === "string" ? r.icon : "✦", builtin: r.builtin === true });
  }
  return out;
}

function normalizeCampaign(v: unknown): Campaign | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const resources = normalizeResources(v.resources);
  if (!resources) return null;
  const counts = zeroCounts(resources);
  if (isObj(v.counts)) {
    for (const r of resources) counts[r.id] = Math.max(0, num(v.counts[r.id], 0));
  }
  const round = isObj(v.round) ? v.round : {};
  const turn = isObj(v.turn) ? v.turn : {};
  const baseRound = freshRound(Math.max(1, num(round.number, 1)));
  const baseTurn = freshTurn();
  return {
    id: v.id,
    name: typeof v.name === "string" ? v.name : "My kingdom",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    resources,
    counts,
    round: {
      ...baseRound,
      deckSize: numOrNull(round.deckSize),
      deckRemaining: numOrNull(round.deckRemaining),
      over: round.over === true,
      checklist: bools(round.checklist, END_OF_ROUND_STEPS.length),
    },
    turn: {
      ...baseTurn,
      number: Math.max(0, num(turn.number, 0)),
      active: turn.active === true,
      cardsPlayed: Math.max(0, num(turn.cardsPlayed, 0)),
      advances: Math.max(0, num(turn.advances, 0)),
      ended: turn.ended === "upgrade" || turn.ended === "pass" ? turn.ended : null,
      checklist: bools(turn.checklist, END_OF_TURN_STEPS.length),
    },
  };
}

/** Validate and fill in a stored or imported ledger. Returns null if it isn't one. */
export function normalizeLedger(v: unknown): LedgerState | null {
  if (!isObj(v) || v.schemaVersion !== 1 || !Array.isArray(v.campaigns)) return null;
  const campaigns: Campaign[] = [];
  for (const c of v.campaigns) {
    const parsed = normalizeCampaign(c);
    if (!parsed) return null;
    campaigns.push(parsed);
  }
  if (campaigns.length === 0) return null;
  const activeId =
    typeof v.activeId === "string" && campaigns.some((c) => c.id === v.activeId) ? v.activeId : campaigns[0].id;
  return { schemaVersion: 1, campaigns, activeId };
}

/** Parse the text of a backup file. Accepts a full backup or a bare ledger. */
export function parseBackup(text: string): { ledger: LedgerState } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "That file isn't valid JSON." };
  }
  const candidate = isObj(data) && data.kind === BACKUP_KIND ? data.ledger : data;
  const ledger = normalizeLedger(candidate);
  return ledger ? { ledger } : { error: "That file isn't a Kingdom Ledger backup." };
}
