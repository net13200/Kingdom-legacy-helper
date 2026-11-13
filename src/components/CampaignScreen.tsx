import { useState } from "react";
import { addCampaign, deleteCampaign, switchCampaign } from "../logic/campaigns";
import { EXPANSION_PREP_STEPS, MAX_EXPANSIONS, PURGE_GROUP } from "../logic/defaults";
import { canStartExpansion, finishExpansion, recordBaseScore, setExpansionScore, startExpansion, toggleExpansionPrep } from "../logic/expansions";
import { cardLabel, scorePreview, shuffledCardCount } from "../logic/kingdom";
import { applyPurge, purgePicks, setPurgedFameAdjust } from "../logic/purge";
import { activeExpansion, finishGame } from "../logic/turn";
import type { LedgerState } from "../logic/types";
import type { useLedger } from "../useLedger";
import { parseWhole, type ScreenProps } from "./common";

interface Props extends ScreenProps {
  ledger: LedgerState;
  actLedger: ReturnType<typeof useLedger>["actLedger"];
}

export function CampaignScreen({ campaign, act, ledger, actLedger }: Props) {
  return (
    <>
      <KingdomPanel campaign={campaign} act={act} />
      <ScorePanel campaign={campaign} act={act} />
      <ExpansionPanel campaign={campaign} act={act} />
      <PurgePanel campaign={campaign} act={act} />
      <SlotsPanel campaign={campaign} ledger={ledger} actLedger={actLedger} />
    </>
  );
}

function KingdomPanel({ campaign, act }: ScreenProps) {
  return (
    <section className="panel" aria-labelledby="kingdom-title">
      <h2 id="kingdom-title" className="panel-title">
        Kingdom
      </h2>
      <label className="field">
        <span>Kingdom name</span>
        <input
          type="text"
          defaultValue={campaign.name}
          key={campaign.id + campaign.name}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== campaign.name) act("Rename kingdom", (c) => ({ ...c, name }), { silent: true });
          }}
        />
      </label>
      <label className="field">
        <span>Kingdom code (inside the box top)</span>
        <input
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={campaign.kingdomCode}
          key={campaign.id + campaign.kingdomCode}
          onBlur={(e) => {
            const kingdomCode = e.target.value.trim();
            if (kingdomCode !== campaign.kingdomCode) act("Kingdom code", (c) => ({ ...c, kingdomCode }), { silent: true });
          }}
        />
      </label>
    </section>
  );
}

function ScoreInput(props: { id: string; label: string; initial: number | null; placeholder: number; onSave: (n: number | null) => void }) {
  const [text, setText] = useState(props.initial === null ? "" : String(props.initial));
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave(parseWhole(text));
      }}
    >
      <label className="sr-only" htmlFor={props.id}>
        {props.label}
      </label>
      <input id={props.id} type="number" inputMode="numeric" value={text} placeholder={String(props.placeholder)} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn">
        Save
      </button>
      {text === "" && (
        <button type="button" className="btn btn--ghost" onClick={() => setText(String(props.placeholder))}>
          Use {props.placeholder}
        </button>
      )}
    </form>
  );
}

function ScorePanel({ campaign, act }: ScreenProps) {
  const s = scorePreview(campaign);
  const exp = activeExpansion(campaign);
  return (
    <section className={`panel ${campaign.gameOver ? "panel--notice" : ""}`} aria-labelledby="score-title">
      <h2 id="score-title" className="panel-title">
        Score
      </h2>
      <dl className="stats stats--3">
        <div>
          <dt>Kingdom fame</dt>
          <dd>{s.kingdom}</dd>
        </div>
        <div>
          <dt>Purged fame</dt>
          <dd>{s.purged}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd className="accent">{s.total}</dd>
        </div>
      </dl>
      <p className="muted small">From your kingdom log. Check it against your cards before writing the score down.</p>

      {campaign.gameOver && !exp && (
        <>
          <h3 className="sub-title">Base game score</h3>
          <p className="muted small">Write it in the first score spot on your box. You can register it online with your kingdom code.</p>
          <ScoreInput id="base-score" label="Base game score" initial={campaign.baseScore} placeholder={s.total} onSave={(n) => act("Base game score", (c) => recordBaseScore(c, n))} />
        </>
      )}
      {!campaign.gameOver && !exp && campaign.baseScore === null && (
        <button
          type="button"
          className="btn btn--ghost btn--wide"
          onClick={() => {
            if (confirm("Mark the base game as finished? Only do this after the final round. You can undo it.")) act("Finish game", finishGame);
          }}
        >
          I've finished the base game
        </button>
      )}
      {campaign.baseScore !== null && !(campaign.gameOver && !exp) && <p>Base game score: <strong>{campaign.baseScore}</strong></p>}
    </section>
  );
}

