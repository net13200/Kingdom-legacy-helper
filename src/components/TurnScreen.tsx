import { useState } from "react";
import { CARDS_PER_ADVANCE, CARDS_PER_TURN, END_OF_ROUND_STEPS, END_OF_TURN_STEPS } from "../logic/defaults";
import {
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
import type { CampaignAction } from "../useLedger";

type Act = (label: string, action: CampaignAction, opts?: { silent?: boolean }) => boolean;

export function TurnScreen({ campaign, act }: { campaign: Campaign; act: Act }) {
  const { round, turn } = campaign;
  const lastTurn = turn.active && round.deckRemaining === 0;

  return (
    <>
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
              placeholder="e.g. 14"
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
        </form>
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
              ? `You ${turn.ended === "upgrade" ? "upgraded a card" : "passed"}. Finish the end-of-turn steps, then start the next turn.`
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
            <button
              type="button"
              className="btn btn--primary btn--wide"
              onClick={() => act("Start next round", startNextRound)}
            >
              Start round {round.number + 1}
            </button>
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
