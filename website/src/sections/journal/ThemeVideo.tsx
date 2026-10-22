import { useEffect, useRef, useState } from 'react';
import farewellVideo from '../../assets/journal/theme-farewell.mp4';

type Props = { active: boolean; clipId: string; bounds: { x: number; y: number; width: number; height: number } };

export function ThemeVideo({ active, clipId, bounds }: Props) {
  const frameRef = useRef<SVGForeignObjectElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;
    const onMotion = () => setReduced(media?.matches ?? false);
    const onVisibility = () => setVisible(!document.hidden);
    const onNavigation = () => { setRequested(false); setPlaying(false); };
    media?.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('popstate', onNavigation);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    if (frameRef.current) observer?.observe(frameRef.current);
    return () => {
      media?.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('hashchange', onNavigation);
      window.removeEventListener('popstate', onNavigation);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    setRequested(false);
    setPlaying(false);
    if (!active || reduced || !visible || !inView) return;
    const timer = setTimeout(() => { setLoaded(true); setRequested(true); }, 300);
    return () => clearTimeout(timer);
  }, [active, reduced, visible, inView]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!requested) { video.pause(); return; }
    let cancelled = false;
    video.currentTime = 0;
    video.muted = true;
    const result = video.play();
    result?.then(() => { if (cancelled) video.pause(); }).catch(() => { if (!cancelled) setPlaying(false); });
    return () => { cancelled = true; video.pause(); };
  }, [loaded, requested]);

  return <g clipPath={`url(#${clipId})`} aria-hidden="true" pointerEvents="none">
    <foreignObject ref={frameRef} x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className={`pj-theme-video${active && requested && playing && !reduced && visible && inView ? ' is-playing' : ''}`}>
      {loaded && <video ref={videoRef} src={farewellVideo} muted loop playsInline preload="none" tabIndex={-1} disablePictureInPicture onPlaying={() => { if (requested) setPlaying(true); }} onError={() => { setPlaying(false); setRequested(false); }} />}
    </foreignObject>
  </g>;
}
