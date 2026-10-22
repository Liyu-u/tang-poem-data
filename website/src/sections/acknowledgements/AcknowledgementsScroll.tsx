import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scrollPoems } from './scrollPoems';
import changan from '../../assets/acknowledgements/changan.png';
import frontier from '../../assets/acknowledgements/frontier.png';
import river from '../../assets/acknowledgements/river.png';
import horizontalTitle from '../../assets/acknowledgements/title-horizontal.png';
import './acknowledgements.css';

const DURATION = 300_000 / 1.8;
export function AcknowledgementsScroll() {
  const viewport = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const position = useRef(0);
  const drag = useRef<{ x: number; scroll: number } | null>(null);
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(0);
  const syncArtwork = () => {
    const rail = artwork.current;
    const el = viewport.current;
    if (rail && el) rail.style.transform = `translate3d(${-position.current * Math.max(0, rail.scrollWidth - el.clientWidth)}px,0,0)`;
  };
  const setPosition = (value: number) => {
    position.current = Math.min(1, Math.max(0, value));
    const el = viewport.current;
    if (el) el.scrollLeft = position.current * (el.scrollWidth - el.clientWidth);
    syncArtwork();
  };
  useEffect(() => {
    if (!playing || ready < 3) return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null && !document.hidden) setPosition(position.current + Math.min(now - previous, 100) / DURATION);
      previous = now;
      if (position.current >= 1) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready]);
  useEffect(() => {
    const resize = () => setPosition(position.current);
    window.addEventListener('resize', resize);
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduce = () => { if (motion?.matches) setPlaying(false); };
    motion?.addEventListener?.('change', reduce);
    return () => { window.removeEventListener('resize', resize); motion?.removeEventListener?.('change', reduce); };
  }, []);
  return <main className="tang-credits">
    <svg className="tang-credits__filters" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {/* Match the paper ground to the frontier panel in sRGB without blurring painted detail. */}
        <filter id="credits-tone-changan" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.8257" />
            <feFuncG type="linear" slope="0.7845" />
            <feFuncB type="linear" slope="0.7336" />
          </feComponentTransfer>
        </filter>
        <filter id="credits-tone-river" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.9137" />
            <feFuncG type="linear" slope="0.9152" />
            <feFuncB type="linear" slope="0.9401" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
    <header className="tang-credits__header"><Link to="/" className="tang-credits__brand"><img src={horizontalTitle} alt="诗映大唐" width="220" height="48" /><span aria-hidden="true">唐</span></Link><h1>大唐余响 · 千载同卷</h1><Link to="/">返回首页 <span aria-hidden="true">↗</span></Link></header>
    <div className="tang-credits__stage">
    <div ref={artwork} className="tang-credits__art" aria-hidden="true">{[changan, frontier, river].map((src, index) => <img key={src} src={src} alt="" draggable={false} className={`tang-credits__painting tang-credits__painting--${index}`} onLoad={() => { setReady(n => n + 1); syncArtwork(); }} onError={() => setReady(n => n + 1)} />)}</div>
    <div ref={viewport} className="tang-credits__viewport" role="region" aria-label="大唐诗歌横向长卷" tabIndex={0}
      onScroll={() => { const el = viewport.current; if (el && el.scrollWidth > el.clientWidth) { position.current = el.scrollLeft / (el.scrollWidth - el.clientWidth); syncArtwork(); } }}
      onWheel={event => { setPlaying(false); const el = viewport.current; if (el) el.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY; }}
      onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setPlaying(false); setPosition(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : position.current + (event.key === 'ArrowRight' ? .025 : -.025)); } }}
      onPointerDown={event => { if (event.button !== 0 || (event.target as HTMLElement).closest('a,button')) return; setPlaying(false); drag.current = { x: event.clientX, scroll: viewport.current?.scrollLeft ?? 0 }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current && viewport.current) viewport.current.scrollLeft = drag.current.scroll - (event.clientX - drag.current.x); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="tang-credits__scroll">
        <div className="tang-credits__poetry">{scrollPoems.map(([poet, title, verse, english], index) => <article key={`${poet}-${title}`} className={`tang-credits__poem tang-credits__poem--${index % 4}`} style={{ left: `${2 + index * (88 / scrollPoems.length)}%` }}>
          <span className="tang-credits__english" lang="en">{english}</span><h2>{title}</h2><span className="tang-credits__poet">{poet}</span><p>{verse.split('，').map((line, n) => <span key={n}>{line}{n === 0 && verse.includes('，') ? '，' : ''}</span>)}</p>
        </article>)}</div>
        <section className="tang-credits__ending" aria-label="鸣谢"><span className="tang-credits__seal">鸣谢</span><h2>山河有尽，<br />诗意无穷。</h2><p>致写下这些诗的人，<br />致让这些诗流传至今的人，<br />也致今日读诗的你。</p><div className="tang-credits__thanks">感谢为唐诗的整理、研究与传播付出心力的人们。<br />亦感谢 React、TypeScript、Vite、D3、GSAP、Three.js<br />及开源社区的持续贡献。</div><Link to="/">回到数字长卷 ↗</Link></section>
      </div>
    </div>
    </div>
    <footer className="tang-credits__footer"><span>诗随山河，流向千年</span><div className="tang-credits__controls"><button onClick={() => { if (position.current >= 1) setPosition(0); setPlaying(value => !value); }}>{playing ? '暂停展卷' : '继续展卷'}</button><button onClick={() => { setPosition(0); setPlaying(true); }}>重展此卷</button></div></footer>
  </main>;
}
