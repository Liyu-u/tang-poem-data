import { useEffect, useRef, type RefObject } from 'react';

const layerDepths = {
  background: [6, 4], poetry: [10, 7], title: [16, 10], figures: [22, 14],
} as const;

export type HeroParallaxOffset = { x: number; y: number };

// Update compositor translations without invalidating inherited particle styles.
export function useHeroParallax(sectionRef: RefObject<HTMLElement | null>, onFrame?: (offset: HeroParallaxOffset) => void) {
  const frameCallback = useRef(onFrame);
  useEffect(() => { frameCallback.current = onFrame; }, [onFrame]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 801px) and (prefers-reduced-motion: no-preference)');
    const layers = [...section.querySelectorAll<HTMLElement>('[data-hero-depth]')].flatMap(element => {
      const depth = layerDepths[element.dataset.heroDepth as keyof typeof layerDepths];
      return depth ? [{ element, depth }] : [];
    });
    let bounds: DOMRect | null = null;
    let visible = true;
    let current = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };
    let frame: number | null = null;
    let lastTime: number | null = null;
    const write = () => {
      for (const { element, depth } of layers) {
        element.style.translate = `${Number((-current.x * depth[0]).toFixed(3))}px ${Number((-current.y * depth[1]).toFixed(3))}px`;
      }
    };
    const reset = (notify = true) => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      current = { x: 0, y: 0 };
      target = { x: 0, y: 0 };
      bounds = null;
      write();
      if (notify) frameCallback.current?.({ x: 0, y: 0 });
    };
    const resetMotion = () => reset();
    const animate = (time: number) => {
      frame = null;
      const elapsed = lastTime === null ? 16 : Math.min(64, time - lastTime);
      lastTime = time;
      const blend = 1 - Math.exp(-elapsed / 110);
      current.x += (target.x - current.x) * blend;
      current.y += (target.y - current.y) * blend;
      const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      if (settled) current = { ...target };
      write();
      // Keep alpha hit-testing attached to the moving figures, even as easing continues.
      frameCallback.current?.({ x: -current.x * 22, y: -current.y * 14 });
      if (!settled) frame = requestAnimationFrame(animate);
      else lastTime = null;
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(animate); };
    const move = (event: PointerEvent) => {
      if (!media.matches || !visible || document.hidden || event.pointerType === 'touch') return;
      const rect = bounds ??= section.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target = {
        x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)),
      };
      schedule();
    };
    const leave = () => {
      target = { x: 0, y: 0 };
      if (current.x || current.y || frame !== null) schedule();
    };
    const visibility = () => { if (document.hidden) reset(); };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) reset();
    });
    reset(false);
    observer?.observe(section);
    section.addEventListener('pointermove', move);
    section.addEventListener('pointerleave', leave);
    section.addEventListener('pointercancel', leave);
    media.addEventListener('change', resetMotion);
    window.addEventListener('blur', resetMotion);
    window.addEventListener('resize', resetMotion);
    window.addEventListener('scroll', resetMotion, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      reset(false);
      observer?.disconnect();
      section.removeEventListener('pointermove', move);
      section.removeEventListener('pointerleave', leave);
      section.removeEventListener('pointercancel', leave);
      media.removeEventListener('change', resetMotion);
      window.removeEventListener('blur', resetMotion);
      window.removeEventListener('resize', resetMotion);
      window.removeEventListener('scroll', resetMotion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [sectionRef]);
}
