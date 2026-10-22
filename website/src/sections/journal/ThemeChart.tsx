import { useCallback, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { arc, pie } from 'd3';
import { journalThemes, journalThemeTotal } from './journalData';
import { getThemeShares } from './journalCharts';
import { themeVerses, themeVerseInk } from './themeVerses';
import { layoutCornerVerses, layoutMiddleVerses, layoutVerses } from './verseLayout';
import type { VerseSpace } from './verseLayout';
import { themeArtwork } from './themeArtwork';
import { ThemeMotion } from './ThemeMotion';

export function ThemeChart() {
  const panelRef = useRef<HTMLElement>(null);
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pointerHovered, setPointerHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [verseLayers, setVerseLayers] = useState<{ id: string; generation: number; leaving: boolean }[]>([]);
  const verseGeneration = useRef(0);
  const removeVerseLayer = useCallback((generation: number) => {
    setVerseLayers(layers => layers.filter(layer => layer.generation !== generation));
  }, []);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlighted = pointerHovered ?? focused ?? active;
  const verseHighlighted = hovered ?? focused ?? active;
  const clearTimer = () => { if (hoverTimer.current !== null) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  const hover = (id: string | null) => { setPointerHovered(id); clearTimer(); hoverTimer.current = setTimeout(() => setHovered(id), id ? 450 : 100); };
  useEffect(() => () => { if (hoverTimer.current !== null) clearTimeout(hoverTimer.current); }, []);
  useEffect(() => {
    const generation = ++verseGeneration.current;
    setVerseLayers(layers => [
      ...layers.map(layer => layer.leaving ? layer : { ...layer, leaving: true }),
      ...(verseHighlighted ? [{ id: verseHighlighted, generation, leaving: false }] : []),
    ]);
  }, [verseHighlighted]);
  const themes = getThemeShares(journalThemes);
  const slices = pie<(typeof themes)[number]>().sort(null).value(theme => Math.max(0, theme.value))(themes);
  const shape = arc<(typeof slices)[number]>().innerRadius(43).outerRadius(175);
  const labelPath = (slice: (typeof slices)[number]) => {
    const reverse = Math.cos((slice.startAngle + slice.endAngle) / 2) < 0;
    const start = reverse ? slice.endAngle : slice.startAngle;
    const end = reverse ? slice.startAngle : slice.endAngle;
    const radius = reverse ? 189 : 181;
    const point = (angle: number) => `${Math.sin(angle) * radius},${-Math.cos(angle) * radius}`;
    return `M${point(start)}A${radius},${radius} 0 0 ${reverse ? 0 : 1} ${point(end)}`;
  };
  return <article ref={panelRef} className="pj-panel pj-themes" aria-labelledby="pj-theme-title" onMouseLeave={() => { clearTimer(); setPointerHovered(null); setHovered(null); setActive(null); }}>
    {verseLayers.map(layer => <ThemeVerseLayer key={layer.generation} shownId={layer.id} revealGeneration={layer.generation} leaving={layer.leaving} onRemove={removeVerseLayer} />)}
    <header className="pj-panel-heading"><h3 id="pj-theme-title">唐诗魅力</h3></header>
    <div className="pj-donut-wrap"><svg className="pj-donut" viewBox="40 0 430 450" role="group" aria-label={`唐诗题材分布，共${journalThemeTotal}首，前五类及其他`}>
      <desc>按提供的题材统计表展示前五类。其他合并怀人、爱情婚姻闺怨、咏史怀古、悼亡、其他及待判，共11,365首。</desc>
      <defs>{slices.map(slice => <g key={slice.data.id}>
        <clipPath id={`${uid}-${slice.data.id}`}><path d={shape(slice) ?? ''} /></clipPath>
        <path id={`${uid}-label-${slice.data.id}`} d={labelPath(slice)} />
      </g>)}</defs>
      <g transform="translate(255 222)">{slices.map(slice => {
        const id = slice.data.id;
        const artwork = themeArtwork[id];
        const angle = (slice.startAngle + slice.endAngle) / 2;
        const toggle = () => { clearTimer(); setPointerHovered(null); setHovered(null); setFocused(null); setActive(active === id ? null : id); };
        return <g key={id} className={`pj-theme-slice${highlighted === id ? ' is-highlighted' : highlighted ? ' is-muted' : ''}`} style={{ '--slice-x': `${Math.sin(angle) * 7}px`, '--slice-y': `${-Math.cos(angle) * 7}px` } as CSSProperties} role="button" tabIndex={0} aria-label={`${slice.data.name}，${slice.data.value}首，${slice.data.share.toFixed(2)}%`} aria-pressed={active === id} onMouseEnter={() => hover(id)} onMouseLeave={() => hover(null)} onFocus={() => { clearTimer(); setPointerHovered(null); setHovered(null); setFocused(id); }} onBlur={() => setFocused(null)} onClick={toggle} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
          if (event.key === 'Escape') { clearTimer(); setPointerHovered(null); setHovered(null); setFocused(null); setActive(null); }
        }}>
          <g className="pj-theme-art">
          <path d={shape(slice) ?? ''} fill={slice.data.color} stroke="#f7ebd7" strokeWidth="2"><title>{slice.data.name}：{slice.data.value}首，占比{slice.data.share.toFixed(2)}%</title></path>
          {(artwork || slice.data.image) && <image className="pj-theme-illustration" href={artwork?.src ?? slice.data.image} x={artwork?.x ?? -175} y={artwork?.y ?? -175} width={artwork?.width ?? 350} height={artwork?.height ?? 350} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-${slice.data.id})`} />}
          <path className="pj-theme-separator" d={shape(slice) ?? ''} fill="none" stroke="#f7ebd7" strokeWidth="2.5" strokeLinejoin="round" />
          <text className="pj-donut-arc-label" style={{ fontSize: id === 'war' ? 9.5 : id === 'objects' ? 11 : 14 }} textAnchor="middle"><textPath href={`#${uid}-label-${slice.data.id}`} startOffset="50%">{slice.data.name} · {slice.data.share.toFixed(2)}%</textPath></text>
          </g>
          <path className="pj-theme-hit-area" d={shape(slice) ?? ''} fill="transparent" />
        </g>;
      })}
      <ThemeMotion themeId={highlighted} clipId={highlighted ? `${uid}-${highlighted}` : null} explicit={!!active && highlighted === active} />
      <g pointerEvents="none" aria-hidden="true">{slices.map(slice => <path key={slice.data.id} d={shape(slice) ?? ''} fill="none" stroke="#f7ebd7" strokeWidth="2.5" strokeLinejoin="round" />)}</g>
      <circle r="43" fill="var(--pj-paper)" pointerEvents="none" /><text className="pj-donut-center" textAnchor="middle" y="-13" pointerEvents="none">唐诗<tspan x="0" dy="16">题材分布</tspan><tspan x="0" dy="16">{journalThemeTotal.toLocaleString('en-US')}首</tspan></text></g>
    </svg></div>
  </article>;
}

