import { describe, expect, it } from "vitest";
import { addCampaign, deleteCampaign, switchCampaign } from "./campaigns";
import { newCampaign, newLedger } from "./defaults";
import { discoveryPending } from "./discovery";
import {
  canStartExpansion,
  finishExpansion,
  recordBaseScore,
  startExpansion,
  toggleExpansionPrep,
} from "./expansions";
import { parseInline, parseMarkdown } from "./markdown";
import { endTurn, finishGame, isFinalRound, setDeckCount, startNextRound, startTurn } from "./turn";
import type { Campaign } from "./types";

const over = (): Campaign => finishGame(newCampaign("T", "c1")).campaign;
const mini = { name: "Mini A", discoversCards: false, roundsPlanned: 4 };

describe("save slots", () => {
  it("adds, switches and deletes kingdoms, keeping at least one", () => {
    let l = newLedger();
    const first = l.activeId;
    l = addCampaign(l, "Second", "c2").ledger;
    expect(l.activeId).toBe("c2");
    l = switchCampaign(l, first).ledger;
    expect(l.activeId).toBe(first);
    l = deleteCampaign(l, first).ledger;
    expect(l.activeId).toBe("c2");
    expect(deleteCampaign(l, "c2").error).toBeTruthy();
    expect(switchCampaign(l, "nope").error).toBeTruthy();
  });
});

describe("expansions", () => {
  it("only after the base game, each once, at most 10", () => {
    expect(canStartExpansion(newCampaign())).toBeTruthy();
    let c = over();
    expect(canStartExpansion(c)).toBeNull();
    c = startExpansion(c, mini, "e1").campaign;
    expect(canStartExpansion(c)).toMatch(/current/);
    c = finishExpansion(c, 50).campaign;
    expect(startExpansion(c, { ...mini, name: "mini a" }).error).toMatch(/once/);
    for (let i = 2; i <= 10; i++) c = finishExpansion(startExpansion(c, { ...mini, name: `E${i}` }).campaign, i).campaign;
    expect(c.expansions).toHaveLength(10);
    expect(startExpansion(c, { ...mini, name: "E11" }).error).toMatch(/10/);
  });

  it("starts a new round without discovery for a mini expansion and ends after its rounds", () => {
    let c = startExpansion(over(), mini, "e1").campaign;
    expect(c.round.number).toBe(2);
    expect(discoveryPending(c)).toBe(false);
    for (let i = 0; i < 3; i++) {
      c = setDeckCount(c, 4).campaign;
      c = endTurn(startTurn(c).campaign, "pass").campaign;
      expect(isFinalRound(c)).toBe(false);
      c = startNextRound(c).campaign;
      expect(discoveryPending(c)).toBe(false);
    }
    expect(isFinalRound(c)).toBe(true);
    c = toggleExpansionPrep(c, "e1", 0);
    expect(c.expansions[0].prep).toEqual([true, false]);
    c = finishExpansion(c, 123).campaign;
    expect(c.expansions[0]).toMatchObject({ status: "finished", score: 123 });
    expect(c.gameOver).toBe(true);
  });

  it("expansions that discover cards keep the discovery step", () => {
    const c = startExpansion(over(), { name: "Big", discoversCards: true, roundsPlanned: null }).campaign;
    expect(discoveryPending(c)).toBe(true);
    expect(isFinalRound(c)).toBe(false);
  });

  it("records the base score", () => {
    expect(recordBaseScore(over(), 87).campaign.baseScore).toBe(87);
    expect(recordBaseScore(over(), 1.2).error).toBeTruthy();
  });
});

describe("markdown", () => {
  it("parses headings, paragraphs, lists and inline marks", () => {
    const blocks = parseMarkdown("# Title\n\nSome **bold** and *it*\nwraps.\n\n- one\n- [two](https://x.y/z)\n\n## Next");
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "list", "heading"]);
    expect(blocks[0]).toMatchObject({ level: 1, id: "title" });
    expect(parseInline("a **b** c")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " c" },
    ]);
  });

  it("ignores non-http links", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ kind: "text", text: "[x](javascript:alert(1))" }]);
  });
});
