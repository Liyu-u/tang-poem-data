import { useCallback, useEffect, useRef } from 'react';

/** One scroll owner for chapter links, gestures and keyboard navigation. */
export function usePageScroll(sectionIds: readonly string[]) {
  const controller = useRef<(id: string) => void>(() => {});
  const key = sectionIds.join('|');

  useEffect(() => {
    const ids = key.split('|');
    const root = document.documentElement;
    root.classList.add('page-scroll-locked');
    let frame = 0;
    let animating = false;
    let wheelTimer: ReturnType<typeof setTimeout>;
    let resizeTimer: ReturnType<typeof setTimeout>;
    let gestureUsed = false;
    let buffer = 0;
    let anchor = { id: ids[0], offset: 0 };
    let touch: { x: number; y: number; target: EventTarget | null; native: boolean } | null = null;

    const navHeight = () => document.querySelector<HTMLElement>('.global-nav')?.offsetHeight ?? 84;
    const chapterTop = (id: string) => {
      const element = document.getElementById(id);
      return element ? Math.max(0, element.getBoundingClientRect().top + window.scrollY - navHeight()) : 0;
    };
    const stops = () => ids.flatMap(id => {
      const element = document.getElementById(id);
      if (!element) return [];
      const top = chapterTop(id);
      const height = Math.max(1, window.innerHeight - navHeight());
      const end = top + Math.max(0, element.getBoundingClientRect().height - height);
      const result = [top];
      for (let offset = top + height; offset < end - 1; offset += height) result.push(offset);
      if (end > top + 1) result.push(end);
      return result;
    }).sort((a, b) => a - b).filter((value, index, all) => !index || value - all[index - 1] > 1);

    const move = (top: number, immediate = false) => {
      cancelAnimationFrame(frame);
      const id = [...ids].reverse().find(id => chapterTop(id) <= top + 1) ?? ids[0];
      anchor = { id, offset: (top - chapterTop(id)) / Math.max(1, window.innerHeight - navHeight()) };
      const start = window.scrollY;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (immediate || reduced || Math.abs(start - top) < 1) {
        animating = false;
        window.scrollTo({ top, behavior: 'instant' });
        return;
      }
      animating = true;
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / 720);
        const eased = 1 - Math.pow(1 - progress, 4);
        window.scrollTo({ top: start + (top - start) * eased, behavior: 'instant' });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else { animating = false; window.scrollTo({ top, behavior: 'instant' }); }
      };
      frame = requestAnimationFrame(tick);
    };
    const step = (direction: number) => {
      const positions = stops();
      const next = direction > 0 ? positions.find(top => top > window.scrollY + 2) : positions.reverse().find(top => top < window.scrollY - 2);
      if (next !== undefined) move(next);
    };
    const blocked = (target: EventTarget | null) => document.querySelector('[aria-modal="true"]') ||
      (target instanceof Element && target.closest('.global-nav, input, textarea, select, [contenteditable="true"]'));
    const canRead = (target: EventTarget | null, direction: number) => {
      for (let node = target instanceof Element ? target : null; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1 &&
          (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 1)) return true;
      }
      return false;
    };
    const settleWheel = () => {
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { gestureUsed = false; buffer = 0; }, 180);
    };
    // Capture before an entering chapter can consume the tail of the page gesture.
    const guardWheel = (event: WheelEvent) => {
      if (event.ctrlKey || blocked(event.target) || (!animating && !gestureUsed)) return;
      event.preventDefault();
      event.stopPropagation();
      settleWheel();
    };
    const wheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || blocked(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (!delta || canRead(event.target, delta)) return;
      event.preventDefault();
      settleWheel();
      if (animating || gestureUsed) return;
      if (Math.sign(buffer) !== Math.sign(delta)) buffer = 0;
      buffer += delta;
      if (Math.abs(buffer) >= 32) { gestureUsed = true; step(Math.sign(buffer)); buffer = 0; }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || blocked(event.target)) return;
      if (event.target instanceof Element && event.target.closest('button, a, [role="slider"], [role="tablist"]') && event.key === ' ') return;
      const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
      if (!direction && event.key !== 'Home' && event.key !== 'End') return;
      if (direction && canRead(event.target, direction)) return;
      event.preventDefault();
      if (event.repeat || animating) return;
      if (event.key === 'Home') move(0);
      else if (event.key === 'End') move(stops().at(-1) ?? 0);
      else step(direction);
    };
    const touchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1 && !blocked(event.target)
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target, native: false } : null;
    };
    const touchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return;
      const dy = touch.y - event.touches[0].clientY;
      const dx = touch.x - event.touches[0].clientX;
      if (Math.abs(dx) >= Math.abs(dy)) return;
      if (canRead(touch.target, dy)) { touch.native = true; return; }
      if (!touch.native && event.cancelable) event.preventDefault();
    };
    const touchEnd = (event: TouchEvent) => {
      if (!touch) return;
      const start = touch;
      touch = null;
      const end = event.changedTouches[0];
      if (!end || start.native || event.defaultPrevented || animating) return;
      const dy = start.y - end.clientY;
      if (Math.abs(dy) >= 50 && Math.abs(dy) > Math.abs(start.x - end.clientX) && !canRead(start.target, dy)) step(Math.sign(dy));
    };
    const navigate = (id: string) => { if (ids.includes(id)) move(chapterTop(id)); };
    const hash = () => navigate(window.location.hash.slice(1));
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const target = chapterTop(anchor.id) + anchor.offset * Math.max(1, window.innerHeight - navHeight());
        const positions = stops();
        const nearest = positions.reduce((best, top) => Math.abs(top - target) < Math.abs(best - target) ? top : best, positions[0] ?? 0);
        move(nearest, true);
      }, 100);
    };
    controller.current = navigate;
    document.addEventListener('wheel', guardWheel, { passive: false, capture: true });
    document.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('keydown', keyboard);
    document.addEventListener('touchstart', touchStart, { passive: true });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd);
    document.addEventListener('touchcancel', touchEnd);
    window.addEventListener('hashchange', hash);
    window.addEventListener('resize', resize);
    if (ids.includes(window.location.hash.slice(1))) navigate(window.location.hash.slice(1));
    else move(window.scrollY, true);
    return () => {
      root.classList.remove('page-scroll-locked');
      cancelAnimationFrame(frame);
      clearTimeout(wheelTimer);
      clearTimeout(resizeTimer);
      document.removeEventListener('wheel', wheel);
      document.removeEventListener('wheel', guardWheel, true);
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('touchstart', touchStart);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', touchEnd);
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('resize', resize);
      controller.current = () => {};
    };
  }, [key]);

  return useCallback((id: string) => controller.current(id), []);
}
