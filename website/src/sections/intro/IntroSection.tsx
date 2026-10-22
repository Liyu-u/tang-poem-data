import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import heroCalligraphy from '../../assets/hero-calligraphy.png';
import heroFigureBaiJuyi from '../../assets/hero-figure-bai-juyi.png';
import heroFigureDuFu from '../../assets/hero-figure-dufu.png';
import heroFigureLiBai from '../../assets/hero-figure-libai-complete.png';
import heroFigureLiShangyin from '../../assets/hero-figure-lishangyin.png';
import heroFigureWangWei from '../../assets/hero-figure-wangwei.png';
import heroLandscape from '../../assets/hero-landscape.png';
import { useExplorer } from '../../hooks/useExplorer';
import { buildHeroPoets } from './heroPoets';
import { useHeroParallax, type HeroParallaxOffset } from './useHeroParallax';
import './intro-poetry.css';
import './intro-parallax.css';

const defaultQuote = '以诗为镜，观照大唐。';
const heroFigureAssets: Record<string, string> = {
  李白: heroFigureLiBai,
  杜甫: heroFigureDuFu,
  王维: heroFigureWangWei,
  白居易: heroFigureBaiJuyi,
  李商隐: heroFigureLiShangyin,
};

const figureLabelOverrides: Record<string, { top: string; left: string }> = {
  李白: { top: '47%', left: '66%' },
  白居易: { top: '73%', left: '76%' },
};

// All measurements are in the original 1975 × 796 artwork coordinate system.
// Crop away transparent margins without changing the PNG's intrinsic proportions.
const figureLayout: Record<string, { crop: [number, number, number, number]; sourceSize?: [number, number]; x: number; y: number; width: number; depth: number }> = {
  李白: { crop: [0, 0, 1403, 1121], sourceSize: [1403, 1121], x: 1015, y: 38, width: 740, depth: 1 },
  王维: { crop: [428, 100, 1050, 690], x: 850, y: 390, width: 400, depth: 2 },
  白居易: { crop: [850, 0, 1045, 796], x: 1285, y: 385, width: 465, depth: 3 },
  杜甫: { crop: [238, 64, 1235, 732], x: 615, y: 485, width: 510, depth: 4 },
  李商隐: { crop: [665, 164, 1245, 622], x: 1020, y: 465, width: 580, depth: 5 },
};

type AlphaMap = { pixels: Uint8ClampedArray; width: number; height: number };

// Artwork-relative positions follow the user's marked upper-middle poetry area.
const versePockets = [
  { x: 31, y: 9, vertical: true },
  { x: 36, y: 12, vertical: true },
  { x: 41, y: 10, vertical: true },
  { x: 46, y: 13, vertical: true },
  { x: 51, y: 9, vertical: true },
  { x: 56, y: 11, vertical: true },
  { x: 61, y: 10, vertical: true },
  { x: 66, y: 12, vertical: true },
] as const;

type VersePlacement = { x: number; y: number; vertical: boolean; tilt: number; duration: number };
type PoetryLayer = { key: number; poetId: string; placements: VersePlacement[]; exitAt?: number };