function ThemeVerseLayer({ shownId, revealGeneration, leaving, onRemove }: { shownId: string; revealGeneration: number; leaving: boolean; onRemove: (generation: number) => void }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<VerseSpace | null>(null);
  const verse = themeVerses[shownId];
  const shownTheme = journalThemes.find(theme => theme.id === shownId);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(revealGeneration), 800);
    return () => clearTimeout(timer);
  }, [leaving, revealGeneration, onRemove]);
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const panel = layer?.closest('article');
    const center = panel?.querySelector('circle');
    if (!panel || !layer || !center) return;
    const measure = () => {
      const bounds = layer.getBoundingClientRect();
      const ring = center.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !ring.width) return;
      const next = { width: bounds.width, height: bounds.height, cx: ring.x + ring.width / 2 - bounds.x, cy: ring.y + ring.height / 2 - bounds.y, radius: ring.width / 2 * 175 / 42 + 8 };
      setSpace(previous => previous && Object.keys(next).every(key => Math.abs(previous[key as keyof VerseSpace] - next[key as keyof VerseSpace]) < .5) ? previous : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [shownId, revealGeneration]);
  const placements = useMemo(() => verse && space ? layoutVerses(verse.lines, space, revealGeneration * 97 + Array.from(shownId ?? '').reduce((sum, char) => sum + char.charCodeAt(0), 0)) : [], [verse, space, revealGeneration, shownId]);
  const middleLines = verse?.lines.filter((_, index) => index % 2 === 0) ?? [];
  const middlePlacements = useMemo(() => verse && space ? layoutMiddleVerses(verse.lines.filter((_, index) => index % 2 === 0), space, placements, revealGeneration * 137) : [], [verse, space, placements, revealGeneration]);
  const cornerLines = verse?.lines.filter((_, index) => index % 2 === 1) ?? [];
  const cornerPlacements = useMemo(() => verse && space ? layoutCornerVerses(verse.lines.filter((_, index) => index % 2 === 1), space, [...placements, ...middlePlacements], revealGeneration * 193) : [], [verse, space, placements, middlePlacements, revealGeneration]);

  return (<div ref={layerRef} className={`pj-theme-verses ${!leaving ? 'is-visible' : 'is-leaving'}`} style={{ '--verse-ink': themeVerseInk[shownId] } as CSSProperties} role="group" aria-label={!leaving ? `${shownTheme?.name}题材诗句` : undefined} aria-hidden={!!leaving}>
      <p className="pj-verse-accessible">{verse.lines.join('，')}。{verse.author}《{verse.title}》{verse.subtheme ? `（${verse.subtheme}）` : ''}</p>
      {cornerLines.map((line, column) => <div key={`corner-${column}`} className="pj-verse-column pj-verse-corner" style={{ left: cornerPlacements[column]?.x ?? 0, top: cornerPlacements[column]?.y ?? 0, fontSize: cornerPlacements[column]?.fontSize ?? 0, visibility: space ? 'visible' : 'hidden' }} aria-hidden="true">{Array.from(line).map((char, index) => <span key={index} style={{ '--verse-delay': `${400 + column * 280 + index * 220}ms` } as CSSProperties}>{char}</span>)}</div>)}
      {middleLines.map((line, column) => <div key={`middle-${column}`} className="pj-verse-column pj-verse-middle" style={{ left: middlePlacements[column]?.x ?? 0, top: middlePlacements[column]?.y ?? 0, fontSize: middlePlacements[column]?.fontSize ?? 0, visibility: space ? 'visible' : 'hidden' }} aria-hidden="true">{Array.from(line).map((char, index) => <span key={index} style={{ '--verse-delay': `${600 + column * 360 + index * 220}ms` } as CSSProperties}>{char}</span>)}</div>)}
      {verse.lines.map((line, column) => <div key={column} className={`pj-verse-column pj-verse-column--${column}`} style={{ left: placements[column]?.x ?? 0, top: placements[column]?.y ?? 0, fontSize: placements[column]?.fontSize ?? 0, visibility: space ? 'visible' : 'hidden' }} aria-hidden="true">{Array.from(line).map((char, index) => <span key={index} style={{ '--verse-delay': `${column * 360 + index * 220}ms` } as CSSProperties}>{char}</span>)}</div>)}
      <p className="pj-verse-source" aria-hidden="true">{verse.subtheme && `${verse.subtheme} · `}{verse.author}《{verse.title}》</p>
    </div>);
}
