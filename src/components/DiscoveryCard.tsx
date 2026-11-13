import { useState } from "react";
import { FINAL_CARD, RESET_CARD } from "../logic/defaults";
import { confirmDiscovery, discoveryPending, skipDiscovery, upcoming } from "../logic/discovery";
import type { ScreenProps } from "./common";

/** "Discover next: #X and #Y" with the parchment question. Shown at the start of a round. */
export function DiscoveryCard({ campaign, act }: ScreenProps) {
  const [parchment, setParchment] = useState(false);
  if (!discoveryPending(campaign)) return null;
  const next = upcoming(campaign, 2);

  if (next.length === 0) {
    return (
      <section className="panel panel--discover" aria-labelledby="disc-title">
        <h2 id="disc-title" className="panel-title">
          Discovery
        </h2>
        <p>No cards up to #{FINAL_CARD} are left in the box at the counter. Check the counter on the Rounds tab.</p>
        <button type="button" className="btn btn--ghost btn--wide" onClick={() => act("Skip discovery", skipDiscovery)}>
          No discovery this round
        </button>
      </section>
    );
  }

  const [first, second] = next;
  return (
    <section className="panel panel--discover" aria-labelledby="disc-title">
      <h2 id="disc-title" className="panel-title">
        Round {campaign.round.number}: discover
      </h2>
      <p className="discover-next">
        Discover next: <strong>#{first}</strong>
        {second !== undefined && (
          <>
            {" "}
            and <strong className={parchment ? "is-struck" : ""}>#{second}</strong>
          </>
        )}
      </p>
      <label className="check check--plain">
        <input type="checkbox" checked={parchment} onChange={(e) => setParchment(e.target.checked)} />
        <span>Was #{first} a parchment card?</span>
      </label>
      <p className="muted small">
        {parchment
          ? `Only #${first} is discovered. Follow its instructions, then destroy it.`
          : "Take them from the box without looking at other cards, and add them to your discard pile."}
        {next.includes(RESET_CARD) && ` Discovering #${RESET_CARD} closes the reset window.`}
      </p>
      <div className="row-2">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            if (act("Discover cards", (c) => confirmDiscovery(c, parchment))) setParchment(false);
          }}
        >
          Done
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => act("Skip discovery", skipDiscovery)}>
          Skip
        </button>
      </div>
    </section>
  );
}