export function IntroSection() {
  const { dataset } = useExplorer();
  const heroPoets = useMemo(() => buildHeroPoets(dataset), [dataset]);
  const hitOrder = useMemo(() => [...heroPoets].sort((a, b) => figureLayout[b.name].depth - figureLayout[a.name].depth), [heroPoets]);
  const [activePoetId, setActivePoetId] = useState<string | null>(null);
  const activePoetRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const figureLayerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const parallaxOffset = useRef<HeroParallaxOffset>({ x: 0, y: 0 });
  const figureBounds = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const hitFrame = useRef<number | null>(null);
  const [poetryLayers, setPoetryLayers] = useState<PoetryLayer[]>([]);
  const poetrySequence = useRef(0);
  const exitTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const alphaMaps = useRef(new Map<string, AlphaMap>());
  const activePoet = heroPoets.find((poet) => poet.id === activePoetId);
  const quote = activePoet?.quote ?? defaultQuote;

  const activatePoet = useCallback((id: string | null) => {
    if (activePoetRef.current === id) return;
    activePoetRef.current = id;
    const now = Date.now();
    const nextLayer = id ? {
      key: ++poetrySequence.current,
      poetId: id,
      placements: versePockets.map((pocket) => ({
        ...pocket,
        x: pocket.x + Math.random() * 0.6 - 0.3,
        y: pocket.y + Math.random() * 1.2 - 0.6,
        tilt: Math.random() * 2 - 1,
        duration: 6 + Math.random() * 4,
      })),
    } : null;
    setPoetryLayers((layers) => [
      ...layers.map((layer) => ({ ...layer, exitAt: layer.exitAt ?? now })),
      ...(nextLayer ? [nextLayer] : []),
    ].slice(-3));
    const timer = setTimeout(() => {
      const cutoff = Date.now() - 2050;
      setPoetryLayers((layers) => layers.filter((layer) => !layer.exitAt || layer.exitAt > cutoff));
      exitTimers.current.delete(timer);
    }, 2150);
    exitTimers.current.add(timer);
    setActivePoetId(id);
  }, []);

  useEffect(() => {
    const timers = exitTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  useEffect(() => {
    const clearWhenHidden = () => { if (document.hidden) activatePoet(null); };
    document.addEventListener('visibilitychange', clearWhenHidden);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) activatePoet(null);
    });
    if (sectionRef.current) observer?.observe(sectionRef.current);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', clearWhenHidden);
    };
  }, [activatePoet]);

  const cacheAlpha = (name: string, image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    alphaMaps.current.set(name, {
      pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
      width: canvas.width,
      height: canvas.height,
    });
  };

  const hitTestAt = useCallback((clientX: number, clientY: number) => {
    const offset = parallaxOffset.current;
    if (!figureBounds.current) {
      const rect = figureLayerRef.current?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return;
      figureBounds.current = { left: rect.left - offset.x, top: rect.top - offset.y, width: rect.width, height: rect.height };
    }
    const rect = figureBounds.current;
    const x = (clientX - rect.left - offset.x) * 1975 / rect.width;
    const y = (clientY - rect.top - offset.y) * 796 / rect.height;
    const hit = hitOrder.find((poet) => {
      const layout = figureLayout[poet.name];
      const map = alphaMaps.current.get(poet.name);
      if (!map) return false;
      const [cx, cy, cw, ch] = layout.crop;
      const scale = layout.width / cw;
      const localX = (x - layout.x) / scale;
      const localY = (y - layout.y) / scale;
      if (localX < 0 || localX >= cw || localY < 0 || localY >= ch) return false;
      const px = Math.floor(cx + localX);
      const py = Math.floor(cy + localY);
      return px >= 0 && px < map.width && py >= 0 && py < map.height
        && map.pixels[(py * map.width + px) * 4 + 3] > 100;
    });
    activatePoet(hit?.id ?? null);
  }, [activatePoet, hitOrder]);

  const queueHitTest = useCallback(() => {
    if (!pointerRef.current || hitFrame.current !== null) return;
    hitFrame.current = requestAnimationFrame(() => {
      hitFrame.current = null;
      const pointer = pointerRef.current;
      if (pointer) hitTestAt(pointer.x, pointer.y);
    });
  }, [hitTestAt]);

  useEffect(() => {
    const invalidateBounds = () => { figureBounds.current = null; };
    window.addEventListener('resize', invalidateBounds);
    window.addEventListener('scroll', invalidateBounds, { passive: true });
    window.addEventListener('blur', invalidateBounds);
    return () => {
      if (hitFrame.current !== null) cancelAnimationFrame(hitFrame.current);
      window.removeEventListener('resize', invalidateBounds);
      window.removeEventListener('scroll', invalidateBounds);
      window.removeEventListener('blur', invalidateBounds);
    };
  }, []);

  const hitTest = (event: MouseEvent<HTMLDivElement>) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    queueHitTest();
  };

  useHeroParallax(sectionRef, (offset) => {
    parallaxOffset.current = offset;
    queueHitTest();
  });

  return (
    <section ref={sectionRef} id="intro" className="long-section intro-section intro-section--hero" aria-label="诗映大唐首页">
      <div className="intro-section__stage">
        <img className="intro-section__background" data-hero-depth="background" src={heroLandscape} alt="" aria-hidden="true" />
        <div className="intro-section__veil" aria-hidden="true" />
        <div className="intro-section__poetry-plane" data-hero-depth="poetry" aria-hidden="true">
        {poetryLayers.map((layer) => {
          const poet = heroPoets.find((entry) => entry.id === layer.poetId);
          if (!poet) return null;
          return (
          <div className={`intro-section__poetry-field${layer.exitAt ? ' is-leaving' : ''}`} key={layer.key} aria-hidden="true">
            {poet.verses.map((verse, index) => {
              const placement = layer.placements[index];
              if (!placement) return null;
              return (
                <div
                  key={`${verse.title}-${index}`}
                  className={`intro-section__verse${placement.vertical ? ' is-vertical' : ''}`}
                  style={{
                    left: `${placement.x}%`, top: `${placement.y}%`,
                    '--verse-tilt': `${placement.tilt}deg`,
                    '--verse-duration': `${placement.duration}s`,
                    '--verse-delay': `${160 + index * 100}ms`,
                  } as CSSProperties}
                >
                  <span className="intro-section__verse-text">{verse.text}</span>
                  <span className="intro-section__verse-source">《{verse.title}》</span>
                  <span className="intro-section__verse-dust">
                    {Array.from({ length: 16 }, (_, particle) => (
                      <i
                        key={particle}
                        className="intro-section__verse-particle"
                        style={{
                          left: `${8 + (particle % 8) * 12}%`,
                          top: `${10 + ((index + particle * 3) % 11) * 8}%`,
                          '--dust-x': `${(particle % 2 ? 1 : -1) * (65 + (particle % 8) * 12)}px`,
                          '--dust-y': `${(particle % 3 === 0 ? 1 : -1) * (45 + (particle % 8) * 9)}px`,
                          '--dust-delay': `${0.9 + particle * 0.015 + index * 0.1}s`,
                          '--dust-exit-delay': `${(particle % 6) * 0.018}s`,
                          '--dust-duration': `${1.3 + (particle % 6) * 0.08}s`,
                        } as CSSProperties}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          );
        })}
        </div>
        <img className="intro-section__calligraphy" data-hero-depth="title" src={heroCalligraphy} alt="" aria-hidden="true" />

        <div ref={figureLayerRef} data-hero-depth="figures" className={`intro-section__figure-layer${activePoet ? ' has-active-figure' : ''}`} aria-label="唐代诗人群像" onMouseMove={hitTest} onClick={hitTest} onMouseEnter={() => { figureBounds.current = null; }} onMouseLeave={() => { pointerRef.current = null; activatePoet(null); }}>
          {heroPoets.map((poet) => {
            const figureAsset = heroFigureAssets[poet.name];
            if (!figureAsset) return null;
            const layout = figureLayout[poet.name];
            const [cx, cy, cw, ch] = layout.crop;
            const [sourceWidth, sourceHeight] = layout.sourceSize ?? [1975, 796];

            return (
              <div
                className={`intro-section__figure-slot${activePoetId === poet.id ? ' is-active' : ''}`}
                key={poet.id}
                style={{
                  left: `${layout.x / 1975 * 100}%`,
                  top: `${layout.y / 796 * 100}%`,
                  width: `${layout.width / 1975 * 100}%`,
                  height: `${ch / cw * layout.width / 796 * 100}%`,
                  zIndex: layout.depth,
                }}
              >
                <div className="intro-section__figure-crop">
                  <img
                    className="intro-section__figure"
                    src={figureAsset}
                    alt=""
                    aria-hidden="true"
                    data-testid={`hero-figure-layer-${poet.name}`}
                    onLoad={(event) => cacheAlpha(poet.name, event.currentTarget)}
                    style={{
                      width: `${sourceWidth / cw * 100}%`,
                      height: `${sourceHeight / ch * 100}%`,
                      left: `${-cx / cw * 100}%`,
                      top: `${-cy / ch * 100}%`,
                    } as CSSProperties}
                  />
                </div>
                <button
                  type="button"
                  className={`intro-section__figure-hitbox${activePoetId === poet.id ? ' is-active' : ''}`}
                  data-testid={`hero-figure-hotspot-${poet.name}`}
                  data-hit-shape="figure"
                  aria-label={`查看${poet.name}的代表作`}
                  aria-pressed={activePoetId === poet.id}
                  onMouseEnter={() => activatePoet(poet.id)}
                  onMouseLeave={() => activatePoet(null)}
                  onFocus={() => activatePoet(poet.id)}
                  onBlur={() => activatePoet(null)}
                >
                  <span className="intro-section__figure-accessible-name">{poet.name}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="intro-section__figure-labels" data-hero-depth="figures" aria-hidden="true">
          {heroPoets.map((poet) => (
            <span key={poet.id} className={`intro-section__figure-label${activePoetId === poet.id ? ' is-active' : ''}`} style={figureLabelOverrides[poet.name] ?? poet.position}>
              {poet.name}
            </span>
          ))}
        </div>

        <div className={`intro-section__quote${activePoet ? ' is-active' : ''}`} data-hero-depth="poetry" aria-hidden="true">
          <span className="intro-section__quote-label">唐诗背景句</span>
          <p>{defaultQuote}</p>
        </div>
        <span className="intro-section__figure-accessible-name" data-testid="hero-poem-quote" role="status" aria-live="polite" aria-atomic="true">
          {activePoet ? `${activePoet.name} · ${activePoet.workTitle}：` : ''}{quote}
        </span>

      </div>
    </section>
  );
}
