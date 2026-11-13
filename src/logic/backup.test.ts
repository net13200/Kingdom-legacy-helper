import { describe, expect, it } from "vitest";
import { backupFileName, normalizeLedger, parseBackup, toBackup } from "./backup";
import { newLedger } from "./defaults";
import { startTurn, adjustResource } from "./turn";

describe("backup", () => {
  it("round-trips a ledger", () => {
    const ledger = newLedger();
    const c = adjustResource(startTurn(ledger.campaigns[0]).campaign, "coin", 2);
    const state = { ...ledger, campaigns: [c] };
    const parsed = parseBackup(JSON.stringify(toBackup(state)));
    expect(parsed).toEqual({ ledger: state });
  });

  it("rejects junk", () => {
    expect(parseBackup("not json")).toHaveProperty("error");
    expect(parseBackup("{}")).toHaveProperty("error");
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, campaigns: [] }))).toHaveProperty("error");
  });

  it("fills missing fields and fixes a bad active id", () => {
    const ledger = normalizeLedger({
      schemaVersion: 1,
      activeId: "missing",
      campaigns: [{ id: "a", resources: [{ id: "coin", name: "Coin" }], counts: { coin: -4 } }],
    });
    expect(ledger?.activeId).toBe("a");
    expect(ledger?.campaigns[0].counts.coin).toBe(0);
    expect(ledger?.campaigns[0].round.number).toBe(1);
    expect(ledger?.campaigns[0].turn.checklist).toHaveLength(3);
  });

  it("names files by date", () => {
    expect(backupFileName(new Date("2026-03-04T10:00:00Z"))).toBe("kingdom-ledger-2026-03-04.json");
  });
});
