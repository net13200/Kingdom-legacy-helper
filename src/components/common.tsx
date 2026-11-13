import { useEffect, useRef, type ReactNode } from "react";
import type { Campaign } from "../logic/types";
import type { CampaignAction } from "../useLedger";

export type Act = (label: string, action: CampaignAction, opts?: { silent?: boolean }) => boolean;

export interface ScreenProps {
  campaign: Campaign;
  act: Act;
}

export function Stepper(props: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  compact?: boolean;
}) {
  const min = props.min ?? -Infinity;
  const atMin = props.value <= min;
  return (
    <div className={`stepper ${props.compact ? "stepper--compact" : ""}`} role="group" aria-label={props.label}>
      <button
        type="button"
        className="step"
        aria-label={`${props.label}: minus 1`}
        aria-disabled={atMin}
        onClick={() => !atMin && props.onChange(props.value - 1)}
      >
        −
      </button>
      <output className="stepper-value" aria-live="polite">
        {props.value}
      </output>
      <button type="button" className="step step--plus" aria-label={`${props.label}: plus 1`} onClick={() => props.onChange(props.value + 1)}>
        +
      </button>
    </div>
  );
}

export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);
  const titleId = `sheet-${props.title.replace(/\W+/g, "-")}`;
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={props.onClose}
      onClick={(e) => e.target === ref.current && props.onClose()}
    >
      {props.open && (
        <div className="sheet-body">
          <div className="sheet-head">
            <h2 id={titleId}>{props.title}</h2>
            <div className="sheet-head-actions">
              {props.action}
              <button type="button" className="btn btn--ghost btn--small" onClick={props.onClose}>
                {props.action ? "Cancel" : "Done"}
              </button>
            </div>
          </div>
          {props.children}
        </div>
      )}
    </dialog>
  );
}

export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label} style={{ gridTemplateColumns: `repeat(${props.options.length}, 1fr)` }}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={props.value === o.value ? "is-on" : ""}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A number input that commits on Enter / blur. Empty means null. */
export function parseWhole(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : NaN;
}
