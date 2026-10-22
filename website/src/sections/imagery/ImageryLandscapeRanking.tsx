import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { ImageryChapterContent } from './imageryContent';
import './imagery-landscape-ranking.css';
import { ImagerySceneMotion } from './ImagerySceneMotion';
import { artworkPoint, type ScenePointer } from './sceneMotionRenderer';

const artwork = new URL('../../assets/imagery-ridgeline-paper.png', import.meta.url).href;
const number = new Intl.NumberFormat('zh-CN');
// Coordinates belong to the current 1188 × 1324 painting, including its labels.
// The overlay uses the same contain transform as the painting at every viewport.
const regions = [
  { name: '山', x: 1080, baseline: 230, top: 140, bottom: 255 },
  { name: '风', x: 1035, baseline: 334, top: 255, bottom: 365 },
  { name: '日', x: 1018, baseline: 437, top: 365, bottom: 465 },
  { name: '云', x: 982, baseline: 537, top: 465, bottom: 565 },
  { name: '天', x: 866, baseline: 637, top: 565, bottom: 665 },
  { name: '花', x: 781, baseline: 740, top: 665, bottom: 770 },
  { name: '水', x: 793, baseline: 834, top: 770, bottom: 875 },
  { name: '月', x: 788, baseline: 948, top: 875, bottom: 990 },
  { name: '春', x: 763, baseline: 1065, top: 990, bottom: 1100 },
  { name: '秋', x: 592, baseline: 1170, top: 1100, bottom: 1210 },
];

/** The approved painting is one continuous composition, including its overlaps. */
export function ImageryLandscapeRanking({ content }: { content: ImageryChapterContent }) {
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const pointerFocus = useRef(false);
  const pointerType = useRef('mouse');
  const activeName = hovered ?? focused ?? pinned;
  const [settling, setSettling] = useState<string | null>(null);
  const pointer = useRef<ScenePointer>({ x: 460, y: 662, speed: 0, inside: false });
  const previous = useRef({ x: 460, y: 662, time: 0 });
  useEffect(() => {
    const keyboard = () => { pointerFocus.current = false; };
    document.addEventListener('keydown', keyboard, true);
    return () => document.removeEventListener('keydown', keyboard, true);
  }, []);
  useEffect(() => {
    if (activeName) { setSettling(activeName); return; }
    const timeout = window.setTimeout(() => setSettling(null), 540);
    return () => window.clearTimeout(timeout);
  }, [activeName]);
  const activeRegion = regions.find((region) => region.name === (activeName ?? settling));
  const move = (event: PointerEvent<SVGGElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = artworkPoint(event.clientX, event.clientY, svg.getBoundingClientRect());
    const now = performance.now();
    const dt = Math.max(16, now - previous.current.time);
    pointer.current = { ...point, inside: true, speed: Math.min(1, Math.hypot(point.x - previous.current.x, point.y - previous.current.y) / dt / 2), vx: Math.max(-1, Math.min(1, (point.x - previous.current.x) / dt / 2)) };
    previous.current = { ...point, time: now };
  };
  return (
    <figure className="imagery-landscape-ranking" aria-labelledby="imagery-landscape-caption" data-artwork-failed={failed}>
      {!failed && <img className="imagery-landscape-ranking__painting" src={artwork}
        alt="唐诗意象词频水墨山峦图：山、风、日、云、天、花、水、月、春、秋，按词频从高到低排列，各层自然交错掩映。"
        width={1188} height={1324} decoding="async" onError={() => setFailed(true)} />}
      {!failed && <svg className="imagery-landscape-ranking__interactions" viewBox="0 0 1188 1324"
        preserveAspectRatio="xMidYMid meet" role="group" aria-label="意象词频高亮交互">
        {activeRegion && <ImagerySceneMotion key={activeRegion.name} region={activeRegion} artwork={artwork} pointer={pointer} leaving={!activeName} />}
        {regions.map((region) => {
          const item = content.ranking.find((entry) => entry.name === region.name);
          if (!item) return null;
          const active = activeName === region.name;
          const width = region.name === '秋' ? 76 : 94;
          return <g key={region.name} role="button" tabIndex={0} aria-label={`${item.name}：${number.format(item.count)} ${content.unit}`}
            className="imagery-landscape-ranking__region" data-active={active}
            onPointerEnter={(event) => { move(event); if (event.pointerType !== 'touch') setHovered(region.name); }} onPointerMove={move}
            onPointerDown={(event) => { pointerFocus.current = true; pointerType.current = event.pointerType || 'mouse'; setFocused(null); move(event); }}
            onPointerLeave={() => { pointer.current.inside = false; setHovered(null); }}
            onPointerCancel={() => { pointer.current.inside = false; setHovered(null); setPinned(null); setFocused(null); }}
            onFocus={() => { if (!pointerFocus.current) { pointer.current = { x: (104 + region.x) / 2, y: (region.top + region.bottom) / 2, speed: 0, inside: true }; setFocused(region.name); } }} onBlur={() => setFocused(null)}
            onClick={(event) => { if (pointerType.current !== 'mouse' || event.detail === 0) setPinned((current) => current === region.name ? null : region.name); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { setHovered(null); setFocused(null); setPinned(null); }
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFocused(region.name); }
            }}>
            <path className="imagery-landscape-ranking__hit-area"
              d={`M 104 ${region.top} H ${region.x + width - 8} V ${region.bottom} H 104 Z`} />
            <g className="imagery-landscape-ranking__value-overlay" aria-hidden="true">
              {/* Sample the adjacent original paper, rather than drawing a flat
                  rectangle over its texture. The original value is untouched at rest. */}
              <svg x={region.x - 8} y={region.baseline - 27} width={width} height={40}
                viewBox={`${region.x - 8} ${region.baseline + 8} ${width} 40`} overflow="hidden">
                <image href={artwork} width={1188} height={1324} />
              </svg>
              <g transform={`translate(${region.x} ${region.baseline})`}>
                <text className="imagery-landscape-ranking__highlight-value">{number.format(item.count)}</text>
              </g>
            </g>
          </g>;
        })}
      </svg>}
      <figcaption id="imagery-landscape-caption" className={failed ? 'imagery-landscape-ranking__fallback' : 'imagery-landscape-ranking__accessible'}>
        {failed ? <h3>{content.rankingTitle}</h3> : content.rankingTitle}
      </figcaption>
      <ol className={failed ? 'imagery-landscape-ranking__fallback' : 'imagery-landscape-ranking__accessible'}>
        {content.ranking.slice(0, 10).map((item) => <li key={item.name}>{item.name}：{number.format(item.count)} {content.unit}</li>)}
      </ol>
    </figure>
  );
}
