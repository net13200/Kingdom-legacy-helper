import { useEffect, useRef, useState } from "react";
import { backupFileName, parseBackup, toBackup } from "../logic/backup";
import { newCampaign } from "../logic/defaults";
import { addResource, removeResource } from "../logic/turn";
import type { Theme } from "../logic/types";
import type { useLedger } from "../useLedger";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  store: ReturnType<typeof useLedger>;
}

export function Menu({ open, onClose, theme, setTheme, store }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resName, setResName] = useState("");
  const [resIcon, setResIcon] = useState("");
  const { campaign } = store;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const exportBackup = async () => {
    const json = JSON.stringify(toBackup(store.ledger), null, 2);
    const name = backupFileName();
    const file = new File([json], name, { type: "application/json" });
    // On iPhone the share sheet is the friendliest way to save to Files or send it somewhere.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Kingdom Ledger backup" });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.notify(["Backup saved."]);
  };

  const importBackup = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if ("error" in parsed) return store.notify([parsed.error], "error");
    store.replaceLedger("Import backup", parsed.ledger);
    store.notify(["Backup restored. Undo brings back what you had."]);
    onClose();
  };

  const submitResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (store.act("Add resource", (c) => addResource(c, resName, resIcon))) {
      setResName("");
      setResIcon("");
    }
  };

  const resetCampaign = () => {
    if (!confirm(`Start "${campaign.name}" over from round 1? You can undo this.`)) return;
    store.act("Reset campaign", (c) => ({ ...newCampaign(c.name, c.id), kingdomCode: c.kingdomCode, resources: c.resources, counts: Object.fromEntries(c.resources.map((r) => [r.id, 0])) }));
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="menu-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="menu-title">Menu</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Done
          </button>
        </div>

        <section className="sheet-section">
          <div className="row-2">
            <button type="button" className="btn" onClick={store.undo} aria-disabled={!store.canUndo}>
              ↶ Undo
            </button>
            <button type="button" className="btn" onClick={store.redo} aria-disabled={!store.canRedo}>
              Redo ↷
            </button>
          </div>
          {store.undoLabel && <p className="muted small">Last action: {store.undoLabel}</p>}
        </section>

        <section className="sheet-section">
          <h3>Appearance</h3>
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                className={theme === t ? "is-on" : ""}
                onClick={() => setTheme(t)}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </section>

        <section className="sheet-section">
          <h3>Resources</h3>
          <p className="muted small">Expansions add resources. Add them here; base-game ones stay.</p>
          <ul className="res-manage">
            {campaign.resources.map((r) => (
              <li key={r.id}>
                <span aria-hidden="true">{r.icon}</span> {r.name}
                {!r.builtin && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    aria-label={`Remove ${r.name}`}
                    onClick={() => store.act("Remove resource", (c) => removeResource(c, r.id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form className="res-add" onSubmit={submitResource}>
            <label className="field field--icon">
              <span>Icon</span>
              <input value={resIcon} onChange={(e) => setResIcon(e.target.value)} placeholder="✦" maxLength={4} />
            </label>
            <label className="field">
              <span>New resource</span>
              <input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="e.g. Grain" />
            </label>
            <button type="submit" className="btn btn--primary" disabled={!resName.trim()}>
              Add
            </button>
          </form>
        </section>

        <section className="sheet-section">
          <h3>Backup</h3>
          <p className="muted small">Everything is saved on this device automatically. Export a file to keep a copy.</p>
          <div className="row-2">
            <button type="button" className="btn" onClick={exportBackup}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importBackup(f);
            }}
          />
          <button type="button" className="btn btn--danger btn--wide" onClick={resetCampaign}>
            Start this kingdom over
          </button>
        </section>

        <footer className="sheet-foot">
          <p>
            A bookkeeping helper for <em>Kingdom Legacy: Feudal Kingdom</em> by FryxGames. Unofficial; no card content
            included.
          </p>
          <p>
            Part of{" "}
            <a href="https://net13200.github.io/SugiGames/" target="_blank" rel="noopener">
              <span className="word-sugi">Sugi</span>
              <span className="word-games">Games</span>
            </a>
          </p>
        </footer>
      </div>
    </dialog>
  );
}
