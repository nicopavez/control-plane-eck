export function Close() {
  return (
    <section id="close" className="close-section" aria-labelledby="close-title">
      <header className="scrolly-section-header">
        <p className="eyebrow">Where this goes next</p>
        <h2 id="close-title">Philosophy, roadmap, and the ask</h2>
      </header>
      <div className="close-body">
        <p>
          ECK is correct and well-tested, but it hands the operator a CRD and a `kubectl` prompt
          and calls it a day. Routine lifecycle work, checking health, reading credentials,
          scaling a node set, rolling an upgrade, still means hand-parsing status fields and
          editing YAML with no feedback loop. That gap is the whole premise of this prototype:
          encode ECK&apos;s real semantics (NodeSet to StatefulSet mapping, secret naming, condition
          shapes) once, behind a small API, and let a fast terminal UI be the only interface an
          operator needs for the common path.
        </p>
        <p>
          This is deliberately narrow. It does not try to replace ECK, own reconciliation, or
          touch indices or snapshots, both real, acknowledged gaps in ECK itself rather than
          problems this prototype should quietly paper over. It is an operator-experience layer
          on top of a control plane that already works.
        </p>
        <ul>
          <li>Roadmap: real index management and snapshot/restore support once ECK or a sibling CRD covers them.</li>
          <li>Roadmap: a scripted E2E timing harness so the before/after numbers in this deck update themselves on every ECK version bump.</li>
          <li>Ask: feedback on scope, should this stay a thin TUI, or is a hosted dashboard the more useful shape for an SRE team?</li>
        </ul>
        <p className="handoff-line">Now let&apos;s see it live.</p>
      </div>
    </section>
  );
}
