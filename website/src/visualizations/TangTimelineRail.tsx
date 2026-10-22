import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { timelineArtwork } from '../data/timelineArtwork';
import { timelineBookends, type TimelineBookendKind } from '../data/timelineBookends';
import { TimelineBookend, TimelineBookendActions } from './TimelineBookend';
import { getTimelineVerseColumns } from '../data/timelineVerses';
import { timelineScenes } from '../data/timelineScenes';
import {
  buildTimelineRailCards,
  buildTimelineRailStages,
  getTimelineRailVisualState,
  normalizeTimelineWheelDelta,
  getTimelineAxisY,
  TIMELINE_AXIS_PATH,
  type TimelineRailCard,
} from '../lib/visualizations/timelineRail';

const VISIBLE_RADIUS = 2;
const PRELOAD_RADIUS = 7;
const WHEEL_THRESHOLD = 90;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cardActionLabel(title: string, index: number, activeIndex: number, flipped: boolean) {
  if (flipped) return `翻回${title}正面`;
  if (index === activeIndex) return `点击翻阅${title}`;
  return `聚焦${title}`;
}

const VERSE_TRANSITION_MS = 560;

function TimelineVerseBackdrop({ title, color }: { title: string; color: string }) {
  const [layers, setLayers] = useState<{ title: string; color: string; previous: { title: string; color: string } | null; revision: number }>({ title, color, previous: null, revision: 0 });
  // Adjust during render so the backdrop and card start their transitions in the same commit.
  if (layers.title !== title || layers.color !== color) {
    setLayers({ title, color, previous: layers.title ? { title: layers.title, color: layers.color } : null, revision: layers.revision + 1 });
  }
  useEffect(() => {
    if (!layers.previous) return;
    const revision = layers.revision;
    const timer = setTimeout(() => setLayers((current) => current.revision === revision ? { ...current, previous: null } : current), VERSE_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [layers.revision, layers.previous]);

  return (
    <div className="timeline-rail__verse-backdrop" aria-hidden="true" data-testid="timeline-verse-backdrop" data-poem-title={title}>
      {layers.previous && <div key={`previous-${layers.revision}`} className="timeline-rail__verse-layer is-leaving" data-verse-state="previous" style={{ color: layers.previous.color }}>
        {getTimelineVerseColumns(layers.previous.title).map((line, index) => <span key={index}>{line}</span>)}
      </div>}
      <div key={`current-${layers.revision}`} className={`timeline-rail__verse-layer${layers.revision ? ' is-entering' : ''}`} data-verse-state="current" style={{ color: layers.color }}>
        {(layers.title ? getTimelineVerseColumns(layers.title) : []).map((line, index) => <span key={index}>{line}</span>)}
      </div>
    </div>
  );
}

export function TangTimelineRail({ onActiveIndexChange }: { onActiveIndexChange?: (index: number) => void } = {}) {
  const stages = useMemo(buildTimelineRailStages, []);
  const cards = useMemo(() => buildTimelineRailCards(timelineArtwork), []);
  // -1 and cards.length are reading scenes; poem indices remain unchanged.
  const initialIndex = -1;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const readingContext: 'work' | TimelineBookendKind = activeIndex < 0 ? 'prologue' : activeIndex >= cards.length ? 'epilogue' : 'work';
  const bookend = readingContext === 'work' ? null : timelineBookends[readingContext];
  const activeIndexRef = useRef(initialIndex);
  const wheelBufferRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastWheelMoveRef = useRef(0);
  const wheelGestureRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDetailsElement>(null);

  const activeCard = cards[clamp(activeIndex, 0, cards.length - 1)];
  const activeStageIndex = activeCard?.stageIndex ?? 0;
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const readingTitle = `${activeStage.year} · ${activeStage.title}`;
  const readingText = activeStage.summary;
  const scene = timelineScenes[activeIndex + 1];
  const readingNodes = [
    { id: 'prologue', label: '序章', marker: '序', year: '618年', description: '序章', position: -1 },
    ...stages.map((stage, index) => ({ id: stage.id, label: stage.label, marker: String(index + 1).padStart(2, '0'), year: stage.year, description: `${stage.author}《${stage.poemTitle}》`, position: index })),
    { id: 'epilogue', label: '尾声', marker: '终', year: '907年', description: '尾声', position: cards.length },
  ];
  const cardCollectionKey = cards.map((card) => `${card.id}:${card.title}`).join('|');

  useEffect(() => { onActiveIndexChange?.(activeIndex); }, [activeIndex, onActiveIndexChange]);

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = 0;
  }, [activeStageIndex, readingContext]);

  useEffect(() => {
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    setFlippedId(null);
  }, [cardCollectionKey, initialIndex]);

  const moveTo = useCallback((requestedIndex: number) => {
    if (cards.length === 0) return;
    clearTimeout(settleTimerRef.current);
    wheelBufferRef.current = 0;
    wheelGestureRef.current = false;
    const nextIndex = clamp(requestedIndex, -1, cards.length);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    setFlippedId(null);
    setHoveredId(null);
    if (directoryRef.current) directoryRef.current.open = false;
  }, [cards.length]);

  const moveBy = (amount: number) => moveTo(activeIndexRef.current + amount);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 800 || event.ctrlKey) return;
      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const delta = normalizeTimelineWheelDelta(rawDelta, event.deltaMode, window.innerHeight);
      if (!delta || cards.length === 0) return;
      const reading = (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-reading]');
      if (reading) {
        // Poem interpretations retain independent reading; bookend prose only
        // consumes wheel input when there is more text to read in that direction.
        if (!reading.classList.contains('timeline-bookend__prose')) return;
        const canReadFurther = delta > 0
          ? reading.scrollTop + reading.clientHeight < reading.scrollHeight - 1
          : reading.scrollTop > 1;
        if (canReadFurther) return;
      }

      const now = Date.now();
      const releaseGesture = () => {
        wheelGestureRef.current = false;
        wheelBufferRef.current = 0;
        lastWheelMoveRef.current = 0;
      };
      // A completed node transition must not release its remaining inertia to
      // the page scroller, especially when it has just reached the epilogue.
      if (wheelGestureRef.current) {
        event.preventDefault();
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = setTimeout(releaseGesture, Math.max(180, 560 - (now - lastWheelMoveRef.current)));
        return;
      }

      const movingOutAtStart = activeIndexRef.current === -1 && delta < 0;
      const movingOutAtEnd = activeIndexRef.current === cards.length && delta > 0;
      if (!movingOutAtStart && !movingOutAtEnd) event.preventDefault();
      if (movingOutAtStart || movingOutAtEnd) {
        clearTimeout(settleTimerRef.current);
        wheelBufferRef.current = 0;
        return;
      }

      if (Math.sign(wheelBufferRef.current) !== Math.sign(delta)) wheelBufferRef.current = 0;
      wheelBufferRef.current += delta;
      if (Math.abs(wheelBufferRef.current) >= WHEEL_THRESHOLD) {
        const amount = wheelBufferRef.current;
        moveTo(activeIndexRef.current + Math.sign(amount));
        wheelGestureRef.current = true;
        lastWheelMoveRef.current = now;
      }
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        const amount = wheelBufferRef.current;
        if (!wheelGestureRef.current && Math.abs(amount) >= 12) {
          moveTo(activeIndexRef.current + Math.sign(amount));
          wheelGestureRef.current = true;
          lastWheelMoveRef.current = Date.now();
          settleTimerRef.current = setTimeout(releaseGesture, 560);
          return;
        }
        releaseGesture();
      }, wheelGestureRef.current ? 560 : 180);
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      clearTimeout(settleTimerRef.current);
      wheelBufferRef.current = 0;
    };
  }, [cards.length, moveTo]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('select')) return;
    if ((event.target as HTMLElement).closest('[data-timeline-reading]') && event.key !== 'Escape') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if ((event.target as HTMLElement).closest('[data-testid^="timeline-rail-card-"]')) viewportRef.current?.focus();
      moveBy(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if ((event.target as HTMLElement).closest('[data-testid^="timeline-rail-card-"]')) viewportRef.current?.focus();
      moveBy(1);
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target === viewportRef.current) {
      event.preventDefault();
      if (readingContext === 'prologue') moveTo(0);
      else if (readingContext === 'epilogue') moveTo(-1);
      else if (activeCard) setFlippedId((current) => current === activeCard.id ? null : activeCard.id);
    } else if (event.key === 'Escape') {
      setFlippedId(null);
      if ((event.target as HTMLElement).closest('.timeline-rail__face--back')) viewportRef.current?.focus({ preventScroll: true });
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-timeline-reading]') && !(event.target as HTMLElement).closest('.timeline-bookend__prose')) return;
    if (event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    draggedRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      draggedRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current === null) return;
    const delta = event.clientX - pointerStartRef.current.x;
    const verticalDelta = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;
    if (Math.abs(delta) > 36 && Math.abs(delta) > Math.abs(verticalDelta)) {
      draggedRef.current = true;
      moveBy((delta > 0 ? -1 : 1) * clamp(Math.floor(Math.abs(delta) / 160), 1, 4));
    }
  };

  const handleCardClick = (card: TimelineRailCard, index: number) => {
    if (index !== activeIndexRef.current) {
      moveTo(index);
      return;
    }
    // Keep focus off the face that is about to rotate away, preventing scroll jumps.
    viewportRef.current?.focus({ preventScroll: true });
    setFlippedId((current) => (current === card.id ? null : card.id));
  };

  const openDirectory = () => {
    const directory = directoryRef.current;
    if (!directory) return;
    directory.open = true;
    directory.querySelector('summary')?.focus({ preventScroll: true });
  };

  if (cards.length === 0) {
    return (
      <section className="timeline-rail" aria-label="诗脉千年互动时间轴" data-testid="timeline-rail">
        <div className="timeline-rail__empty">
          <span className="timeline-rail__empty-mark">诗</span>
          <p>当前筛选暂无可展示作品</p>
          <span>清除筛选后，时间轴会恢复。</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`timeline-rail${bookend ? ' is-boundary' : ''}`}
      aria-label="诗脉千年互动时间轴"
      data-testid="timeline-rail"
      data-reading-node={readingContext}
      onKeyDown={handleKeyDown}
    >
      <div className="timeline-rail__header">
        <div>
          <span className="timeline-rail__label">唐诗发展时间轴</span>
          <span>{bookend ? `${bookend.label} · ${bookend.year}` : `${activeStage.period} · ${activeStage.year}`}</span>
        </div>
        <div className="timeline-rail__progress" aria-live="polite">
          {bookend ? <span>{bookend.label}</span> : <><span className="timeline-rail__progress-label">诗作</span><span>{String(activeIndex + 1).padStart(2, '0')}</span><i aria-hidden="true">/</i><span>{String(cards.length).padStart(2, '0')}</span></>}
        </div>
      </div>

      <p className="timeline-rail__sr-only" aria-live="polite">
        {bookend ? `当前${bookend.label}，${bookend.year}。使用左右方向键切换节点，Enter 或 Space ${readingContext === 'prologue' ? '循诗入唐' : '重返开篇'}。` : `当前第 ${activeIndex + 1} 首作品，${activeCard.author}《${activeCard.title}》，${activeStage.year}。使用左右方向键切换作品，Enter 或 Space 翻阅内容。`}
      </p>

      <div
        ref={viewportRef}
        className="timeline-rail__viewport"
        data-testid="timeline-rail-viewport"
        tabIndex={0}
        aria-label="时间轴作品区域，使用左右方向键切换作品"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStartRef.current = null; draggedRef.current = false; }}
        onClickCapture={(event) => {
          if (draggedRef.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            draggedRef.current = false;
          }
        }}
      >
        <TimelineVerseBackdrop title={bookend ? '' : activeCard.title} color={timelineScenes[activeIndex + 1]?.verseColor ?? '#79604d'} />
        {bookend && <TimelineBookend key={readingContext} kind={readingContext as TimelineBookendKind} onPrimary={() => { moveTo(readingContext === 'prologue' ? 0 : -1); viewportRef.current?.focus({ preventScroll: true }); }} onDirectory={openDirectory} />}
        <div className="timeline-rail__cards" aria-hidden={!!bookend} inert={!!bookend}>
          {cards.map((card, index) => {
            if (Math.abs(index - activeIndex) > PRELOAD_RADIUS) return null;
            const visible = !bookend && Math.abs(index - activeIndex) <= VISIBLE_RADIUS;
            const visual = getTimelineRailVisualState(index, activeIndex);
            const flipped = flippedId === card.id;
            const isHovered = hoveredId === card.id;
            const style = {
              '--rail-offset': index - activeIndex,
              '--rail-scale': visual.scale * (isHovered ? 1.05 : 1),
              '--rail-opacity': visual.opacity,
              '--rail-blur': `${visual.blur}px`,
              '--rail-edge-blur': `${visual.isCenter ? 0 : visual.distance === 1 ? 0.15 : 0.3}px`,
              '--rail-depth': `${visual.distance * 0.45}rem`,
              '--rail-z': visual.zIndex,
            } as CSSProperties;

            return (
              <article
                key={card.id}
                className={`timeline-rail__card-shell ${visual.isCenter ? 'is-center' : ''} ${isHovered ? 'is-hovered' : ''} ${visible ? '' : 'is-outside-view'}`}
                style={style}
                aria-hidden={!visible}
                data-visible={visible}
                data-card-index={index}
                data-centered={!bookend && visual.isCenter}
                data-testid={!bookend && visual.isCenter ? 'timeline-rail-active-card' : undefined}
              >
                <div
                  className={`timeline-rail__card ${flipped ? 'is-flipped' : ''}`}
                  data-testid={`timeline-rail-card-${card.id}`}
                  data-flipped={flipped}
                  onMouseEnter={() => visual.isCenter && setHoveredId(card.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button type="button" className="timeline-rail__face timeline-rail__face--front" aria-hidden={flipped}
                    aria-label={cardActionLabel(card.title, index, activeIndex, flipped)}
                    tabIndex={visible && !flipped ? 0 : -1}
                    onClick={() => handleCardClick(card, index)}>
                    <span className="timeline-rail__image-frame">
                      <img src={card.image} alt={`《${card.title}》作品插图`} loading={visible ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                    </span>
                    <span className="timeline-rail__card-copy">
                      <small>{card.author}</small>
                      <span className="timeline-rail__click-hint" aria-hidden={!visual.isCenter}>点击翻阅</span>
                    </span>
                  </button>
                  <div className="timeline-rail__face timeline-rail__face--back" aria-hidden={!flipped}>
                    <span className="timeline-rail__back-kicker">{card.author} · 作品解读</span>
                    <strong>{card.title}</strong>
                    <p className="timeline-rail__back-reading" data-timeline-reading tabIndex={visible && flipped ? 0 : -1}
                      aria-label={`${card.title}作品解读`}>{card.interpretation}</p>
                    <button type="button" className="timeline-rail__back-action" tabIndex={visible && flipped ? 0 : -1}
                      onClick={() => { setFlippedId(null); viewportRef.current?.focus({ preventScroll: true }); }} aria-label={`翻回${card.title}正面`}>返回正面</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="timeline-rail__axis" aria-label="唐诗发展时间轴" hidden={!!bookend}>
        <svg className="timeline-rail__curve" viewBox="0 0 1000 120" aria-hidden="true" preserveAspectRatio="none">
          <path d={TIMELINE_AXIS_PATH} />
        </svg>
        <div className="timeline-rail__nodes">
          {readingNodes.map((node, nodeIndex) => {
            const offset = node.position - activeIndex;
            const x = bookend ? 4 + nodeIndex * 92 / (readingNodes.length - 1) : 50 + offset * 9;
            const mobileX = bookend ? x : 50 + offset * 22;
            const selected = activeIndex === node.position;
            return (
              <button
                key={node.id}
                type="button"
                className={`timeline-rail__node ${selected ? 'is-selected' : ''} ${!bookend && Math.abs(offset) > 5 ? 'is-offstage' : ''} ${!bookend && Math.abs(offset) > 2 ? 'is-mobile-offstage' : ''}`}
                style={{ '--node-x': `${x}%`, '--node-y': `${getTimelineAxisY(x) / 120 * 100}%`, '--node-mobile-x': `${mobileX}%`, '--node-mobile-y': `${getTimelineAxisY(mobileX) / 120 * 100}%`, '--node-opacity': Math.max(0.6, 1 - Math.abs(offset) * 0.08), '--node-scale': 1 } as CSSProperties}
                aria-label={`定位到${node.label}`}
                aria-current={selected ? 'step' : undefined}
                onClick={() => moveTo(node.position)}
              >
                <span className="timeline-rail__node-dot" />
                <span>{bookend ? (node.id === 'prologue' ? '618' : node.id === 'epilogue' ? '907' : '') : node.marker}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="timeline-rail__current-stage">{bookend ? bookend.caption : readingTitle}</p>

      <section className="timeline-rail__history" style={{ '--timeline-reading-width': scene?.readingWidth ?? '100%', '--timeline-reading-shift': scene?.readingShift ?? '0%' } as CSSProperties} aria-label={bookend ? '时间轴首尾介绍' : '时间轴历史介绍'} data-testid={bookend ? 'timeline-boundary-caption' : 'timeline-history'}>
        {bookend ? <>{bookend.detail && <p className="timeline-bookend__caption">{bookend.detail}</p>}{readingContext === 'epilogue' && <TimelineBookendActions kind="epilogue" onPrimary={() => { moveTo(-1); viewportRef.current?.focus({ preventScroll: true }); }} onDirectory={openDirectory} />}</> : <>
        <div ref={historyRef} className="timeline-rail__history-reading" data-timeline-reading tabIndex={0} aria-label={readingTitle}>
          <div key={`${readingContext}-${activeStageIndex}`} className="timeline-rail__history-copy">
            <p>{readingText}</p>
          </div>
        </div>
        </>}
      </section>

      <div className="timeline-rail__footer">
        <span className="timeline-rail__instructions"><span className="timeline-rail__mouse" aria-hidden="true" />{bookend ? <><span className="timeline-rail__desktop-hint">{bookend.hint}</span><span className="timeline-rail__touch-hint">左右滑动浏览，或点击按钮继续。</span></> : <><span className="timeline-rail__desktop-hint">区域内滚动切换诗作 · 悬停聚焦</span><span className="timeline-rail__touch-hint">左右滑动切换诗作</span> · 点击翻阅</>}</span>
        <span>区域外滚动浏览页面</span>
      </div>
      <details ref={directoryRef} className="timeline-rail__reading-list">
        <summary>查看作品目录</summary>
        <label className="timeline-rail__stage-select">跳转时间节点
          <select value={activeIndex} onChange={(event) => { moveTo(Number(event.target.value)); viewportRef.current?.focus({ preventScroll: true }); }}>
            {readingNodes.map((node) => <option key={node.id} value={node.position}>{node.year} · {node.description}</option>)}
          </select>
        </label>
        <ol>
          {cards.map((card, index) => <li key={card.id}><button type="button" aria-current={activeIndex === index ? 'true' : undefined} onClick={() => { moveTo(index); viewportRef.current?.focus({ preventScroll: true }); }}>{card.title}<span>{card.author} · {stages[index].year}</span></button></li>)}
        </ol>
      </details>
    </section>
  );
}
