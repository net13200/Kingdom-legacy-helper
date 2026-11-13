import { useState } from "react";
import { KEYWORDS, MAX_PRODUCTION_FOR_STICKER, newId } from "../logic/defaults";
import { addCard, cardLabel, deleteCard, STATUS_LABELS, TYPE_LABELS, updateCard } from "../logic/kingdom";
import type { CardRecord, CardStatus, CardType, Orientation } from "../logic/types";
import { Segmented, Sheet, Stepper, type ScreenProps } from "./common";

const ORIENTATIONS: { value: Orientation; label: string; hint: string }[] = [
  { value: "front-top", label: "Front · top", hint: "Serial number at the top" },
  { value: "front-bottom", label: "Front · bottom", hint: "Rotated" },
  { value: "back-top", label: "Back · top", hint: "Flipped" },
  { value: "back-bottom", label: "Back · bottom", hint: "Flipped and rotated" },
];

const STATUS_ORDER: CardStatus[] = ["kingdom", "permanent", "destroyed", "purged", "undiscovered"];
const TYPE_ORDER: CardType[] = ["friendly", "enemy", "event", "parchment"];

interface Props extends ScreenProps {
  /** Card being edited, or null to add a new one. */
  card: CardRecord | null;
  open: boolean;
  onClose: () => void;
}

export function CardEditor({ campaign, act, card, open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={card ? `Card ${cardLabel(card)}` : "Add a card"}>
      {open && <EditorBody key={card?.id ?? "new"} campaign={campaign} act={act} card={card} onClose={onClose} />}
    </Sheet>
  );
}

