import {
  END_OF_ROUND_STEPS,
  END_OF_TURN_STEPS,
  EXPANSION_PREP_STEPS,
  FIRST_DISCOVERY,
  freshRound,
  freshTurn,
  roundRecord,
  zeroCounts,
} from "./defaults";
import type {
  Campaign,
  CardRecord,
  CardStatus,
  CardType,
  Expansion,
  LedgerState,
  Orientation,
  PurgeRecord,
  ResourceDef,
  RoundRecord,
} from "./types";

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
  return `kingdom-ledger-${now.toISOString().slice(0, 10)}.json`;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const bools = (v: unknown, length: number) => Array.from({ length }, (_, i) => (Array.isArray(v) ? v[i] === true : false));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const nonNeg = (v: unknown) => Math.max(0, num(v, 0));

function normalizeResources(v: unknown): ResourceDef[] | null {
  if (!Array.isArray(v)) return null;
  const out: ResourceDef[] = [];
  for (const r of v) {
    if (!isObj(r) || typeof r.id !== "string" || typeof r.name !== "string") return null;
    out.push({ id: r.id, name: r.name, icon: str(r.icon, "✦"), builtin: r.builtin === true });
  }
  return out;
}

const STATUSES: CardStatus[] = ["kingdom", "permanent", "destroyed", "purged", "undiscovered"];
const TYPES: CardType[] = ["friendly", "enemy", "event", "parchment"];
const ORIENTATIONS: Orientation[] = ["front-top", "front-bottom", "back-top", "back-bottom"];

function normalizeCard(v: unknown): CardRecord | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.serial !== "number") return null;
  const boosts: Record<string, number> = {};
  if (isObj(v.boosts)) for (const [k, n] of Object.entries(v.boosts)) if (nonNeg(n) > 0) boosts[k] = nonNeg(n);
  return {
    id: v.id,
    serial: v.serial,
    name: str(v.name),
    type: oneOf(v.type, TYPES, "friendly"),
    keywords: arr(v.keywords).filter((k): k is string => typeof k === "string"),
    orientation: oneOf(v.orientation, ORIENTATIONS, "front-top"),
    status: oneOf(v.status, STATUSES, "kingdom"),
    boosts,
    stickers: arr(v.stickers).flatMap((s) => (isObj(s) && typeof s.id === "string" ? [{ id: s.id, text: str(s.text) }] : [])),
    checkboxesMarked: nonNeg(v.checkboxesMarked),
    oneTimeCrossedOut: nonNeg(v.oneTimeCrossedOut),
    equippedTo: typeof v.equippedTo === "string" ? v.equippedTo : null,
    fame: num(v.fame, 0),
    notes: str(v.notes),
    addedRound: Math.max(1, num(v.addedRound, 1)),
  };
}

function normalizeRound(v: unknown): RoundRecord | null {
  if (!isObj(v) || typeof v.number !== "number") return null;
  return {
    ...roundRecord(v.number, oneOf(v.discovery, ["pending", "done", "skipped", "none"] as const, "none")),
    discovered: arr(v.discovered).filter((n): n is number => typeof n === "number"),
    parchment: v.parchment === true,
    turns: nonNeg(v.turns),
    deckSize: numOrNull(v.deckSize),
    notes: str(v.notes),
    expansionId: typeof v.expansionId === "string" ? v.expansionId : null,
  };
}

function normalizePurge(v: unknown): PurgeRecord | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  return {
    id: v.id,
    label: str(v.label, "Purge"),
    fame: num(v.fame, 0),
    cardIds: arr(v.cardIds).filter((x): x is string => typeof x === "string"),
    round: Math.max(1, num(v.round, 1)),
  };
}

function normalizeExpansion(v: unknown): Expansion | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.name !== "string") return null;
  return {
    id: v.id,
    name: v.name,
    discoversCards: v.discoversCards === true,
    roundsPlanned: numOrNull(v.roundsPlanned),
    startRound: Math.max(1, num(v.startRound, 1)),
    status: oneOf(v.status, ["playing", "finished"] as const, "finished"),
    score: numOrNull(v.score),
    prep: bools(v.prep, EXPANSION_PREP_STEPS.length),
  };
}

const keep = <T>(items: unknown[], fn: (v: unknown) => T | null): T[] => items.flatMap((v) => fn(v) ?? []);

function normalizeCampaign(v: unknown): Campaign | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const resources = normalizeResources(v.resources);
  if (!resources) return null;
  const counts = zeroCounts(resources);
  if (isObj(v.counts)) for (const r of resources) counts[r.id] = nonNeg(v.counts[r.id]);
  const round = isObj(v.round) ? v.round : {};
  const turn = isObj(v.turn) ? v.turn : {};
  const roundNumber = Math.max(1, num(round.number, 1));
  const rounds = keep(arr(v.rounds), normalizeRound);
  if (!rounds.some((r) => r.number === roundNumber)) rounds.push(roundRecord(roundNumber, roundNumber === 1 ? "none" : "pending"));
  const expansions = keep(arr(v.expansions), normalizeExpansion);
  const activeExpansionId =
    typeof v.activeExpansionId === "string" && expansions.some((e) => e.id === v.activeExpansionId && e.status === "playing")
      ? v.activeExpansionId
      : null;
  return {
    id: v.id,
    name: str(v.name, "My kingdom"),
    kingdomCode: str(v.kingdomCode),
    createdAt: str(v.createdAt, new Date().toISOString()),
    resources,
    counts,
    round: {
      ...freshRound(roundNumber),
      deckSize: numOrNull(round.deckSize),
      deckRemaining: numOrNull(round.deckRemaining),
      over: round.over === true,
      checklist: bools(round.checklist, END_OF_ROUND_STEPS.length),
    },
    turn: {
      ...freshTurn(),
      number: nonNeg(turn.number),
      active: turn.active === true,
      cardsPlayed: nonNeg(turn.cardsPlayed),
      advances: nonNeg(turn.advances),
      ended: turn.ended === "upgrade" || turn.ended === "pass" || turn.ended === "time" ? turn.ended : null,
      checklist: bools(turn.checklist, END_OF_TURN_STEPS.length),
    },
    rounds: rounds.sort((a, b) => a.number - b.number),
    nextSerial: Math.max(0, num(v.nextSerial, FIRST_DISCOVERY)),
    finalRound: numOrNull(v.finalRound),
    gameOver: v.gameOver === true,
    cards: keep(arr(v.cards), normalizeCard).sort((a, b) => a.serial - b.serial),
    purges: keep(arr(v.purges), normalizePurge),
    purgedFameAdjust: num(v.purgedFameAdjust, 0),
    baseScore: numOrNull(v.baseScore),
    expansions,
    activeExpansionId,
  };
}

/** Validate and fill in a stored or imported ledger (any schema version). Returns null if it isn't one. */
export function normalizeLedger(v: unknown): LedgerState | null {
  if (!isObj(v) || (v.schemaVersion !== 1 && v.schemaVersion !== 2) || !Array.isArray(v.campaigns)) return null;
  const campaigns: Campaign[] = [];
  for (const c of v.campaigns) {
    const parsed = normalizeCampaign(c);
    if (!parsed) return null;
    campaigns.push(parsed);
  }
  if (campaigns.length === 0) return null;
  const activeId =
    typeof v.activeId === "string" && campaigns.some((c) => c.id === v.activeId) ? v.activeId : campaigns[0].id;
  return { schemaVersion: 2, campaigns, activeId };
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
