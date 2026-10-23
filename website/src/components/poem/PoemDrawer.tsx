import { useEffect } from 'react';
import type { PoemRecord } from '../../types/domain';

type Props = {
  poem: PoemRecord;
  onClose: () => void;
};

export function PoemDrawer({ poem, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const annotations = poem.annotations;
  const labels = [
    ...poem.themes,
    ...poem.imagery,
    ...poem.colors,
    ...poem.techniques,
  ].filter(Boolean);

  return (
    <aside className="poem-drawer" role="dialog" aria-modal="true" aria-labelledby={`poem-drawer-${poem.id}`}>
      <div className="poem-drawer__backdrop" aria-hidden="true" />
      <div className="poem-drawer__panel">
        <div className="poem-drawer__header">
          <div>
            <p className="poem-drawer__eyebrow">{poem.poetName} · {poem.poeticForm}</p>
            <h2 id={`poem-drawer-${poem.id}`}>{poem.title}</h2>
          </div>
          <button type="button" className="poem-drawer__close" aria-label="关闭诗作详情" onClick={onClose}>×</button>
        </div>
        <div className="poem-drawer__text">
          {poem.lineTexts.map((line, index) => <p key={`${poem.id}-${index}`}>{line}</p>)}
        </div>
        <div className="poem-drawer__tags" aria-label="诗作标签">
          {labels.map((label) => <span key={label} className="poem-drawer__tag">{label}</span>)}
        </div>
        {annotations?.imagery.length ? (
          <section className="poem-drawer__section" aria-labelledby={`imagery-${poem.id}`}>
            <h3 id={`imagery-${poem.id}`}>意象证据</h3>
            <ul>{annotations.imagery.slice(0, 8).map((item) => <li key={item.id}>{item.name}{item.quote ? ` · ${item.quote}` : ''}</li>)}</ul>
          </section>
        ) : null}
        <p className="poem-drawer__source">来源：{poem.sourceLabel}</p>
      </div>
    </aside>
  );
}

