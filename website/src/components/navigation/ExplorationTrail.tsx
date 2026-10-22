import type { TrailNode } from '../../store/explorer';

type ExplorationTrailProps = {
  trail: TrailNode[];
  onRestore: (node: TrailNode) => void;
};

export function ExplorationTrail({ trail, onRestore }: ExplorationTrailProps) {
  if (trail.length === 0) return null;

  return (
    <nav className="exploration-trail" aria-label="探索路径">
      <span className="exploration-trail__label">探索路径</span>
      <ol>
        {trail.map((node, index) => (
          <li key={`${node.type}-${node.label}-${index}`}>
            <button type="button" onClick={() => onRestore(node)}>{node.label}</button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
