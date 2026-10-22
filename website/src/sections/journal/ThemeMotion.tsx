import { useEffect, useRef, useState } from 'react';
import motionVideo from '../../assets/journal/theme-motion-stable.mp4';

type Props = { themeId: string | null; clipId: string | null; explicit?: boolean };

/** One decoder shared by all six SVG masks. The still remains underneath. */
export function ThemeMotion({ themeId, clipId, explicit = false }: Props) {
  const frameRef = useRef<SVGForeignObjectElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const generation = useRef(0);
  const permitted = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [request, setRequest] = useState<{ id: string; generation: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [retainedClipId, setRetainedClipId] = useState(clipId);
  const [suspended, setSuspended] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduced(media?.matches ?? false);
    const onVisibility = () => setVisible(!document.hidden);
    const onNavigation = () => setSuspended(true);
    media?.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('popstate', onNavigation);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (!entry.isIntersecting) setSuspended(true);
    });
    // Chromium may report empty SVG intersections while clip paths change.
    // Observe HTML layout, independent of the SVG's painted geometry.
    const viewport = frameRef.current?.closest('.pj-donut-wrap') ?? frameRef.current?.closest('svg')?.parentElement;
    if (viewport) observer?.observe(viewport);
    return () => {
      media?.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('hashchange', onNavigation);
      window.removeEventListener('popstate', onNavigation);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => { setSuspended(false); }, [themeId, explicit]);
  // Opacity fades after deactivation. Keep the last mask so the rectangular
  // source background cannot flash outside the sector during those 150ms.
  useEffect(() => { if (clipId) setRetainedClipId(clipId); }, [clipId]);
  useEffect(() => { if (!visible) setSuspended(true); }, [visible]);

  useEffect(() => {
    const token = ++generation.current;
    permitted.current = false;
    setRequest(null);
    setPlaying(false);
    if (!themeId || suspended || !visible || !inView || (reduced && !explicit)) return;
    const timer = setTimeout(() => {
      setLoaded(true);
      setRequest({ id: themeId, generation: token });
    }, explicit ? 0 : 100);
    return () => clearTimeout(timer);
  }, [themeId, explicit, suspended, visible, inView, reduced]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!request) { video.pause(); return; }
    const token = request.generation;
    permitted.current = true;
    video.muted = true;
    video.playbackRate = request.id === 'war' ? 1.5 : 1.2;
    video.currentTime = 0;
    try {
      video.play()?.catch(() => {
        if (generation.current !== token) return;
        permitted.current = false;
        setPlaying(false);
      });
    } catch {
      permitted.current = false;
      setPlaying(false);
    }
    return () => { permitted.current = false; video.pause(); };
  }, [loaded, request]);

  const shown = request?.id === themeId && playing && !suspended && visible && inView;
  const maskId = clipId ?? retainedClipId;
  return <g clipPath={maskId ? `url(#${maskId})` : undefined} aria-hidden="true" pointerEvents="none">
    <foreignObject ref={frameRef} x={-200} y={-200} width={400} height={400} className={`pj-theme-motion${shown ? ' is-playing' : ''}`}>
      {loaded && <video ref={videoRef} src={motionVideo} muted loop playsInline preload="none" tabIndex={-1} disablePictureInPicture
        onPlaying={() => { if (permitted.current) setPlaying(true); }}
        onWaiting={() => setPlaying(false)}
        onError={() => { permitted.current = false; setPlaying(false); setRequest(null); }} />}
    </foreignObject>
  </g>;
}
