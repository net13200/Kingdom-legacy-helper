import { newCampaign, newId } from "./defaults";
import type { LedgerState } from "./types";

export interface LedgerResult {
  ledger: LedgerState;
  notices: string[];
  error?: string;
}

const fail = (ledger: LedgerState, error: string): LedgerResult => ({ ledger, notices: [], error });

export function addCampaign(l: LedgerState, name: string, id = newId()): LedgerResult {
  const clean = name.trim() || `Kingdom ${l.campaigns.length + 1}`;
  const c = newCampaign(clean, id);
  return { ledger: { ...l, campaigns: [...l.campaigns, c], activeId: c.id }, notices: [`Started ${clean}.`] };
}

export function switchCampaign(l: LedgerState, id: string): LedgerResult {
  const c = l.campaigns.find((x) => x.id === id);
  if (!c) return fail(l, "That kingdom no longer exists.");
  return { ledger: { ...l, activeId: id }, notices: [`Switched to ${c.name}.`] };
}

export function deleteCampaign(l: LedgerState, id: string): LedgerResult {
  const c = l.campaigns.find((x) => x.id === id);
  if (!c) return fail(l, "That kingdom no longer exists.");
  if (l.campaigns.length === 1) return fail(l, "You need at least one kingdom. Start it over instead.");
  const campaigns = l.campaigns.filter((x) => x.id !== id);
  const activeId = l.activeId === id ? campaigns[0].id : l.activeId;
  return { ledger: { ...l, campaigns, activeId }, notices: [`Deleted ${c.name}. Undo brings it back.`] };
}
