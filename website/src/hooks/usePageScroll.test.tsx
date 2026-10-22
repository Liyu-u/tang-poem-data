import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageScroll } from './usePageScroll';

function Harness() {
  const navigate = usePageScroll(['intro', 'timeline', 'imagery']);
  return <><header className="global-nav" /><main>{['intro', 'timeline', 'imagery'].map(id => <section id={id} key={id}><button onClick={() => navigate('imagery')}>go</button></section>)}</main></>;
}

describe('locked page scrolling', () => {
  let y = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    y = 0;
    vi.stubGlobal('scrollY', 0);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      y = (options as ScrollToOptions).top ?? 0;
      vi.stubGlobal('scrollY', y);
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const index = ['intro', 'timeline', 'imagery'].indexOf(this.id);
      const top = index * 716 + 84 - y;
      return { top, bottom: top + 716, height: 716, width: 1000, left: 0, right: 1000, x: 0, y: top, toJSON() {} };
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(84);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('advances one screen and suppresses continuous inertia', () => {
    const view = render(<Harness />);
    fireEvent.wheel(document.getElementById('intro')!, { deltaY: 120 });
    expect(y).toBe(716);
    fireEvent.wheel(document.getElementById('timeline')!, { deltaY: 120 });
    expect(y).toBe(716);
    act(() => vi.advanceTimersByTime(200));
    fireEvent.wheel(document.getElementById('timeline')!, { deltaY: 120 });
    expect(y).toBe(1432);
    view.unmount();
    expect(document.documentElement).not.toHaveClass('page-scroll-locked');
  });

  it('respects consumed chapter gestures and editable controls', () => {
    const view = render(<Harness />);
    const section = document.getElementById('intro')!;
    section.addEventListener('wheel', event => event.preventDefault());
    fireEvent.wheel(section, { deltaY: 120 });
    expect(y).toBe(0);
    const input = document.createElement('input');
    section.append(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(y).toBe(0);
    view.unmount();
  });

  it('supports keyboard navigation and exact chapter links', () => {
    const view = render(<Harness />);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(y).toBe(716);
    fireEvent.click(view.getAllByText('go')[0]);
    expect(y).toBe(1432);
    fireEvent.keyDown(document.body, { key: 'Home' });
    expect(y).toBe(0);
    view.unmount();
  });

  it('leaves nested reading scrollable until its boundary', () => {
    const view = render(<Harness />);
    const reading = document.createElement('div');
    reading.style.overflowY = 'auto';
    Object.defineProperties(reading, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
    document.getElementById('intro')!.append(reading);
    fireEvent.wheel(reading, { deltaY: 120 });
    expect(y).toBe(0);
    reading.scrollTop = 800;
    fireEvent.wheel(reading, { deltaY: 120 });
    expect(y).toBe(716);
    view.unmount();
  });

  it('turns a vertical touch gesture into one page', () => {
    const view = render(<Harness />);
    const section = document.getElementById('intro')!;
    fireEvent.touchStart(section, { touches: [{ clientX: 100, clientY: 500 }] });
    fireEvent.touchMove(section, { touches: [{ clientX: 102, clientY: 200 }] });
    fireEvent.touchEnd(section, { changedTouches: [{ clientX: 102, clientY: 200 }] });
    expect(y).toBe(716);
    view.unmount();
  });

  it('finishes animated navigation at the exact destination', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const view = render(<Harness />);
    fireEvent.wheel(document.getElementById('intro')!, { deltaY: 120 });
    act(() => vi.advanceTimersByTime(800));
    expect(y).toBe(716);
    view.unmount();
  });

  it('does not deliver chapter wheel input while a page is entering', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const view = render(<Harness />);
    const chapter = document.getElementById('timeline')!;
    const nestedWheel = vi.fn((event: WheelEvent) => event.preventDefault());
    chapter.addEventListener('wheel', nestedWheel);
    fireEvent.wheel(document.getElementById('intro')!, { deltaY: 120 });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.wheel(chapter, { deltaY: 120 });
    expect(nestedWheel).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(800));
    fireEvent.wheel(chapter, { deltaY: 120 });
    expect(nestedWheel).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('keeps long chapter content reachable with viewport-sized stops', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = (this.id === 'intro' ? 84 : this.id === 'timeline' ? 1600 : 2316) - y;
      const height = this.id === 'intro' ? 1516 : 716;
      return { top, bottom: top + height, height, width: 1000, left: 0, right: 1000, x: 0, y: top, toJSON() {} };
    });
    const view = render(<Harness />);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(y).toBe(716);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(y).toBe(800);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(y).toBe(1516);
    view.unmount();
  });

  it('retains the selected chapter when viewport geometry changes', () => {
    const view = render(<Harness />);
    fireEvent.click(view.getAllByText('go')[0]);
    vi.stubGlobal('innerHeight', 1000);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = ['intro', 'timeline', 'imagery'].indexOf(this.id) * 916 + 84 - y;
      return { top, bottom: top + 916, height: 916, width: 1000, left: 0, right: 1000, x: 0, y: top, toJSON() {} };
    });
    fireEvent(window, new Event('resize'));
    act(() => vi.advanceTimersByTime(150));
    expect(y).toBe(1832);
    view.unmount();
  });
});
