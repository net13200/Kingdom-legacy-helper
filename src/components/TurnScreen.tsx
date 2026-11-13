import { useState } from "react";
import { CARDS_PER_ADVANCE, CARDS_PER_TURN, END_OF_ROUND_STEPS, END_OF_TURN_STEPS } from "../logic/defaults";
import { DiscoveryCard } from "./DiscoveryCard";
import { shuffledCardCount } from "../logic/kingdom";
import {
  activeExpansion,
  adjustDeck,
  finishGame,
  isFinalRound,
  adjustResource,
  advance,
  canAdvance,
  canStartTurn,
  cardsToDraw,
  clearResources,
  endRound,
  endTurn,
  hasAnyResources,
  setDeckCount,
  startNextRound,
  startTurn,
  toggleRoundStep,
  toggleTurnStep,
} from "../logic/turn";
import type { Campaign } from "../logic/types";
import type { Act } from "./common";

export function TurnScreen({ campaign, act, goTo }: { campaign: Campaign; act: Act; goTo: (tab: string) => void }) {
  const { round, turn } = campaign;
  const lastTurn = turn.active && round.deckRemaining === 0;
  const final = isFinalRound(campaign);
  const exp = activeExpansion(campaign);

  if (campaign.gameOver) {
    return (
      <section className="panel panel--notice">
        <h2 className="panel-title">Game over</h2>
        <p>Count the fame in your kingdom, add your purged fame, and write down your score.</p>
        <button type="button" className="btn btn--primary btn--wide" onClick={() => goTo("campaign")}>
          Go to scoring
        </button>
      </section>
    );
  }

  return (
    <>
      {final && (
        <p className="banner banner--final" role="alert">
          <strong>FINAL ROUND</strong>
          {exp ? ` · last round of ${exp.name}` : ""}
        </p>
      )}
      <DiscoveryCard campaign={campaign} act={act} />
      <DeckPanel campaign={campaign} act={act} />

      {lastTurn && (
        <p className="banner banner--warn" role="alert">
          <strong>Last turn of the round.</strong> The deck is empty.
        </p>
      )}

      <ActionPanel campaign={campaign} act={act} />
      <ResourcePanel campaign={campaign} act={act} />
      <ChecklistPanel campaign={campaign} act={act} />
    </>
  );
}

function DeckPanel({ campaign, act }: { campaign: Campaign; act: Act }) {
  const { round, turn } = campaign;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const needsCount = round.deckRemaining === null && !round.over;
  const logged = shuffledCardCount(campaign);
  const showForm = editing || (needsCount && turn.number === 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (act("Set deck count", (c) => setDeckCount(c, n))) {
      setEditing(false);
      setValue("");
    }
  };

  return (
    <section className="panel deck" aria-labelledby="deck-title">
      <div className="deck-row">
        <div>
          <h2 id="deck-title" className="panel-title">
            Deck
          </h2>
          <p className="deck-count" aria-live="polite">
            {round.deckRemaining === null ? (
              <span className="muted">not counted</span>
            ) : (
              <>
                <span className="deck-number">{round.deckRemaining}</span>
                <span className="deck-unit"> card{round.deckRemaining === 1 ? "" : "s"} left</span>
              </>
            )}
          </p>
          {round.deckSize !== null && <p className="muted small">Round started with {round.deckSize}</p>}
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setValue(round.deckRemaining?.toString() ?? "");
              setEditing(true);
            }}
          >
            {round.deckRemaining === null ? "Count deck" : "Edit"}
          </button>
        )}
      </div>

      {showForm && (
        <form className="deck-form" onSubmit={submit}>
          <label htmlFor="deck-input">
            {turn.number === 0 ? `Shuffle and count the deck for round ${round.number}:` : "Cards left in the deck:"}
          </label>
          <div className="deck-form-row">
            <input
              id="deck-input"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={logged ? String(logged) : "e.g. 14"}
            />
            <button type="submit" className="btn btn--primary" disabled={value === ""}>
              Save
            </button>
            {editing && (
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
          {logged > 0 && turn.number === 0 && (
            <button type="button" className="link-btn" onClick={() => setValue(String(logged))}>
              Your kingdom log has {logged} card{logged === 1 ? "" : "s"} to shuffle. Use {logged}
            </button>
          )}
        </form>
      )}

      {!showForm && round.deckRemaining !== null && turn.active && (
        <div className="deck-adjust">
          <span className="muted small">A card effect moved cards:</span>
          <button type="button" className="btn btn--ghost btn--small" aria-label="One card taken from the deck" onClick={() => act("Deck −1", (c) => adjustDeck(c, -1))}>
            −1
          </button>
          <button type="button" className="btn btn--ghost btn--small" aria-label="One card put on the deck" onClick={() => act("Deck +1", (c) => adjustDeck(c, 1))}>
            +1
          </button>
        </div>
      )}
    </section>
  );
}

