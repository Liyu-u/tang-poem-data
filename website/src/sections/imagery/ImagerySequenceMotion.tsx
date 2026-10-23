import { useEffect, useRef, useState } from 'react';
import manifest from '../../assets/imagery-sequence-video/manifest.json';
import type { SceneRegion } from './sceneMotionRenderer';

const assets = import.meta.glob('../../assets/imagery-sequence-video/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const hasSceneVideo = (name: string) => Object.hasOwn(manifest, name);
const scenes = manifest as Record<string, { id: string; x: number; y: number; width: number; height: number }>;

/** Transparent video and original-paper plate share the chart's SVG coordinates. */
export function ImagerySequenceMotion({ region, leaving = false }: { region: SceneRegion; leaving?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const scene = scenes[region.name];
  const url = (file: string) => assets[`../../assets/imagery-sequence-video/${file}`];
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media?.matches ?? false);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const surface = canvas.current, movie = video.current;
    if (!surface || !movie || reduced) return;
    let disposed = false, visible = true, frame = 0, plateReady = false;
    const plate = new Image();
    const detail = document.createElement('canvas');
    detail.width = 1188; detail.height = 1324;
    const protectNeighbor = scene.id === 'flower' || scene.id === 'water';
    
    const draw = () => {
      if (disposed || !plateReady || movie.readyState < 2) return;
      const ctx = surface.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 1188, 1324);
      if (protectNeighbor) {
        // Overlay only moving pigment inside the original organic silhouette.
        // The original painting stays underneath: no erased backdrop, rectangular
        // row clip, or duplicated foreground can cut through its branches.
        const layer = detail.getContext('2d');
        if (!layer) return;
        layer.clearRect(0, 0, 1188, 1324);
        layer.globalCompositeOperation = 'source-over';
        layer.drawImage(movie, scene.x, scene.y, scene.width, scene.height);
        layer.globalCompositeOperation = 'destination-in';
        layer.drawImage(plate, 0, 0, 1188, 1324);
        layer.globalCompositeOperation = 'source-over';
        ctx.drawImage(detail, 0, 0);
      } else {
        ctx.drawImage(plate, 0, 0, 1188, 1324);
        ctx.drawImage(movie, scene.x, scene.y, scene.width, scene.height);
      }
      surface.style.opacity = '1';
      surface.dataset.ready = 'true';
    };
    const tick = () => { frame = 0; draw(); if (!disposed && !movie.paused && visible && !document.hidden) frame = requestAnimationFrame(tick); };
    const resume = () => {
      if (disposed) return;
      if (!visible || document.hidden || leaving) { if (!movie.paused) movie.pause(); cancelAnimationFrame(frame); frame = 0; return; }
      if (!plateReady || movie.readyState < 2) return;
      if (movie.ended) movie.currentTime = 0;
      void movie.play().then(() => { if (!disposed && !frame) frame = requestAnimationFrame(tick); }).catch(() => { /* Keep the static chart if decoding or autoplay fails. */ });
    };
    plate.onload = () => { plateReady = true; draw(); resume(); };
    plate.src = url(`${scene.id}-${protectNeighbor ? 'motion-mask' : 'plate'}.png`);
    movie.addEventListener('loadeddata', resume);
    movie.addEventListener('ended', draw);
    movie.addEventListener('seeked', draw);
    document.addEventListener('visibilitychange', resume);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    observer?.observe(surface);
    resume();
    return () => {
      disposed = true; cancelAnimationFrame(frame); if (!movie.paused) movie.pause(); plate.onload = null;
      movie.removeEventListener('loadeddata', resume); movie.removeEventListener('ended', draw); movie.removeEventListener('seeked', draw);
      document.removeEventListener('visibilitychange', resume); observer?.disconnect();
    };
  }, [scene, region, reduced, leaving]);
  return <g data-animated-scene={region.name} data-paint-renderer="sequence-video" className="imagery-scene-motion" aria-hidden="true" style={{ opacity: leaving ? 0 : 1, transition: 'opacity 400ms ease-out' }}>
    {!reduced && <foreignObject x={0} y={0} width={1188} height={1324}>
      <canvas ref={canvas} width={1188} height={1324} className="imagery-scene-motion__canvas" style={{ opacity: 0, transition: 'opacity 220ms ease-out' }} />
      <video ref={video} src={url(`${scene.id}${scene.id === 'flower' ? '-detail' : ''}.webm`)} muted loop playsInline preload="auto" style={{ display: 'none' }} />
    </foreignObject>}
  </g>;
}