function EditorBody({ campaign, act, card, onClose }: Omit<Props, "open">) {
  const [draft, setDraft] = useState<CardRecord>(
    card ?? {
      id: "",
      serial: NaN,
      name: "",
      type: "friendly",
      keywords: [],
      orientation: "front-top",
      status: "kingdom",
      boosts: {},
      stickers: [],
      checkboxesMarked: 0,
      oneTimeCrossedOut: 0,
      equippedTo: null,
      fame: 0,
      notes: "",
      addedRound: campaign.round.number,
    },
  );
  const [serialText, setSerialText] = useState(card ? String(card.serial) : "");
  const [stickerText, setStickerText] = useState("");
  const set = (patch: Partial<CardRecord>) => setDraft((d) => ({ ...d, ...patch }));
  const holders = campaign.cards.filter((k) => k.id !== draft.id && (k.status === "kingdom" || k.status === "permanent") && k.equippedTo !== draft.id);
  const boostTotal = Object.values(draft.boosts).reduce((a, b) => a + b, 0);

  const save = () => {
    const serial = Number(serialText);
    const { id: _id, ...fields } = draft;
    void _id;
    const ok = card
      ? act(`Edit ${cardLabel(draft)}`, (c) => updateCard(c, card.id, { ...fields, serial }))
      : act("Add card", (c) => addCard(c, { ...fields, serial }));
    if (ok) onClose();
  };

  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="editor-row">
        <label className="field field--serial">
          <span>Serial #</span>
          <input type="number" inputMode="numeric" min={0} required value={serialText} onChange={(e) => setSerialText(e.target.value)} />
        </label>
        <label className="field">
          <span>Name (as you see it)</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
        </label>
      </div>

      <fieldset className="editor-group">
        <legend>Type</legend>
        <Segmented label="Type" value={draft.type} onChange={(type) => set({ type })} options={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} />
      </fieldset>

      <fieldset className="editor-group">
        <legend>Keywords</legend>
        <div className="chips">
          {KEYWORDS.map((k) => {
            const on = draft.keywords.includes(k);
            return (
              <button
                key={k}
                type="button"
                className={`chip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => set({ keywords: on ? draft.keywords.filter((x) => x !== k) : [...draft.keywords, k] })}
              >
                {k}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="editor-group">
        <legend>Status</legend>
        <select value={draft.status} onChange={(e) => set({ status: e.target.value as CardStatus })} aria-label="Status">
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="editor-group">
        <legend>Orientation</legend>
        <div className="orient-grid" role="radiogroup" aria-label="Orientation">
          {ORIENTATIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={draft.orientation === o.value}
              className={`orient ${draft.orientation === o.value ? "is-on" : ""}`}
              onClick={() => set({ orientation: o.value })}
            >
              <span className={`orient-icon orient-icon--${o.value}`} aria-hidden="true" />
              <span>{o.label}</span>
              <span className="muted small">{o.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="editor-counters">
        <div className="counter-row">
          <span>Fame now</span>
          <Stepper label="Fame" value={draft.fame} onChange={(fame) => set({ fame })} compact />
        </div>
        <div className="counter-row">
          <span>Checkboxes marked</span>
          <Stepper label="Checkboxes marked" value={draft.checkboxesMarked} min={0} onChange={(n) => set({ checkboxesMarked: n })} compact />
        </div>
        <div className="counter-row">
          <span>One-time effects crossed out</span>
          <Stepper label="One-time effects crossed out" value={draft.oneTimeCrossedOut} min={0} onChange={(n) => set({ oneTimeCrossedOut: n })} compact />
        </div>
      </div>

      <fieldset className="editor-group">
        <legend>Resource stickers (boosts)</legend>
        <p className="muted small">No resource sticker on a card with {MAX_PRODUCTION_FOR_STICKER} or more production.</p>
        {campaign.resources.map((r) => (
          <div className="counter-row" key={r.id}>
            <span>
              <span aria-hidden="true">{r.icon}</span> {r.name}
            </span>
            <Stepper
              label={`${r.name} stickers`}
              value={draft.boosts[r.id] ?? 0}
              min={0}
              compact
              onChange={(n) => {
                const boosts = { ...draft.boosts, [r.id]: n };
                if (n === 0) delete boosts[r.id];
                set({ boosts });
              }}
            />
          </div>
        ))}
        {boostTotal > 0 && <p className="muted small">{boostTotal} resource sticker{boostTotal === 1 ? "" : "s"} on this card.</p>}
      </fieldset>

      <fieldset className="editor-group">
        <legend>Other stickers</legend>
        <ul className="sticker-list">
          {draft.stickers.map((s) => (
            <li key={s.id}>
              <span>{s.text}</span>
              <button type="button" className="btn btn--ghost btn--small" aria-label={`Remove sticker ${s.text}`} onClick={() => set({ stickers: draft.stickers.filter((x) => x.id !== s.id) })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-form">
          <label className="sr-only" htmlFor="sticker-input">
            Describe a sticker
          </label>
          <input id="sticker-input" type="text" placeholder="e.g. sticker 7, tab" value={stickerText} onChange={(e) => setStickerText(e.target.value)} />
          <button
            type="button"
            className="btn"
            disabled={!stickerText.trim()}
            onClick={() => {
              set({ stickers: [...draft.stickers, { id: newId(), text: stickerText.trim() }] });
              setStickerText("");
            }}
          >
            Add
          </button>
        </div>
      </fieldset>

      <fieldset className="editor-group">
        <legend>Equipped to</legend>
        <select
          aria-label="Equipped to"
          value={draft.equippedTo ?? ""}
          onChange={(e) => set({ equippedTo: e.target.value || null })}
        >
          <option value="">Not equipped</option>
          {holders.map((h) => (
            <option key={h.id} value={h.id}>
              {cardLabel(h)}
            </option>
          ))}
        </select>
        <p className="muted small">Log the equipment's own fame on its card; it's counted once.</p>
      </fieldset>

      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>

      <div className="editor-actions">
        <button type="submit" className="btn btn--primary btn--wide" disabled={serialText === ""}>
          {card ? "Save card" : "Add card"}
        </button>
        {card && (
          <button
            type="button"
            className="btn btn--danger btn--wide"
            onClick={() => {
              if (act(`Delete ${cardLabel(card)}`, (c) => deleteCard(c, card.id))) onClose();
            }}
          >
            Delete log entry
          </button>
        )}
        {card && <p className="muted small">To record a card leaving the game, change its status instead. Delete only fixes mistakes (and can be undone).</p>}
      </div>
    </form>
  );
}