function ActionPanel({ campaign, act }: { campaign: Campaign; act: Act }) {
  const { round, turn } = campaign;
  const turnBlocked = canStartTurn(campaign);
  const advanceBlocked = canAdvance(campaign);
  const draw = cardsToDraw(round.deckRemaining, CARDS_PER_TURN);
  const adv = cardsToDraw(round.deckRemaining, CARDS_PER_ADVANCE);

  return (
    <section className="panel" aria-labelledby="turn-title">
      <h2 id="turn-title" className="panel-title">
        {turn.active ? `Turn ${turn.number}` : turn.number === 0 ? `Round ${round.number}` : `Turn ${turn.number} ended`}
      </h2>
      <p className="status" aria-live="polite">
        {turn.active
          ? `${turn.cardsPlayed} card${turn.cardsPlayed === 1 ? "" : "s"} played${
              turn.advances ? ` · ${turn.advances} advance${turn.advances === 1 ? "" : "s"}` : ""
            }`
          : round.over
            ? "Round over. Work through the end-of-round steps below."
            : turn.ended
              ? `You ${turn.ended === "upgrade" ? "upgraded a card" : turn.ended === "time" ? "used a time effect" : "passed"}. Finish the end-of-turn steps, then start the next turn.`
              : "Start your first turn when the deck is ready."}
      </p>
      <div className="actions">
        <ActionButton
          className="btn--primary"
          blocked={turnBlocked}
          onClick={() => act("New turn", startTurn)}
          label={draw > 0 ? `New turn (play ${draw})` : "New turn"}
          hint="Clears resources"
        />
        <ActionButton
          className="btn--accent"
          blocked={advanceBlocked}
          onClick={() => act("Advance", advance)}
          label={`Advance (+${adv || CARDS_PER_ADVANCE})`}
          hint="Clears resources"
        />
        <ActionButton
          blocked={turn.active ? null : "Start a turn first."}
          onClick={() => act("Upgrade", (c) => endTurn(c, "upgrade"))}
          label="Upgrade"
          hint="Ends turn"
        />
        <ActionButton
          blocked={turn.active ? null : "Start a turn first."}
          onClick={() => act("Pass", (c) => endTurn(c, "pass"))}
          label="Pass"
          hint="Ends turn"
        />
        <ActionButton
          className="action--wide"
          blocked={turn.active ? null : "Start a turn first."}
          onClick={() => act("Time effect", (c) => endTurn(c, "time"))}
          label="Time effect"
          hint="Discard the card and end the turn"
        />
      </div>
    </section>
  );
}

function ActionButton(props: {
  label: string;
  hint: string;
  blocked: string | null;
  onClick: () => void;
  className?: string;
}) {
  // Blocked buttons stay tappable and explain why in a toast, instead of silently doing nothing.
  return (
    <button
      type="button"
      className={`btn action ${props.className ?? ""}`}
      aria-disabled={props.blocked !== null}
      aria-description={props.blocked ?? props.hint}
      onClick={props.onClick}
    >
      <span className="action-label">{props.label}</span>
      <span className="action-hint">{props.blocked ?? props.hint}</span>
    </button>
  );
}

