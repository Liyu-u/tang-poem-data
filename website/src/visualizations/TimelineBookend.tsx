import { timelineBookends, type TimelineBookendKind } from '../data/timelineBookends';

export function TimelineBookend({ kind, onPrimary, onDirectory }: {
  kind: TimelineBookendKind;
  onPrimary: () => void;
  onDirectory: () => void;
}) {
  const scene = timelineBookends[kind];
  return (
    <section className="timeline-bookend" aria-label={`${scene.label} · ${scene.year}`}>
      <p className="timeline-bookend__date">{scene.label} · {scene.year}</p>
      <h3 aria-label={scene.heading.join(' ')}>{scene.heading.map((line) => <span key={line}>{line}</span>)}</h3>
      <div className="timeline-bookend__prose" data-timeline-reading tabIndex={0} aria-label={`${scene.label}导语`}>
        {scene.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      {kind === 'prologue' && <TimelineBookendActions kind={kind} onPrimary={onPrimary} onDirectory={onDirectory} />}
    </section>
  );
}

export function TimelineBookendActions({ kind, onPrimary, onDirectory }: {
  kind: TimelineBookendKind; onPrimary: () => void; onDirectory: () => void;
}) {
  return <div className="timeline-bookend__actions">
    <button type="button" onClick={onPrimary}>{timelineBookends[kind].action}</button>
    {kind === 'epilogue' && <button type="button" className="timeline-bookend__secondary" onClick={onDirectory}>回看十一首诗 →</button>}
  </div>;
}
