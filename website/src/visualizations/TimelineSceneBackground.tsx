import { useEffect, useRef, useState } from 'react';
import { timelineScenes } from '../data/timelineScenes';

type Scene = (typeof timelineScenes)[number];
type BackgroundState = {
  base: Scene;
  target: Scene | null;
  phase: 'idle' | 'loading' | 'prepared' | 'fading' | 'failed';
  generation: number;
};

export function TimelineSceneBackground({ index }: { index: number }) {
  const sceneIndex = Math.min(Math.max(index + 1, 0), timelineScenes.length - 1);
  const scene = timelineScenes[sceneIndex];
  const [state, setState] = useState<BackgroundState>({ base: scene, target: null, phase: 'idle', generation: 0 });
  const incomingRef = useRef<HTMLImageElement>(null);

  // An invisible request may be superseded. Once it contributes pixels, keep
  // both layers intact until transitionend; removing it would expose an older
  // scene. After promotion, this reconciliation starts only the latest request.
  if (state.phase !== 'fading' && (state.target ?? state.base).id !== scene.id) {
    setState({
      ...state,
      target: scene.id === state.base.id ? null : scene,
      phase: scene.id === state.base.id ? 'idle' : 'loading',
      generation: state.generation + 1,
    });
  }

  const { base, target, phase, generation } = state;
  const layers = target ? [base, target] : [base];

  useEffect(() => {
    if (phase !== 'loading') return;
    const image = incomingRef.current;
    // Reversing a fade reuses the former base with the same key and src.
    // That DOM image is already complete and will not emit another load event.
    if (!image?.complete || !image.naturalWidth) return;
    let cancelled = false;
    const prepareCachedImage = async () => {
      try {
        await image.decode?.();
        if (!cancelled) setState(current => current.generation === generation && current.phase === 'loading'
          ? { ...current, phase: 'prepared' } : current);
      } catch {
        if (!cancelled) setState(current => current.generation === generation && current.phase === 'loading'
          ? { ...current, phase: 'failed' } : current);
      }
    };
    void prepareCachedImage();
    return () => { cancelled = true; };
  }, [phase, generation]);

  useEffect(() => {
    if (phase !== 'fading') return;
    // CSS opacity lasts 900ms. Browsers can omit transitionend when a layer
    // is hidden or a transition is interrupted; never strand the scene queue.
    const timer = window.setTimeout(() => {
      setState(current => current.generation === generation && current.phase === 'fading' && current.target
        ? { ...current, base: current.target, target: null, phase: 'idle' } : current);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase, generation]);

  useEffect(() => {
    if (phase !== 'prepared') return;
    let secondFrame: number | undefined;
    // Give cached/decoded targets a painted opacity-zero frame as well.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setState((current) => {
          if (current.generation !== generation || current.phase !== 'prepared' || !current.target) return current;
          if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            return { ...current, base: current.target, target: null, phase: 'idle' };
          }
          return { ...current, phase: 'fading' };
        });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [phase, generation]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const finishWithoutMotion = () => {
      if (!media.matches) return;
      setState((current) => current.generation === generation && current.target
        ? { ...current, base: current.target, target: null, phase: 'idle' } : current);
    };
    finishWithoutMotion();
    media.addEventListener('change', finishWithoutMotion);
    return () => media.removeEventListener('change', finishWithoutMotion);
  }, [phase, generation]);

  // Fetch only adjacent scenes ahead of time; no eager download of all 13 full backgrounds.
  useEffect(() => {
    for (const neighbor of [timelineScenes[sceneIndex - 1], timelineScenes[sceneIndex + 1]]) {
      if (neighbor) { const image = new Image(); image.src = neighbor.image; }
    }
  }, [sceneIndex]);

  return (
    <div className="timeline-chapter__scene" data-testid="timeline-scene-background" data-scene={scene.id} data-displayed-scene={base.id} data-transition-phase={phase} aria-hidden="true">
      {layers.map((layer) => {
        const incoming = layer.id !== base.id;
        // Promote the already decoded target in place instead of replacing its
        // pixels on a different async-decoding image at the end of the fade.
        return <img key={layer.id} ref={incoming ? incomingRef : undefined} data-scene-base={!incoming || undefined} data-scene-target={incoming || undefined} src={layer.image}
          className={incoming ? `${phase === 'fading' ? 'is-ready' : ''}${phase === 'failed' ? ' is-failed' : ''}` : undefined}
          style={{ objectPosition: layer.position }} alt="" decoding="async" draggable={false}
          onLoad={incoming ? async (event) => {
            const image = event.currentTarget;
            try {
              // load alone does not guarantee the next paint has decoded pixels.
              await image.decode?.();
              setState((current) => current.generation === generation && current.phase === 'loading'
                ? { ...current, phase: 'prepared' } : current);
            } catch {
              setState((current) => current.generation === generation && current.phase === 'loading'
                ? { ...current, phase: 'failed' } : current);
            }
          } : undefined}
          onError={incoming ? () => setState((current) => current.generation === generation && current.phase === 'loading'
            ? { ...current, phase: 'failed' } : current) : undefined}
          onTransitionEnd={incoming ? (event) => {
            if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
            setState((current) => current.generation === generation && current.phase === 'fading' && current.target
              ? { ...current, base: current.target, target: null, phase: 'idle' } : current);
          } : undefined} />;
      })}
    </div>
  );
}
