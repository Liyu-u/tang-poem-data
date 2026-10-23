import { useEffect, useId, useRef, useState } from "react";
import { experimentNotes, type ExperimentalPoet } from "./experimentCatalog";
import type { createStarStudy } from "./starStudyRenderer";

export function StarStudy({
  name,
  detailed,
}: {
  name: ExperimentalPoet;
  detailed: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createStarStudy> | null>(null);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [fallback, setFallback] = useState(false),
    [fps, setFps] = useState(0);
  const state = useRef({ playing, detailed });
  state.current = { playing, detailed };
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const prefix = useId().replace(/:/g, "");
  useEffect(() => {
    let cancelled = false;
    setFps(0);
    if (typeof WebGL2RenderingContext === "undefined") {
      setFallback(true);
      return;
    }
    setFallback(false);
    import("./starStudyRenderer")
      .then(({ createStarStudy }) => {
        if (cancelled || !host.current) return;
        try {
          controller.current = createStarStudy(
            host.current,
            name,
            setFps,
            () => {
              controller.current?.dispose();
              controller.current = null;
              setFallback(true);
            },
          );
          controller.current.update(
            state.current.playing,
            state.current.detailed,
          );
        } catch {
          controller.current?.dispose();
          controller.current = null;
          setFallback(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, [name]);
  useEffect(() => {
    controller.current?.update(playing, detailed);
  }, [playing, detailed]);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => {
      if (query?.matches) setPlaying(false);
    };
    query?.addEventListener?.("change", change);
    return () => query?.removeEventListener?.("change", change);
  }, []);
  const colors =
    name === "王维"
      ? ["#163e39", "#8ed9bb"]
      : name === "李商隐"
        ? ["#402353", "#d19bde"]
        : name === "杜甫"
          ? ["#773610", "#ffd08b"]
          : ["#163b69", "#b7e9ff"];
  return (
    <section className="pn-star-study" aria-label={`${name}星体近景`}>
      <div className="pn-study-topline"><span>星体近景</span></div>
      <div
        className="pn-study-viewport"
        role="region"
        aria-label={`旋转${name}星体`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key.startsWith("Arrow")) {
            e.preventDefault();
            controller.current?.rotate(
              e.key === "ArrowRight" ? 8 : e.key === "ArrowLeft" ? -8 : 0,
              e.key === "ArrowDown" ? 8 : e.key === "ArrowUp" ? -8 : 0,
            );
          }
          if (e.key === "Home") {
            e.preventDefault();
            controller.current?.reset();
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = drag.current;
          if (!g || g.id !== e.pointerId) return;
          controller.current?.rotate(e.clientX - g.x, e.clientY - g.y);
          g.x = e.clientX;
          g.y = e.clientY;
        }}
        onPointerUp={(e) => {
          if (drag.current?.id === e.pointerId) {
            drag.current = null;
            if (e.currentTarget.hasPointerCapture?.(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <div className="pn-study-canvas" ref={host} />
        {fallback && (
          <svg
            viewBox="0 0 300 240"
            className="pn-study-fallback"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`${prefix}-body`} cx="40%" cy="35%">
                <stop stopColor={colors[1]} />
                <stop offset=".6" stopColor={colors[0]} />
                <stop offset="1" stopColor="#040912" />
              </radialGradient>
            </defs>
            {!detailed ? (
              <circle cx="150" cy="115" r="6" fill="#e6f1ff" />
            ) : name === "元稹" ? (
              <>
                <circle
                  cx="118"
                  cy="110"
                  r="34"
                  fill={`url(#${prefix}-body)`}
                />
                <circle cx="199" cy="128" r="24" fill="#e6b3a7" />
              </>
            ) : name === "王维" || name === "李商隐" ? (
              <>
                <ellipse
                  cx="150"
                  cy="115"
                  rx="85"
                  ry="47"
                  fill="none"
                  stroke={colors[1]}
                  strokeWidth="19"
                  opacity=".25"
                  transform="rotate(-23 150 115)"
                />
                <ellipse
                  cx="143"
                  cy="115"
                  rx="73"
                  ry="63"
                  fill="none"
                  stroke={colors[1]}
                  strokeWidth="10"
                  opacity=".2"
                />
                <circle cx="150" cy="115" r="10" fill={colors[1]} />
              </>
            ) : (
              <>
                <circle
                  cx="150"
                  cy="115"
                  r={name === "杜甫" ? 59 : 49}
                  fill={`url(#${prefix}-body)`}
                />
                {name === "李白" && (
                  <ellipse
                    cx="150"
                    cy="115"
                    rx="65"
                    ry="29"
                    fill="none"
                    stroke={colors[1]}
                    opacity=".65"
                    transform="rotate(-32 150 115)"
                  />
                )}
              </>
            )}
          </svg>
        )}
      </div>
      <div className="pn-study-controls">
        <span>拖动或方向键观察</span>
        <button
          type="button"
          onClick={() => controller.current?.reset()}
          disabled={fallback}
        >
          重置星体
        </button>
        <button
          type="button"
          aria-label={playing ? "暂停星体自转" : "播放星体自转"}
          disabled={fallback}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? "暂停" : "播放"}
        </button>
      </div>
      <p className="pn-study-note">{experimentNotes[name]}</p>
    </section>
  );
}

