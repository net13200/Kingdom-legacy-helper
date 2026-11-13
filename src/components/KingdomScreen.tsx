import { useState } from "react";
import { addStartingKingdom, cardLabel, filterCards, findBySerial, scorePreview, STATUS_LABELS, TYPE_LABELS, type CardFilter } from "../logic/kingdom";
import type { CardRecord, CardStatus, CardType } from "../logic/types";
import type { ScreenProps } from "./common";
import { CardEditor } from "./CardEditor";

const STATUS_FILTERS: (CardStatus | "all")[] = ["all", "kingdom", "permanent", "destroyed", "purged", "undiscovered"];
const TYPE_FILTERS: (CardType | "all")[] = ["all", "friendly", "enemy", "event", "parchment"];

const ORIENT_SHORT = { "front-top": "Front ↑", "front-bottom": "Front ↓", "back-top": "Back ↑", "back-bottom": "Back ↓" } as const;

export function KingdomScreen({ campaign, act }: ScreenProps) {
  const [filter, setFilter] = useState<CardFilter>({ status: "all", type: "all", query: "" });
  const [editing, setEditing] = useState<CardRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const score = scorePreview(campaign);
  const cards = filterCards(campaign.cards, filter);
  const missingStart = !findBySerial(campaign, 1);

  return (
    <>
      <section className="panel" aria-labelledby="fame-title">
        <h2 id="fame-title" className="panel-title">
          Fame
        </h2>
        <dl className="stats stats--3">
          <div>
            <dt>Kingdom</dt>
            <dd>{score.kingdom}</dd>
          </div>
          <div>
            <dt>Purged</dt>
            <dd>{score.purged}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd className="accent">{score.total}</dd>
          </div>
        </dl>
        <p className="muted small">Kingdom fame counts cards in your kingdom and permanent cards.</p>
      </section>

      <div className="row-2">
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          + Add card
        </button>
        {missingStart ? (
          <button type="button" className="btn" onClick={() => act("Add starting kingdom", addStartingKingdom)}>
            Add cards 1–10
          </button>
        ) : (
          <span />
        )}
      </div>

      <section className="panel" aria-label="Kingdom log">
        <div className="filters">
          <label className="sr-only" htmlFor="card-search">
            Search by name or number
          </label>
          <input
            id="card-search"
            type="search"
            placeholder="Search name or #"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
          <div className="filter-row">
            <label className="sr-only" htmlFor="status-filter">
              Status
            </label>
            <select id="status-filter" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as CardFilter["status"] })}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Any status" : STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="type-filter">
              Type
            </label>
            <select id="type-filter" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value as CardFilter["type"] })}>
              {TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "Any type" : TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {campaign.cards.length === 0 ? (
          <p className="empty">Your log is empty. Add each card as you discover it. Nothing is filled in for you.</p>
        ) : cards.length === 0 ? (
          <p className="empty">No cards match.</p>
        ) : (
          <ul className="card-list">
            {cards.map((k) => {
              const holder = k.equippedTo ? campaign.cards.find((h) => h.id === k.equippedTo) : null;
              const boosts = Object.values(k.boosts).reduce((a, b) => a + b, 0);
              return (
                <li key={k.id}>
                  <button type="button" className={`card-row card-row--${k.type} ${k.status !== "kingdom" && k.status !== "permanent" ? "is-gone" : ""}`} onClick={() => setEditing(k)}>
                    <span className="card-serial">#{k.serial}</span>
                    <span className="card-main">
                      <span className="card-name">{k.name.trim() || <span className="muted">Tap to fill in</span>}</span>
                      <span className="card-meta">
                        {TYPE_LABELS[k.type]} · {STATUS_LABELS[k.status]} · {ORIENT_SHORT[k.orientation]}
                        {holder && ` · on ${cardLabel(holder)}`}
                        {boosts > 0 && ` · ${boosts} boost${boosts === 1 ? "" : "s"}`}
                        {k.stickers.length > 0 && ` · ${k.stickers.length} sticker${k.stickers.length === 1 ? "" : "s"}`}
                        {k.checkboxesMarked > 0 && ` · ☑ ${k.checkboxesMarked}`}
                        {k.oneTimeCrossedOut > 0 && ` · ✕ ${k.oneTimeCrossedOut}`}
                      </span>
                    </span>
                    <span className="card-fame" aria-label={`Fame ${k.fame}`}>
                      {k.fame}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">
          {cards.length} of {campaign.cards.length} card{campaign.cards.length === 1 ? "" : "s"}
        </p>
      </section>

      <CardEditor
        campaign={campaign}
        act={act}
        card={editing}
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </>
  );
}
