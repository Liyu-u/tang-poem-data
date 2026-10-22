import { useEffect, useRef, useState, type RefObject } from 'react';
import { createSceneRenderer, type ScenePointer, type SceneRegion, type SceneRenderer } from './sceneMotionRenderer';

/** The canvas shares the SVG's original artwork coordinates, including letterboxing. */
export function ImagerySceneMotion({ region, artwork, pointer, leaving = false }: {
  region: SceneRegion; artwork: string; pointer: RefObject<ScenePointer>; leaving?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const leave = useRef(leaving);
  leave.current = leaving;
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference?.matches ?? false);
    preference?.addEventListener('change', update);
    return () => preference?.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (reduced || !canvas.current) return;
    const surface = canvas.current;
    const source = new Image();
    let renderer: SceneRenderer | null = null;
    let frame = 0, disposed = false, visible = true, previous = 0, elapsed = 0, amount = 0;
    const current = { x: pointer.current.x, y: pointer.current.y, speed: 0, vx: 0, inside: true };
    const frameInterval = window.matchMedia?.('(pointer: coarse)').matches ? 1000 / 30 : 1000 / 60;
    let lastDraw = 0;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || !renderer) return;
      if (now - lastDraw < frameInterval - .5) { frame = requestAnimationFrame(tick); return; }
      lastDraw = now;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60;
      previous = now; elapsed += dt;
      const ease = 1 - Math.exp(-dt * 5);
      current.x += (pointer.current.x - current.x) * ease;
      current.y += (pointer.current.y - current.y) * ease;
      current.speed += (pointer.current.speed - current.speed) * ease;
      current.vx += ((pointer.current.vx ?? 0) - current.vx) * ease;
      pointer.current.speed *= Math.exp(-dt * 4);
      if (pointer.current.vx) pointer.current.vx *= Math.exp(-dt * 3);
      amount += ((leave.current ? 0 : 1) - amount) * (1 - Math.exp(-dt * (leave.current ? 13 : 4.5)));
      surface.style.opacity = String(Math.min(1, amount * 4));
      renderer.draw(elapsed, amount, current);
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      previous = 0;
      if (!frame && visible && !document.hidden && renderer && !disposed) frame = requestAnimationFrame(tick);
      else if (document.hidden || !visible) { cancelAnimationFrame(frame); frame = 0; }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    observer?.observe(surface);
    document.addEventListener('visibilitychange', resume);
    source.onload = () => {
      if (disposed) return;
      void createSceneRenderer(surface, source, region).then((loaded) => {
        if (disposed) { loaded?.dispose(); return; }
        renderer = loaded;
        if (renderer) surface.dataset.ready = 'true';
        resume();
      }).catch(() => { /* Preserve the complete original painting on asset failure. */ });
    };
    source.src = artwork;
    return () => {
      disposed = true; source.onload = null; cancelAnimationFrame(frame);
      observer?.disconnect(); document.removeEventListener('visibilitychange', resume); renderer?.dispose();
    };
  }, [artwork, region, reduced, pointer]);
  return <g data-animated-scene={region.name} data-paint-renderer="layered-canvas" aria-hidden="true" className="imagery-scene-motion">
    {!reduced && <foreignObject x={0} y={0} width={1188} height={1324}>
      <canvas ref={canvas} width={1188} height={1324} className="imagery-scene-motion__canvas" />
    </foreignObject>}
  </g>;
}
