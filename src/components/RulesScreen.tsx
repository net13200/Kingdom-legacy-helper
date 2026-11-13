import { Fragment, useMemo } from "react";
import source from "../content/rules.md?raw";
import { parseMarkdown, type Inline } from "../logic/markdown";

export const RULES_PDF = "https://fryxgames.se/wp-content/uploads/2023/12/FK-Rules-2nd-edition.pdf";

function InlineText({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.kind === "text" && p.text}
          {p.kind === "bold" && <strong>{p.text}</strong>}
          {p.kind === "italic" && <em>{p.text}</em>}
          {p.kind === "link" && (
            <a href={p.href} target="_blank" rel="noopener">
              {p.text}
            </a>
          )}
        </Fragment>
      ))}
    </>
  );
}

export function RulesScreen() {
  const blocks = useMemo(() => parseMarkdown(source), []);
  const sections = blocks.filter((b) => b.kind === "heading" && b.level === 2);

  return (
    <>
      <section className="panel">
        <a className="btn btn--primary btn--wide pdf-link" href={RULES_PDF} target="_blank" rel="noopener">
          Official rules (PDF) ↗
        </a>
        <p className="muted small">The PDF needs a connection. The notes below work offline.</p>
        <nav aria-label="Rules sections">
          <ul className="toc">
            {sections.map((b) => b.kind === "heading" && (
              <li key={b.id}>
                <a href={`#${b.id}`}>{b.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      </section>
      <article className="panel rules">
        {blocks.map((b, i) => {
          if (b.kind === "heading") {
            const H = (`h${b.level + 1}` as "h2" | "h3" | "h4");
            return (
              <H key={i} id={b.id} className="rules-h">
                {b.text}
              </H>
            );
          }
          if (b.kind === "list") {
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <InlineText parts={it} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i}>
              <InlineText parts={b.inline} />
            </p>
          );
        })}
      </article>
    </>
  );
}
