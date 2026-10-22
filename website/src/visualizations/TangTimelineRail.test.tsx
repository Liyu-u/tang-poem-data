import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TangTimelineRail } from './TangTimelineRail';
import { timelineWorks } from '../data/timelineContent';
import { timelineArtwork } from '../data/timelineArtwork';
import { timelineScenes } from '../data/timelineScenes';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function renderWorks() {
  render(<TangTimelineRail />);
  fireEvent.click(screen.getByRole('button', { name: '循诗入唐 →' }));
  fireEvent.click(screen.getByRole('button', { name: '定位到节点 03' }));
}

describe('TangTimelineRail', () => {
  it('keeps poster sources and caption slots stable when cards move through the center', () => {
    renderWorks();
    const card = screen.getByTestId('timeline-rail-card-work-04');
    const image = card.querySelector('img')!;
    const source = image.getAttribute('src');
    const hint = card.querySelector('.timeline-rail__click-hint');
    expect(hint).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 04' }));
    expect(card.querySelector('img')).toBe(image);
    expect(image).toHaveAttribute('src', source);
    expect(card.querySelector('.timeline-rail__click-hint')).toBe(hint);
  });
  it('keeps scene-specific reading measures close while moving copy away from busy artwork', () => {
    renderWorks();
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 09' }));
    expect(screen.getByTestId('timeline-history')).toHaveStyle({ '--timeline-reading-width': 'min(90%, 60rem)' });
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 11' }));
    expect(screen.getByTestId('timeline-history')).toHaveStyle({ '--timeline-reading-width': 'min(88%, 58rem)', '--timeline-reading-shift': '-2%' });
    expect(screen.getByTestId('timeline-history')).toHaveTextContent(timelineWorks[10].history);
  });
  it('uses the current scene ink and retains outgoing verse color throughout its crossfade', () => {
    renderWorks();
    const backdrop = screen.getByTestId('timeline-verse-backdrop');
    expect(backdrop.querySelector('[data-verse-state="current"]')).toHaveStyle({ color: timelineScenes[3].verseColor });
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 05' }));
    expect(backdrop.querySelector('[data-verse-state="previous"]')).toHaveStyle({ color: timelineScenes[3].verseColor });
    expect(backdrop.querySelector('[data-verse-state="current"]')).toHaveStyle({ color: timelineScenes[5].verseColor });
  });
  it('notifies the chapter background for all thirteen nodes without resetting the rail', () => {
    const onActiveIndexChange = vi.fn();
    render(<TangTimelineRail onActiveIndexChange={onActiveIndexChange} />);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(-1);
    const viewport = screen.getByTestId('timeline-rail-viewport');
    for (let index = 0; index <= 11; index++) {
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
      expect(onActiveIndexChange).toHaveBeenLastCalledWith(index);
    }
    expect(screen.getByRole('button', { name: '重返公元618年 ↺' }).closest('[data-testid="timeline-boundary-caption"]')).not.toBeNull();
  });
  it('allows wheel entry over the introduction but preserves scrolling within overflowing prose', () => {
    render(<TangTimelineRail />);
    let prose = screen.getByLabelText('序章导语');
    Object.defineProperty(prose, 'scrollHeight', { configurable: true, value: 600 });
    Object.defineProperty(prose, 'clientHeight', { configurable: true, value: 200 });
    expect(fireEvent.wheel(prose, { deltaY: 120 })).toBe(true);
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
    Object.defineProperty(prose, 'scrollHeight', { configurable: true, value: 200 });
    expect(fireEvent.wheel(prose, { deltaY: 120 })).toBe(false);
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '0');
  });
  it('navigates all thirteen stops by keyboard and supports boundary actions without flipping hidden cards', () => {
    render(<TangTimelineRail />);
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.keyDown(viewport, { key: 'Enter' });
    for (let index = 0; index < 11; index++) {
      expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', String(index));
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    }
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'epilogue');
    fireEvent.keyDown(viewport, { key: ' ' });
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
    expect(document.querySelector('[data-flipped="true"]')).toBeNull();
    fireEvent.change(screen.getByLabelText('跳转时间节点'), { target: { value: '5' } });
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '5');
    fireEvent.change(screen.getByLabelText('跳转时间节点'), { target: { value: '11' } });
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'epilogue');
  });
  it('supports mobile swipes over bookend prose without taking over vertical wheel scrolling', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('PointerEvent', MouseEvent);
    render(<TangTimelineRail />);
    const prose = screen.getByLabelText('序章导语');
    expect(fireEvent.wheel(prose, { deltaY: 120 })).toBe(true);
    fireEvent.pointerDown(prose, { clientX: 250, clientY: 100, button: 0 });
    fireEvent.pointerUp(prose, { clientX: 150, clientY: 105, button: 0 });
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '0');
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerUp(viewport, { clientX: 210, clientY: 105, button: 0 });
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
  });
  it('crossfades old verses for 560ms and bounds rapid transitions to two layers', () => {
    vi.useFakeTimers();
    renderWorks();
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 05' }));
    const backdrop = screen.getByTestId('timeline-verse-backdrop');
    expect(backdrop.querySelector('[data-verse-state="previous"]')).toHaveTextContent('春江潮水连海平');
    expect(backdrop.querySelector('[data-verse-state="current"]')).toHaveTextContent('长风破浪会有时');
    act(() => vi.advanceTimersByTime(559));
    expect(backdrop.querySelector('[data-verse-state="previous"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 06' }));
    expect(backdrop.querySelectorAll('.timeline-rail__verse-layer')).toHaveLength(2);
    expect(backdrop.querySelector('[data-verse-state="previous"]')).toHaveTextContent('长风破浪会有时');
    act(() => vi.advanceTimersByTime(560));
    expect(backdrop.querySelectorAll('.timeline-rail__verse-layer')).toHaveLength(1);
    expect(backdrop).toHaveTextContent('国破山河在');
  });
  it('updates the decorative vertical verses with the centered work without intercepting card actions', () => {
    renderWorks();
    const backdrop = screen.getByTestId('timeline-verse-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveTextContent('春江潮水连海平');
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 05' }));
    expect(screen.getByTestId('timeline-verse-backdrop')).toHaveTextContent('长风破浪会有时');
    expect(screen.getByTestId('timeline-verse-backdrop').querySelector('[data-verse-state="current"]')).not.toHaveTextContent('春江潮水连海平');
    fireEvent.click(screen.getByRole('button', { name: '点击翻阅行路难·其一' }));
    expect(screen.getByTestId('timeline-rail-card-work-05')).toHaveAttribute('data-flipped', 'true');
    for (let index = 0; index < 11; index++) {
      fireEvent.click(screen.getByRole('button', { name: `定位到节点 ${String(index + 1).padStart(2, '0')}` }));
      const verses = screen.getByTestId('timeline-verse-backdrop');
      expect(verses).toHaveAttribute('data-poem-title', timelineWorks[index].title);
      expect(verses.querySelectorAll('[data-verse-state="current"] span').length).toBeGreaterThanOrEqual(16);
      expect(verses.querySelectorAll('[data-verse-state="current"] span').length).toBeLessThanOrEqual(24);
    }
  });
  it('shows only the author below each poster without repeating its embedded title', () => {
    renderWorks();
    for (const copy of document.querySelectorAll('.timeline-rail__card-copy')) {
      expect(copy.querySelector('strong')).toBeNull();
      expect(copy.querySelector('small')?.textContent).toMatch(/^(王勃|陈子昂|张若虚|王维|李白|杜甫|白居易|刘禹锡|杜牧|曹松)$/);
    }
    expect(screen.getByRole('button', { name: '点击翻阅春江花月夜' })).toBeInTheDocument();
  });
  it('shows eleven works and synchronizes every node one-to-one', () => {
    renderWorks();
    expect(screen.getAllByRole('button', { name: /^定位到节点 \d{2}$/ })).toHaveLength(11);
    expect(document.querySelector('.timeline-rail__progress')).toHaveTextContent('诗作03/11');
    for (let index = 0; index < 11; index++) {
      const node = screen.getByRole('button', { name: `定位到节点 ${String(index + 1).padStart(2, '0')}` });
      fireEvent.click(node);
      expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', String(index));
      expect(node).toHaveAttribute('aria-current', 'step');
      const title = timelineWorks[index].title;
      const image = screen.getByTestId('timeline-rail-active-card').querySelector('img');
      expect(image).toHaveAttribute('src', timelineArtwork[title].image);
      expect(image).toHaveAttribute('alt', `《${title}》作品插图`);
    }
    expect(document.querySelector('.timeline-rail__progress')).toHaveTextContent('11/11');
  });

  it('retains the same full poster while a side card moves into and out of the center', () => {
    renderWorks();
    const image = screen.getByTestId('timeline-rail-card-work-04').querySelector('img');
    expect(image).toHaveAttribute('src', timelineArtwork['使至塞上'].image);
    fireEvent.click(screen.getByRole('button', { name: '聚焦使至塞上' }));
    expect(image).toHaveAttribute('src', timelineArtwork['使至塞上'].image);
    expect(screen.getByTestId('timeline-rail-card-work-03').querySelector('img'))
      .toHaveAttribute('src', timelineArtwork['春江花月夜'].image);
  });

  it('moves one node per wheel gesture and keeps the docking target mounted', () => {
    vi.useFakeTimers();
    renderWorks();
    const upcoming = screen.getByTestId('timeline-rail-card-work-04');
    fireEvent.wheel(screen.getByTestId('timeline-rail-viewport'), { deltaY: 480 });
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '3');
    expect(screen.getByTestId('timeline-rail-card-work-04')).toBe(upcoming);
    expect(screen.getByRole('button', { name: '定位到节点 04' })).toHaveAttribute('aria-current', 'step');
  });

  it('absorbs the same wheel gesture at the final node until inertia settles', () => {
    vi.useFakeTimers();
    renderWorks();
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 11' }));
    fireEvent.wheel(viewport, { deltaY: 120 });
    expect(fireEvent.wheel(viewport, { deltaY: 120 })).toBe(false);
    act(() => vi.advanceTimersByTime(700));
    expect(fireEvent.wheel(viewport, { deltaY: 120 })).toBe(true);
  });

  it('centers side cards, flips the center, and closes with Escape', () => {
    renderWorks();
    fireEvent.click(screen.getByRole('button', { name: '聚焦使至塞上' }));
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '3');
    fireEvent.click(screen.getByRole('button', { name: '点击翻阅使至塞上' }));
    expect(screen.getByTestId('timeline-rail-card-work-04')).toHaveAttribute('data-flipped', 'true');
    fireEvent.keyDown(screen.getByTestId('timeline-rail-viewport'), { key: 'Escape' });
    expect(screen.getByTestId('timeline-rail-card-work-04')).toHaveAttribute('data-flipped', 'false');
  });

  it('captures only the works area and releases both endpoints', () => {
    renderWorks();
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.click(screen.getByRole('button', { name: '定位到序章' }));
    expect(fireEvent.wheel(viewport, { deltaY: -120 })).toBe(true);
    expect(fireEvent.wheel(viewport, { deltaY: 120 })).toBe(false);
    expect(fireEvent.wheel(screen.getByTestId('timeline-rail'), { deltaY: 120 })).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '定位到尾声' }));
    expect(fireEvent.wheel(viewport, { deltaY: 120 })).toBe(true);
  });

  it('supports keyboard controls and five visible cards', () => {
    renderWorks();
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.keyDown(viewport, { key: 'Enter' });
    expect(screen.getByTestId('timeline-rail-card-work-03')).toHaveAttribute('data-flipped', 'true');
    fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '3');
    expect(document.querySelectorAll('.timeline-rail__card-shell[data-visible="true"]')).toHaveLength(5);
  });

  it('preserves mobile wheel and browser zoom', () => {
    renderWorks();
    const viewport = screen.getByTestId('timeline-rail-viewport');
    expect(fireEvent.wheel(viewport, { deltaY: 100, ctrlKey: true })).toBe(true);
    vi.stubGlobal('innerWidth', 390);
    expect(fireEvent.wheel(viewport, { deltaY: 100 })).toBe(true);
  });

  it('cancels buffered wheel input on direct node selection', () => {
    vi.useFakeTimers();
    renderWorks();
    fireEvent.wheel(screen.getByTestId('timeline-rail-viewport'), { deltaY: 240 });
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 06' }));
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '5');
  });

  it('updates the history and real work title together for every node', () => {
    renderWorks();
    for (let index = 0; index < 11; index++) {
      fireEvent.click(screen.getByRole('button', { name: `定位到节点 ${String(index + 1).padStart(2, '0')}` }));
      expect(screen.getByTestId('timeline-history')).toHaveTextContent(timelineWorks[index].history);
      expect(screen.getByTestId('timeline-rail-active-card')).toHaveTextContent(timelineWorks[index].title);
      expect(screen.getByTestId('timeline-rail-active-card')).toHaveTextContent(timelineWorks[index].author);
    }
  });

  it('keeps long back-face reading separate from wheel navigation and offers a return button', () => {
    renderWorks();
    fireEvent.click(screen.getByRole('button', { name: '点击翻阅春江花月夜' }));
    const reading = screen.getByLabelText('春江花月夜作品解读');
    expect(reading).toHaveTextContent(timelineWorks[2].interpretation);
    expect(fireEvent.wheel(reading, { deltaY: 120 })).toBe(true);
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '2');
    fireEvent.click(screen.getByRole('button', { name: '翻回春江花月夜正面' }));
    expect(screen.getByTestId('timeline-rail-card-work-03')).toHaveAttribute('data-flipped', 'false');
  });

  it('starts on the prologue and navigates thirteen scenes without adding poem cards', () => {
    render(<TangTimelineRail />);
    expect(screen.getByRole('heading', { name: '大唐初启 万千诗声将起' })).toBeInTheDocument();
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
    expect(screen.queryAllByRole('button', { name: /^定位到/ })).toHaveLength(0);
    expect(screen.queryByTestId('timeline-rail-active-card')).toBeNull();
    expect(document.querySelector('.timeline-rail__progress')).toHaveTextContent('序章');
    expect(screen.getByTestId('timeline-boundary-caption')).toHaveTextContent('289年 · 十一首诗 · 一部大唐兴衰史');
    fireEvent.click(screen.getByRole('button', { name: '循诗入唐 →' }));
    expect(screen.getAllByRole('button', { name: /^定位到/ })).toHaveLength(13);
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '0');
    const viewport = screen.getByTestId('timeline-rail-viewport');
    fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
    fireEvent.click(screen.getByRole('button', { name: '循诗入唐 →' }));
    fireEvent.click(screen.getByRole('button', { name: '定位到节点 11' }));
    fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: '大唐已远 诗声未息' })).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^定位到/ })).toHaveLength(0);
    expect(screen.queryByTestId('timeline-rail-active-card')).toBeNull();
    expect(fireEvent.wheel(viewport, { deltaY: 120 })).toBe(true);
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'epilogue');
    fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
    expect(screen.getByTestId('timeline-rail-active-card')).toHaveAttribute('data-card-index', '10');
    fireEvent.click(screen.getByRole('button', { name: '定位到尾声' }));
    fireEvent.click(screen.getByRole('button', { name: '回看十一首诗 →' }));
    expect(document.querySelector('details')).toHaveAttribute('open');
    expect(document.querySelector('.timeline-rail__reading-list ol')?.children).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: '重返公元618年 ↺' }));
    expect(screen.getByTestId('timeline-rail')).toHaveAttribute('data-reading-node', 'prologue');
    expect(document.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('navigation', { name: '序章与尾声' })).toBeNull();
  });
});