function ResourcePanel({ campaign, act }: { campaign: Campaign; act: Act }) {
  const any = hasAnyResources(campaign);
  return (
    <section className="panel" aria-labelledby="res-title">
      <div className="panel-head">
        <h2 id="res-title" className="panel-title">
          Resources
        </h2>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          aria-disabled={!any}
          onClick={() => any && act("Clear all", clearResources, { silent: true })}
        >
          Clear all
        </button>
      </div>
      <ul className="resources">
        {campaign.resources.map((r) => {
          const n = campaign.counts[r.id] ?? 0;
          return (
            <li key={r.id} className={`resource ${n > 0 ? "resource--held" : ""}`}>
              <span className="resource-icon" aria-hidden="true">
                {r.icon}
              </span>
              <span className="resource-name" id={`res-${r.id}`}>
                {r.name}
              </span>
              <button
                type="button"
                className="step"
                aria-label={`Remove one ${r.name}`}
                aria-disabled={n === 0}
                onClick={() => n > 0 && act(`${r.name} −1`, (c) => adjustResource(c, r.id, -1), { silent: true })}
              >
                −
              </button>
              <output className="resource-count" aria-labelledby={`res-${r.id}`} aria-live="polite">
                {n}
              </output>
              <button
                type="button"
                className="step step--plus"
                aria-label={`Add one ${r.name}`}
                onClick={() => act(`${r.name} +1`, (c) => adjustResource(c, r.id, 1), { silent: true })}
              >
                +
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ChecklistPanel({ campaign, act }: { campaign: Campaign; act: Act }) {
  const { round, turn } = campaign;
  const turnJustEnded = !turn.active && turn.ended !== null;
  // Opens by itself when there is something to do; the player can still fold it.
  // The player's choice holds until the situation changes (turn ends, new turn starts...).
  const autoOpen = turnJustEnded || round.over;
  const [override, setOverride] = useState<{ auto: boolean; open: boolean } | null>(null);
  const open = override && override.auto === autoOpen ? override.open : autoOpen;
  const stepText = (i: number) =>
    i === 2 ? (round.over ? "Deck is empty: end the round (below)" : END_OF_TURN_STEPS[2]) : END_OF_TURN_STEPS[i];

  return (
    <section className="panel">
      <details
        className="checklist"
        open={open}
        onToggle={(e) => {
          const isOpen = (e.currentTarget as HTMLDetailsElement).open;
          if (isOpen !== open) setOverride({ auto: autoOpen, open: isOpen });
        }}
      >
        <summary>
          <span className="panel-title">End of turn</span>
          <span className="muted small">{turnJustEnded ? "to do now" : "checklist"}</span>
        </summary>
        <ol className="steps">
          {END_OF_TURN_STEPS.map((_, i) => (
            <li key={i}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={turn.checklist[i] ?? false}
                  onChange={() => act("Tick end-of-turn step", (c) => toggleTurnStep(c, i), { silent: true })}
                />
                <span>{stepText(i)}</span>
              </label>
            </li>
          ))}
        </ol>

        {round.over && (
          <div className="round-end">
            <h3 className="panel-title">End of round {round.number}</h3>
            <ol className="steps">
              {END_OF_ROUND_STEPS.map((s, i) => (
                <li key={i}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={round.checklist[i] ?? false}
                      onChange={() => act("Tick end-of-round step", (c) => toggleRoundStep(c, i), { silent: true })}
                    />
                    <span>{s}</span>
                  </label>
                </li>
              ))}
            </ol>
            {isFinalRound(campaign) ? (
              <button type="button" className="btn btn--primary btn--wide" onClick={() => act("Finish game", finishGame)}>
                {activeExpansion(campaign) ? "Last round done: score it" : "Final round done: count your fame"}
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--wide" onClick={() => act("Start next round", startNextRound)}>
                Start round {round.number + 1}
              </button>
            )}
          </div>
        )}

        {!round.over && !turn.active && turn.number > 0 && (
          <button type="button" className="btn btn--ghost btn--wide" onClick={() => act("End round", endRound)}>
            End round {round.number} now
          </button>
        )}
      </details>
    </section>
  );
}
