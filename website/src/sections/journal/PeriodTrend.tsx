import { useId, useLayoutEffect, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import periodPanorama from '../../assets/journal/period-panorama.png';
import portraitBounds from './portraitBounds.json';
import { pickPoetVerse, type PoetVerse } from './poetRecitations';
import { allJournalPoets, journalPeriods, journalPeriodPortraits, journalPeriodSource, journalTimelinePoets, journalTimelinePeriods } from './journalData';

export function PeriodTrend({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const uid = useId().replace(/:/g, '');
  const [focused, setFocused] = useState<string | null>(null);
  const [recital, setRecital] = useState<{ id: string; name: string; verse: PoetVerse; x: number; y: number; height: number; width: number; fontSize: number } | null>(null);
  const lastVerses = useRef<Record<string, PoetVerse>>({});
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 260 });
  useLayoutEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const left = 82;
  const right = 24;
  const yearX = scaleLinear().domain([618, 907]).range([left, size.width - right]);
  const x = (id: string) => {
    const period = journalTimelinePeriods.find(item => item.id === id)!;
    return yearX((period.start + period.end) / 2);
  };
  // Pool adjacent crowded labels around their true year anchors (isotonic layout).
  // Only the cards move; leader endpoints always retain the linear year position.
  const gap = Math.min(56, (size.width - left - right - 64) / 14);
  const portraitScale = gap / 56;
  const blocks: { start: number; end: number; sum: number; count: number }[] = [];
  journalTimelinePoets.forEach((poet, index) => {
    blocks.push({ start: index, end: index, sum: yearX(poet.year) - index * gap, count: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.count <= b.sum / b.count) break;
      blocks.splice(-2, 2, { start: a.start, end: b.end, sum: a.sum + b.sum, count: a.count + b.count });
    }
  });
  const cardX: number[] = [];
  blocks.forEach(block => {
    for (let i = block.start; i <= block.end; i++) cardX[i] = block.sum / block.count + i * gap;
  });
  cardX.forEach((position, index) => {
    const minimum = left + 32 + index * gap;
    const maximum = size.width - right - 32 - (cardX.length - 1 - index) * gap;
    cardX[index] = Math.max(minimum, Math.min(maximum, position));
  });
  const max = Math.max(...journalPeriods.map(period => period.count), 1);
  const baseline = Math.max(156, size.height - 52);
  // Lift the curve while retaining portrait headroom and a visible landscape foreground.
  const chartTop = Math.max(64, Math.min(104 * portraitScale + 8, size.height * .32));
  const zeroY = Math.max(chartTop + 64, baseline - Math.max(42, (baseline - chartTop) * .3));
  const y = scaleLinear().domain([0, Math.ceil(max / 5000) * 5000]).range([zeroY, chartTop]);
  const points = journalPeriods.map(period => ({ x: x(period.id), y: y(period.count) }));
  const lineY = (position: number) => {
    if (position <= points[0].x) return points[0].y;
    for (let i = 1; i < points.length; i++) {
      if (position <= points[i].x) {
        const a = points[i - 1], b = points[i];
        const t = (position - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * t * t * (3 - 2 * t);
      }
    }
    return points[points.length - 1].y;
  };
  const portraits = journalTimelinePoets.map((item, index) => ({
    ...item, cardX: cardX[index], anchorX: yearX(item.year), lineY: lineY(cardX[index]), anchorY: lineY(yearX(item.year)),
  }));
  // Horizontal endpoint tangents give a gentle curve without overshooting counts.
  // The same cubic interpolation positions labels and closes the artwork mask.
  const curvePath = points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const third = (point.x - previous.x) / 3;
    return `${path} C${previous.x + third},${previous.y} ${point.x - third},${point.y} ${point.x},${point.y}`;
  }, `M${points[0].x},${points[0].y}`);
  const areaPath = `M${left - 8},${points[0].y} L${points[0].x},${points[0].y} ${curvePath.slice(curvePath.indexOf(' C'))} H${size.width - right} V${baseline} H${left - 8} Z`;
  const artworkLeft = left - 8;
  const artworkWidth = size.width - right - artworkLeft;
  // Keep the panorama undistorted. Its palace at 62% aligns with the data peak;
  // a shared foreground lets the low early-Tang section retain legible scenery.
  const artworkHeight = artworkWidth * 724 / 2172;
  const artworkY = baseline - artworkHeight * .78;
  const visibleArtworkHeight = baseline - artworkY;
  const current = journalPeriods.find(period => period.id === focused);
  const recite = (id: string, name: string, headX: number, headY: number) => {
    if (recital?.id === id) return;
    const verse = pickPoetVerse(id, lastVerses.current[id]);
    if (!verse) return;
    lastVerses.current[id] = verse;
    const scroll = plotRef.current?.closest<HTMLElement>('.pj-trend-scroll');
    const visibleLeft = Math.max(left, scroll?.scrollLeft ?? 0);
    const visibleRight = Math.min(size.width - right, (scroll?.scrollLeft ?? 0) + (scroll?.clientWidth || size.width));
    const phrases = verse.text.replace("鹅，鹅，鹅", "鹅鹅鹅").split(/[，。？！、；：]/).filter(Boolean);
    const width = phrases.length * 19 + (phrases.length - 1) * 8;
    const verseX = Math.max(visibleLeft + 4, Math.min(visibleRight - width - 4, headX - width / 2));
    const longestLine = Math.max(...phrases.map(phrase => phrase.length));
    const plot = plotRef.current;
    const panel = plot?.closest<HTMLElement>(".pj-trend");
    const plotTop = (plot?.getBoundingClientRect().top ?? 0) - (panel?.getBoundingClientRect().top ?? 0);
    const plotLeft = (plot?.getBoundingClientRect().left ?? 0) - (panel?.getBoundingClientRect().left ?? 0);
    const available = Math.max(30, plotTop + headY - 8 - 8);
    const fontSize = Math.min(17, (available - 6) / (longestLine * 1.04));
    const height = Math.max(30, Math.ceil(longestLine * fontSize * 1.04 + 6));
    // Keep the verse just above this poet's head rather than painting over the face.
    const verseTop = Math.max(8, plotTop + headY - height - 8);
    setRecital({ id, name, verse, x: plotLeft + verseX, y: verseTop, height, width, fontSize });
  };
  return <article className="pj-panel pj-trend" aria-labelledby="pj-trend-title" tabIndex={0}>
    <header className="pj-panel-heading pj-trend-heading"><h3 id="pj-trend-title">唐诗流变</h3></header>
    <div className="pj-trend-scroll" tabIndex={0} aria-label="横向浏览四唐代表诗人及统计折线"><div className="pj-trend-art"><div className="pj-trend-plot" ref={plotRef}><svg className="pj-trend-svg" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="全唐诗四期收录作品数量折线图，据林庚1958年统计">
      <desc>初唐约2757首，盛唐约6341首，中唐约19020首，晚唐约14744首。不含五代及生平不明作家；按文学分期展示，不代表逐年创作量。首尾水平实线为视觉延伸，无新增统计数据。</desc>
      <defs>
        <clipPath id={`${uid}-landscape-clip`}><path d={areaPath} /></clipPath>
        <linearGradient id={`${uid}-sky-color`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eed3a9" stopOpacity=".68" />
          <stop offset=".6" stopColor="#f3dfbf" stopOpacity=".48" />
          <stop offset="1" stopColor="#f7ebd7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-edge-fade`}>
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset=".055" stopColor="white" />
          <stop offset=".945" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-vertical-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset=".12" stopColor="white" stopOpacity="0" />
          <stop offset=".32" stopColor="white" stopOpacity=".75" />
          <stop offset=".52" stopColor="white" />
          <stop offset=".85" stopColor="white" stopOpacity=".88" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-side-mask`} maskUnits="userSpaceOnUse" x={artworkLeft} y={artworkY} width={artworkWidth} height={visibleArtworkHeight}>
          <rect x={artworkLeft} y={artworkY} width={artworkWidth} height={visibleArtworkHeight} fill={`url(#${uid}-edge-fade)`} />
        </mask>
        <mask id={`${uid}-vertical-mask`} maskUnits="userSpaceOnUse" x={artworkLeft} y={artworkY} width={artworkWidth} height={visibleArtworkHeight}>
          <rect x={artworkLeft} y={artworkY} width={artworkWidth} height={visibleArtworkHeight} fill={`url(#${uid}-vertical-fade)`} />
        </mask>
      </defs>
      <g className="pj-trend-landscape" clipPath={`url(#${uid}-landscape-clip)`} aria-hidden="true" pointerEvents="none">
        <path d={areaPath} fill={`url(#${uid}-sky-color)`} />
        <g mask={`url(#${uid}-side-mask)`}><g mask={`url(#${uid}-vertical-mask)`}>
          <image href={periodPanorama} x={artworkLeft} y={artworkY} width={artworkWidth} height={artworkHeight} preserveAspectRatio="xMidYMid meet" />
        </g></g>
      </g>
      {y.ticks(zeroY - chartTop < 100 ? 2 : 4).map(tick => <g key={tick}><line x1={left - 8} x2={size.width - right} y1={y(tick)} y2={y(tick)} className="pj-gridline" /><text x={left - 14} y={y(tick) + 4} textAnchor="end" className="pj-axis-label">{tick.toLocaleString('en-US')}</text></g>)}
      <text x={left + 8} y={chartTop - 15} textAnchor="end" className="pj-axis-caption">唐诗数量（首）</text>
      <line x1={left - 8} x2={left - 8} y1={chartTop} y2={baseline} className="pj-axis" /><line x1={left - 8} x2={size.width - right} y1={baseline} y2={baseline} className="pj-axis" />
      <path className="pj-period-line" d={curvePath} fill="none" stroke="#a8322d" strokeWidth="2.5" />
      <path className="pj-period-extension" d={`M${left},${points[0].y} H${points[0].x}`} />
      <path className="pj-period-extension" d={`M${points[3].x},${points[3].y} H${size.width - right}`} />
      <g className="pj-timeline-bookend"><text x={left - 16} y="21" textAnchor="end">大唐初启</text><text className="pj-bookend-year" x={left - 16} y="40" textAnchor="end">618 · 建唐</text><path d={`M${left - 16},48 V${points[0].y - 7}`} /></g>
      <g className="pj-timeline-bookend"><text x={size.width - right - 4} y="21" textAnchor="end">唐末余响</text><text className="pj-bookend-year" x={size.width - right - 4} y="40" textAnchor="end">907 · 唐末</text><path d={`M${size.width - right - 4},48 V${points[3].y - 7}`} /></g>
      {journalPeriods.map(period => <g key={period.id}><circle cx={x(period.id)} cy={y(period.count)} r="5.5" fill="#ad3431" stroke="#fff4e4" strokeWidth="2"><title>{period.name}：约{period.count.toLocaleString('en-US')}首</title></circle><text className="pj-period-count" x={x(period.id)} y={y(period.count) + (period.id === 'early' ? 18 : 23)} textAnchor="middle">{period.count.toLocaleString('en-US')}</text><text x={x(period.id)} y={baseline + 29} textAnchor="middle" className="pj-period-label">{period.name}</text></g>)}
    </svg>
    <svg className="pj-poet-year-guides" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
      {[618, 650, 700, 750, 800, 850, 907].map(year => <g key={year}><line x1={yearX(year)} x2={yearX(year)} y1={baseline + 31} y2={baseline + 35} className="pj-axis" /><text x={yearX(year)} y={baseline + 47} textAnchor="middle" className="pj-year-label">{year}</text></g>)}
    </svg>
    <div className="pj-trend-representatives" aria-label="代表诗人，按出生年份递增排列">{portraits.map(item => {
      const id = item.id;
      const poet = allJournalPoets.find(entry => entry.id === id)!;
      const period = journalPeriods.find(entry => entry.poetIds.includes(id))!;
      const image = journalPeriodPortraits[id];
      const bounds = portraitBounds[poet.name as keyof typeof portraitBounds];
      const curveCeiling = Math.min(lineY(item.cardX - 28 * portraitScale), item.lineY, lineY(item.cardX + 28 * portraitScale));
      const portraitTop = Math.max(6, curveCeiling - 102 * portraitScale - 10);
      const headY = portraitTop + (bounds ? 76 - bounds.visibleHeight + 8 : 8) * portraitScale;
      const yearLabel = `${item.approximate ? '约' : ''}${item.year}年生`;
      return <button key={id} type="button" data-poet-id={id} data-birth-year={item.year} data-year-x={item.anchorX} data-line-y={item.lineY} style={{ left: item.cardX, top: portraitTop, transform: `translateX(-50%) scale(${portraitScale})`, transformOrigin: 'top center' }} aria-describedby={recital?.id === id ? `${uid}-recital` : undefined} aria-label={`查看时期代表诗人${poet.name}${image ? '' : '（占位）'}`} aria-description={yearLabel} aria-pressed={selectedId === id} onClick={() => onSelect(id)} onFocus={() => { setFocused(period.id); recite(id, poet.name, item.cardX, headY); }} onMouseEnter={() => { setFocused(period.id); recite(id, poet.name, item.cardX, headY); }} onMouseLeave={event => { if (document.activeElement !== event.currentTarget) setRecital(null); }} onBlur={() => setRecital(null)} onKeyDown={event => { if (event.key === 'Escape') setRecital(null); }}><span className="pj-poet-art-slot">{image ? <img src={image} alt={`${poet.name}画像`} style={bounds ? { position: 'absolute', width: bounds.width, height: bounds.height, top: bounds.top + (76 - bounds.visibleHeight), left: `calc(50% + ${bounds.left}px)` } : undefined} /> : <span aria-hidden="true">画像</span>}</span><span className="pj-poet-nameplate">{poet.name}</span></button>;
    })}</div>


    </div></div></div>
    {recital && <div id={`${uid}-recital`} role="tooltip" className="pj-recital" style={{ left: recital.x, top: recital.y, height: recital.height, width: recital.width, fontSize: recital.fontSize }} aria-label={`${recital.name}吟诗`}><p>{recital.verse.text.replace("鹅，鹅，鹅", "鹅鹅鹅").split(/[，。？！、；：]/).filter(Boolean).map((phrase, index) => <span key={index}>{phrase}</span>)}</p></div>}
    <footer className="pj-trend-footer"><span role="status">{current ? `${current.name} · 约${current.count.toLocaleString('en-US')}首` : '按生年 · 分期总量 · 两端为视觉延伸'}</span><a href={journalPeriodSource.fullTextUrl} title={journalPeriodSource.publication} target="_blank" rel="noreferrer">出处</a></footer>
  </article>;
}
