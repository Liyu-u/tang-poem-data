import type { KeyboardEvent } from 'react';
import type { ImageryLayout } from '../lib/visualizations/imagery';

type Props = {
  layout: ImageryLayout;
  onSelectImagery: (imagery: string) => void;
  onSelectLink: (source: string, target: string) => void;
};

function activateOnEnter(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export function ImageryChord({ layout, onSelectImagery, onSelectLink }: Props) {
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  return (
    <figure className="data-viz data-viz--imagery">
      <svg
        className="data-viz__svg"
        role="img"
        aria-label="诗有万象意象关系图"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <title>诗有万象：意象共现关系</title>
        <g>
          {layout.links.map((link) => {
            const source = nodeById.get(link.source);
            const target = nodeById.get(link.target);
            if (!source || !target) return null;
            return (
              <path
                key={link.key}
                d={link.path}
                className="data-viz__imagery-link"
                strokeWidth={Math.min(8, 1 + link.poemCount * 0.7)}
                role="button"
                tabIndex={0}
                aria-label={`查看${source.label}与${target.label}的共现，${link.poemCount}首诗`}
                onClick={() => onSelectLink(source.label, target.label)}
                onKeyDown={(event) => activateOnEnter(event, () => onSelectLink(source.label, target.label))}
              />
            );
          })}
        </g>
        <g>
          {layout.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                className={`data-viz__imagery-node ${node.selected ? 'is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`查看意象${node.label}，${node.poemCount}首诗`}
                onClick={() => onSelectImagery(node.label)}
                onKeyDown={(event) => activateOnEnter(event, () => onSelectImagery(node.label))}
              />
              <text x={node.x} y={node.y + node.radius + 15} className="data-viz__node-label" textAnchor="middle">{node.label}</text>
            </g>
          ))}
        </g>
        <circle cx={layout.center.x} cy={layout.center.y} r="30" className="data-viz__center data-viz__center--teal" />
        <text x={layout.center.x} y={layout.center.y} className="data-viz__center-label" textAnchor="middle" dominantBaseline="middle">万象</text>
      </svg>
      <figcaption className="data-viz__caption">节点大小表示涉及诗作数量，连线表示意象共现。</figcaption>
    </figure>
  );
}