function ExpansionPanel({ campaign, act }: ScreenProps) {
  const [name, setName] = useState("");
  const [discovers, setDiscovers] = useState(false);
  const [rounds, setRounds] = useState("4");
  const exp = activeExpansion(campaign);
  const blocked = canStartExpansion(campaign);
  const total = scorePreview(campaign).total;

  return (
    <section className="panel" aria-labelledby="exp-title">
      <h2 id="exp-title" className="panel-title">
        Expansions ({campaign.expansions.length}/{MAX_EXPANSIONS})
      </h2>

      {exp && (
        <div className="exp-active">
          <p>
            Playing <strong>{exp.name}</strong> since round {exp.startRound}
            {exp.roundsPlanned ? ` (${exp.roundsPlanned} rounds)` : ""}.
          </p>
          <ol className="steps">
            {EXPANSION_PREP_STEPS.map((step, i) => (
              <li key={step}>
                <label className="check">
                  <input type="checkbox" checked={exp.prep[i]} onChange={() => act("Expansion step", (c) => toggleExpansionPrep(c, exp.id, i), { silent: true })} />
                  <span>{step}</span>
                </label>
              </li>
            ))}
          </ol>
          <p className="muted small">Use the purge helper below for both purges.</p>
          <h3 className="sub-title">Finish {exp.name}</h3>
          <ScoreInput id="exp-score" label={`Score after ${exp.name}`} initial={null} placeholder={total} onSave={(n) => act("Finish expansion", (c) => finishExpansion(c, n))} />
        </div>
      )}

      {campaign.expansions.length > 0 && (
        <ul className="exp-list">
          {campaign.expansions.map((e, i) => (
            <li key={e.id}>
              <span className="exp-num">{i + 1}</span>
              <span className="exp-name">
                {e.name}
                <span className="muted small"> · {e.status === "playing" ? "playing" : "done"}</span>
              </span>
              {e.status === "finished" && (
                <input
                  className="exp-score"
                  type="number"
                  inputMode="numeric"
                  aria-label={`Score after ${e.name}`}
                  defaultValue={e.score ?? ""}
                  key={`${e.id}-${e.score}`}
                  placeholder="score"
                  onBlur={(ev) => {
                    const n = parseWhole(ev.target.value);
                    if (n !== e.score) act("Expansion score", (c) => setExpansionScore(c, e.id, n), { silent: true });
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!exp &&
        (blocked ? (
          <p className="muted small">{blocked} Each kingdom can play up to {MAX_EXPANSIONS} different expansions, one at a time, each once.</p>
        ) : (
          <form
            className="exp-form"
            onSubmit={(e) => {
              e.preventDefault();
              const r = parseWhole(rounds);
              if (act("Start expansion", (c) => startExpansion(c, { name, discoversCards: discovers, roundsPlanned: r }))) setName("");
            }}
          >
            <h3 className="sub-title">Start an expansion</h3>
            <label className="field">
              <span>Expansion name or card number</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Rounds it lasts (empty if it doesn't say)</span>
              <input type="number" inputMode="numeric" min={1} value={rounds} onChange={(e) => setRounds(e.target.value)} />
            </label>
            <label className="check check--plain">
              <input type="checkbox" checked={discovers} onChange={(e) => setDiscovers(e.target.checked)} />
              <span>Discover 2 cards from the box each round</span>
            </label>
            <p className="muted small">Mini expansions don't discover cards each round. Follow the expansion's own instructions.</p>
            <button type="submit" className="btn btn--primary btn--wide" disabled={!name.trim()}>
              Start expansion
            </button>
          </form>
        ))}
    </section>
  );
}

function PurgePanel({ campaign, act }: ScreenProps) {
  const logged = shuffledCardCount(campaign);
  const [deck, setDeck] = useState("");
  const [label, setLabel] = useState("Purge 12");
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const deckN = parseWhole(deck) ?? logged;
  const picks = purgePicks(deckN);
  const candidates = campaign.cards.filter((k) => k.type === "friendly" && (k.status === "kingdom" || k.status === "permanent") && !k.equippedTo);
  const pickedFame = candidates.filter((k) => picked.includes(k.id)).reduce((s, k) => s + k.fame, 0);
  const extraN = parseWhole(extra) ?? 0;

  return (
    <section className="panel" aria-labelledby="purge-title">
      <h2 id="purge-title" className="panel-title">
        Purge helper
      </h2>
      <p className="muted small">
        Purge 12: shuffle your deck and go through it {PURGE_GROUP} cards at a time, choosing 1 friendly card from each group. Stop when fewer than {PURGE_GROUP} are left.
      </p>
      <div className="inline-form">
        <label htmlFor="purge-deck" className="inline-label">
          Cards in deck
        </label>
        <input id="purge-deck" type="number" inputMode="numeric" min={0} placeholder={String(logged)} value={deck} onChange={(e) => setDeck(e.target.value)} />
      </div>
      <p>
        Choose <strong>{picks}</strong> card{picks === 1 ? "" : "s"} ({deckN} ÷ {PURGE_GROUP}).
      </p>

      <label className="field">
        <span>What is this purge?</span>
        <select value={label} onChange={(e) => setLabel(e.target.value)}>
          <option>Purge 12</option>
          <option>Purge 1 permanent card</option>
          <option>Other purge</option>
        </select>
      </label>

      {candidates.length > 0 && (
        <fieldset className="editor-group">
          <legend>Purged cards from your log</legend>
          <ul className="pick-list">
            {candidates
              .filter((k) => (label === "Purge 1 permanent card" ? k.status === "permanent" : label === "Purge 12" ? k.status === "kingdom" : true))
              .map((k) => (
                <li key={k.id}>
                  <label className="check check--plain">
                    <input
                      type="checkbox"
                      checked={picked.includes(k.id)}
                      onChange={(e) => setPicked(e.target.checked ? [...picked, k.id] : picked.filter((x) => x !== k.id))}
                    />
                    <span>
                      {cardLabel(k)} <span className="muted">· fame {k.fame}</span>
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </fieldset>
      )}
      <label className="field">
        <span>Fame of purged cards not in your log</span>
        <input type="number" inputMode="numeric" value={extra} placeholder="0" onChange={(e) => setExtra(e.target.value)} />
      </label>
      <p>
        Purged fame for this purge: <strong>{pickedFame + extraN}</strong>
      </p>
      <button
        type="button"
        className="btn btn--primary btn--wide"
        onClick={() => {
          if (act("Purge", (c) => applyPurge(c, { label, cardIds: picked, extraFame: extraN }))) {
            setPicked([]);
            setExtra("");
          }
        }}
      >
        Record purge
      </button>

      {campaign.purges.length > 0 && (
        <>
          <h3 className="sub-title">Purged fame so far</h3>
          <ul className="purge-list">
            {campaign.purges.map((p) => (
              <li key={p.id}>
                <span>
                  {p.label} <span className="muted small">· round {p.round}</span>
                </span>
                <strong>+{p.fame}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      <label className="field">
        <span>Correction (purged fame from before you used this app)</span>
        <input
          type="number"
          inputMode="numeric"
          defaultValue={campaign.purgedFameAdjust || ""}
          key={campaign.purgedFameAdjust}
          placeholder="0"
          onBlur={(e) => {
            const n = parseWhole(e.target.value) ?? 0;
            if (n !== campaign.purgedFameAdjust) act("Purged fame correction", (c) => setPurgedFameAdjust(c, n));
          }}
        />
      </label>
    </section>
  );
}

function SlotsPanel({ campaign, ledger, actLedger }: { campaign: ScreenProps["campaign"]; ledger: LedgerState; actLedger: Props["actLedger"] }) {
  const [name, setName] = useState("");
  return (
    <section className="panel" aria-labelledby="slots-title">
      <h2 id="slots-title" className="panel-title">
        Save slots
      </h2>
      <ul className="slot-list">
        {ledger.campaigns.map((c) => (
          <li key={c.id} className={c.id === campaign.id ? "is-active" : ""}>
            <button type="button" className="slot-main" onClick={() => c.id !== campaign.id && actLedger("Switch kingdom", (l) => switchCampaign(l, c.id))} aria-current={c.id === campaign.id}>
              <span className="slot-name">{c.name}</span>
              <span className="muted small">
                Round {c.round.number}
                {c.kingdomCode ? ` · ${c.kingdomCode}` : ""}
                {c.gameOver ? " · game over" : ""}
              </span>
            </button>
            {ledger.campaigns.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                aria-label={`Delete ${c.name}`}
                onClick={() => confirm(`Delete "${c.name}"? You can undo this.`) && actLedger("Delete kingdom", (l) => deleteCampaign(l, c.id))}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (actLedger("New kingdom", (l) => addCampaign(l, name))) setName("");
        }}
      >
        <label className="sr-only" htmlFor="new-kingdom">
          New kingdom name
        </label>
        <input id="new-kingdom" type="text" placeholder="New kingdom name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn">
          New
        </button>
      </form>
    </section>
  );
}
