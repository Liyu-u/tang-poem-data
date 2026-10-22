import type { KeyboardEvent } from 'react';
import type { Period } from '../types/domain';
import type { TimelineLayout } from '../types/visualization';

type Props = {
  layout: TimelineLayout;
  selectedPeriod?: Period | null;
  onSelectPeriod: (period: Period) => void;
  onSelectPoet?: (poetId: string) => void;
  onSelectPoem?: (poemId: string) => void;
};

function pointAt(angle: number, radius: number, center: { x: number; y: number }) {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

function arcPath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number, center: { x: number; y: number }) {
  const outerStart = pointAt(startAngle, outerRadius, center);
  const outerEnd = pointAt(endAngle, outerRadius, center);
  const innerEnd = pointAt(endAngle, innerRadius, center);
  const innerStart = pointAt(startAngle, innerRadius, center);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function activateOnEnter(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export function TangTimelineWheel({ layout, selectedPeriod, onSelectPeriod, onSelectPoet, onSelectPoem }: Props) {
  const activePoems = layout.poems.length;
  return (
    <figure className="data-viz data-viz--timeline">
      <svg
        className="data-viz__svg"
        role="img"
        aria-label="诗脉千年时间图谱"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <title>诗脉千年：时期、诗人和诗作关系</title>
        <g aria-hidden="true">
          {layout.poets.map((poet) => (
            <line key={`spoke-${poet.id}`} x1={layout.center.x} y1={layout.center.y} x2={poet.x} y2={poet.y} className="data-viz__spoke" />
          ))}
        </g>
        <g>
          {layout.periods.map((period) => {
            const selected = selectedPeriod === period.id;
            return (
              <g key={period.id}>
                <path
                  d={arcPath(period.startAngle, period.endAngle, period.innerRadius, period.outerRadius, layout.center)}
                  className={`data-viz__period ${selected ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`筛选${period.label}，${period.poemCount}首诗`}
                  onClick={() => onSelectPeriod(period.id as Period)}
                  onKeyDown={(event) => activateOnEnter(event, () => onSelectPeriod(period.id as Period))}
                />
                <text
                  x={layout.center.x + Math.cos((period.startAngle + period.endAngle) / 2) * 115}
                  y={layout.center.y + Math.sin((period.startAngle + period.endAngle) / 2) * 115}
                  className="data-viz__period-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {period.label}
                </text>
              </g>
            );
          })}
        </g>
        <g>
          {layout.poets.map((poet) => (
            <g key={poet.id}>
              <circle
                cx={poet.x}
                cy={poet.y}
                r={poet.radius}
                className="data-viz__poet-node"
                role="button"
                tabIndex={0}
                aria-label={`查看诗人${poet.label}`}
                onClick={() => onSelectPoet?.(poet.id)}
                onKeyDown={(event) => activateOnEnter(event, () => onSelectPoet?.(poet.id))}
              />
              <text x={poet.x} y={poet.y - poet.radius - 7} className="data-viz__node-label" textAnchor="middle">{poet.label}</text>
            </g>
          ))}
          {layout.poems.map((poem) => (
            <circle
              key={poem.id}
              cx={poem.x}
              cy={poem.y}
              r={poem.radius}
              className="data-viz__poem-node"
              role="button"
              tabIndex={0}
              aria-label={`打开诗作${poem.label}`}
              onClick={() => onSelectPoem?.(poem.id)}
              onKeyDown={(event) => activateOnEnter(event, () => onSelectPoem?.(poem.id))}
            />
          ))}
        </g>
        <circle cx={layout.center.x} cy={layout.center.y} r="42" className="data-viz__center" />
        <text x={layout.center.x} y={layout.center.y} className="data-viz__center-label" textAnchor="middle" dominantBaseline="middle">唐</text>
      </svg>
      <figcaption className="data-viz__caption">当前显示 {activePoems} 首诗作；点击时期、诗人或诗作继续探索。</figcaption>
    </figure>
  );
}
