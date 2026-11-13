import { useState } from "react";
import { FINAL_CARD, RESET_CARD } from "../logic/defaults";
import {
  cardsUntilFinal,
  currentRecord,
  discoverByEffect,
  reopenDiscovery,
  resetWindowOpen,
  setFinalRound,
  setNextSerial,
  setRoundNotes,
  upcoming,
} from "../logic/discovery";
import { cardLabel } from "../logic/kingdom";
import { activeExpansion, isFinalRound } from "../logic/turn";
import { parseWhole, type ScreenProps } from "./common";
import { DiscoveryCard } from "./DiscoveryCard";

export function RoundsScreen({ campaign, act }: ScreenProps) {
  const [counter, setCounter] = useState("");
  const [effectSerial, setEffectSerial] = useState("");
  const record = currentRecord(campaign);
  const exp = activeExpansion(campaign);
  const final = isFinalRound(campaign);
  const until = cardsUntilFinal(campaign);
  const windowOpen = resetWindowOpen(campaign);
  const setAside = campaign.cards.filter((k) => k.status === "destroyed");
  const next = upcoming(campaign, 2);

  return (
    <>
      {final && (
        <p className="banner banner--final" role="alert">
          <strong>FINAL ROUND</strong>
          {exp ? ` · last round of ${exp.name}` : " · count your fame when it ends"}
        </p>
      )}

      <DiscoveryCard campaign={campaign} act={act} />

      <section className="panel" aria-labelledby="round-title">
        <h2 id="round-title" className="panel-title">
          Round {campaign.round.number}
          {exp && ` · ${exp.name}`}
        </h2>
        <dl className="stats">
          <div>
            <dt>Discover next</dt>
            <dd>{next.length ? next.map((n) => `#${n}`).join(" and ") : "—"}</dd>
          </div>
          <div>
            <dt>Until #{FINAL_CARD}</dt>
            <dd>{until === 0 ? "Found" : `${until} card${until === 1 ? "" : "s"}`}</dd>
          </div>
          <div>
            <dt>This round</dt>
            <dd>
              {record?.discovery === "done"
                ? record.discovered.map((n) => `#${n}`).join(", ") + (record.parchment ? " (parchment)" : "")
                : record?.discovery === "pending"
                  ? "Discovery to do"
                  : record?.discovery === "skipped"
                    ? "Skipped"
                    : "No discovery"}
            </dd>
          </div>
          <div>
            <dt>Turns</dt>
            <dd>{campaign.turn.number}</dd>
          </div>
        </dl>
        {record && (record.discovery === "done" || record.discovery === "skipped") && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => act("Reopen discovery", reopenDiscovery)}>
            Redo this round's discovery
          </button>
        )}
      </section>

      <section className={`panel ${windowOpen ? "panel--notice" : ""}`} aria-labelledby="reset-title">
        <h2 id="reset-title" className="panel-title">
          Reset window
        </h2>
        {windowOpen ? (
          <>
            <p>
              <strong>Open</strong> until you discover #{RESET_CARD}. You may still reset the game, so set destroyed cards aside instead of
              destroying them for good.
            </p>
            {setAside.length > 0 && (
              <p className="muted">Set aside: {setAside.map(cardLabel).join(", ")}</p>
            )}
          </>
        ) : (
          <p>
            <strong>Closed.</strong> #{RESET_CARD} has been discovered: destroyed cards are gone for good.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="counter-title">
        <h2 id="counter-title" className="panel-title">
          Discovery counter
        </h2>
        <p className="muted small">The next discovery starts at #{campaign.nextSerial}. Change it if a card went back into the box or you started mid-game.</p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseWhole(counter);
            if (n !== null && act("Set discovery counter", (c) => setNextSerial(c, n))) setCounter("");
          }}
        >
          <label className="sr-only" htmlFor="counter-input">
            Next card number
          </label>
          <input id="counter-input" type="number" inputMode="numeric" min={0} value={counter} placeholder={`#${campaign.nextSerial}`} onChange={(e) => setCounter(e.target.value)} />
          <button type="submit" className="btn" disabled={counter === ""}>
            Set
          </button>
        </form>

        <p className="muted small">A card effect told you to discover a specific card:</p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseWhole(effectSerial);
            if (n !== null && act("Discover by effect", (c) => discoverByEffect(c, n))) setEffectSerial("");
          }}
        >
          <label className="sr-only" htmlFor="effect-input">
            Card number discovered by an effect
          </label>
          <input id="effect-input" type="number" inputMode="numeric" min={0} value={effectSerial} placeholder="Card #" onChange={(e) => setEffectSerial(e.target.value)} />
          <button type="submit" className="btn" disabled={effectSerial === ""}>
            Discover
          </button>
        </form>

        {!exp && (
          <label className="check check--plain">
            <input
              type="checkbox"
              checked={campaign.finalRound !== null && final}
              onChange={(e) => act(e.target.checked ? "Mark final round" : "Clear final round", (c) => setFinalRound(c, e.target.checked))}
            />
            <span>This is the final round (#{FINAL_CARD} discovered)</span>
          </label>
        )}
      </section>

      <section className="panel" aria-labelledby="history-title">
        <h2 id="history-title" className="panel-title">
          Round history
        </h2>
        <ol className="history" reversed>
          {[...campaign.rounds].reverse().map((r) => {
            const e = r.expansionId ? campaign.expansions.find((x) => x.id === r.expansionId) : null;
            return (
              <li key={r.number} className="history-item">
                <div className="history-head">
                  <strong>Round {r.number}</strong>
                  <span className="muted small">
                    {e ? `${e.name} · ` : ""}
                    {r.discovered.length ? `found ${r.discovered.map((n) => "#" + n).join(", ")}${r.parchment ? " (parchment)" : ""}` : r.number === 1 && !e ? "starting kingdom" : "no discovery"}
                    {r.turns ? ` · ${r.turns} turn${r.turns === 1 ? "" : "s"}` : ""}
                    {r.deckSize !== null ? ` · deck ${r.deckSize}` : ""}
                  </span>
                </div>
                <label className="sr-only" htmlFor={`notes-${r.number}`}>
                  Notes for round {r.number}
                </label>
                <textarea
                  id={`notes-${r.number}`}
                  rows={2}
                  placeholder="Notes"
                  defaultValue={r.notes}
                  key={r.notes}
                  onBlur={(ev) => {
                    const text = ev.target.value;
                    if (text !== r.notes) act(`Notes for round ${r.number}`, (c) => setRoundNotes(c, r.number, text), { silent: true });
                  }}
                />
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
