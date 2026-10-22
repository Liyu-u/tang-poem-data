import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { NetworkPoet, PoetRelation } from "./poetNetwork";
import { boundedZoom, projectPoint } from "./poetNetwork";
import type { createStarfield, StarMetrics } from "./starfieldRenderer";
import { isExperimentalPoet } from "./experimentCatalog";
import { layoutPoetLabels } from "./poetLabelLayout";

type Props = {
  poets: NetworkPoet[];
  relations: PoetRelation[];
  selectedPoetId?: string;
  selectedRelationId?: string;
  onSelectPoet: (id: string) => void;
  onSelectRelation: (id: string) => void;
  detailedStars?: boolean;
};
const initialView = { yaw: 0, pitch: -0.08, zoom: 1, panX: 0, panY: 0 };
const relationColor = (label: string) =>
  label === "赠诗"
    ? "#dfc087"
    : label === "交游" || label === "同游"
      ? "#82d5d1"
      : "#b3b7e7";

export function PoetNebula({
  poets,
  relations,
  selectedPoetId,
  selectedRelationId,
  onSelectPoet,
  onSelectRelation,
  detailedStars = true,
}: Props) {
  const [view, setView] = useState(initialView);
  const [dragging, setDragging] = useState(false);
  const [showAllRelations, setShowAllRelations] = useState(true);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [metrics, setMetrics] = useState<StarMetrics>({
    fps: 0,
    particles: 0,
    mode: "静态星图",
  });
  const [fallback, setFallback] = useState(false);
  const [surfaceSize, setSurfaceSize] = useState({ width: 900, height: 720 });
  const surface = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const renderer = useRef<ReturnType<typeof createStarfield> | null>(null);
  const current = useRef({ view, selectedPoetId, playing, detailedStars });
  current.current = { view, selectedPoetId, playing, detailedStars };
  const gesture = useRef<{
    x: number;
    y: number;
    id: number;
    moved: boolean;
    mode: "pan" | "rotate";
  } | null>(null);
  const suppressClickUntil = useRef(0);
  const prefix = useId().replace(/:/g, "");
  useEffect(() => {
    if (!surface.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) =>
      setSurfaceSize({
        width: entries[0].contentRect.width || 900,
        height: entries[0].contentRect.height || 720,
      }),
    );
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!canvasHost.current || typeof WebGL2RenderingContext === "undefined") {
      setFallback(true);
      return;
    }
    setFallback(false);
    import("./starfieldRenderer")
      .then(({ createStarfield }) => {
        if (cancelled || !canvasHost.current) return;
        try {
          renderer.current = createStarfield(
            canvasHost.current,
            poets,
            setMetrics,
            () => {
              renderer.current?.dispose();
              renderer.current = null;
              setFallback(true);
            },
          );
          const c = current.current;
          renderer.current.update(
            c.view,
            c.selectedPoetId,
            c.playing,
            c.detailedStars,
          );
        } catch {
          renderer.current?.dispose();
          renderer.current = null;
          setFallback(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [poets]);
  useEffect(() => {
    renderer.current?.update(view, selectedPoetId, playing, detailedStars);
  }, [view, selectedPoetId, playing, detailedStars]);
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => {
      if (preference?.matches) setPlaying(false);
    };
    preference?.addEventListener?.("change", change);
    return () => preference?.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    const node = surface.current;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta =
        e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 600 : 1);
      setView((v) => ({
        ...v,
        zoom: boundedZoom(
          v.zoom * Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.0013),
        ),
      }));
    };
    node?.addEventListener("wheel", wheel, { passive: false });
    return () => node?.removeEventListener("wheel", wheel);
  }, []);

  const viewWidth = Math.max(1, (720 * surfaceSize.width) / surfaceSize.height);
  const project = (position: NetworkPoet["position"]) => {
    const point = projectPoint(position, view.yaw, view.pitch, view.zoom, viewWidth);
    return { ...point, x: point.x + view.panX, y: point.y + view.panY };
  };
  const points = poets.map((p) => ({
    ...p,
    projected: project(p.position),
  }));
  const byId = new Map(points.map((p) => [p.id, p]));
  const selectedRelation = relations.find((r) => r.id === selectedRelationId);
  const activeRelations = relations.filter((r) =>
    selectedRelation
      ? r.id === selectedRelation.id
      : r.source === selectedPoetId || r.target === selectedPoetId,
  );
  const connected = new Set(
    activeRelations.flatMap((r) => [r.source, r.target]),
  );
  const activeRelationIds = new Set(activeRelations.map((r) => r.id));
  const networkRelations = [...relations].sort(
    (a, b) =>
      Number(activeRelationIds.has(a.id)) - Number(activeRelationIds.has(b.id)),
  );
  const zoom = (factor: number) =>
    setView((v) => ({ ...v, zoom: boundedZoom(v.zoom * factor) }));
  const labels = layoutPoetLabels(
    points.map((point) => ({
      id: point.id,
      name: point.name,
      point: point.projected,
    })),
    viewWidth,
    surfaceSize.height,
    selectedPoetId,
  );
  const orbitGuides = [
    { radius: 250, start: -2.65, end: -0.1 },
    { radius: 340, start: -0.75, end: 1.9 },
    { radius: 425, start: 1.15, end: 3.85 },
  ].map(({ radius, start, end }, index) => ({
    index,
    path: Array.from({ length: 49 }, (_, step) => {
      const angle = start + (end - start) * step / 48;
      const point = project({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.74,
        z: Math.sin(angle * 2) * 38,
      });
      return `${step ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(" "),
  }));
  return (
    <div className="pn-chart-wrap">
      <div
        ref={surface}
        className={`pn-chart${dragging ? " is-dragging" : ""}${fallback ? " is-fallback" : ""}${showAllRelations ? " is-all-relations" : " is-focused-relations"}`}
        role="region"
        aria-label="诗人三维关系星云图"
        aria-describedby={`${prefix}-instructions`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "+",
              "=",
              "-",
              "Home",
            ].includes(e.key)
          )
            e.preventDefault();
          if (e.key === "Home") setView(initialView);
          else if (e.key === "+" || e.key === "=") zoom(1.12);
          else if (e.key === "-") zoom(1 / 1.12);
          else if (e.key.startsWith("Arrow"))
            setView((v) => ({
              ...v,
              yaw:
                v.yaw +
                (e.key === "ArrowRight"
                  ? 0.12
                  : e.key === "ArrowLeft"
                    ? -0.12
                    : 0),
              pitch: Math.max(
                -0.8,
                Math.min(
                  0.8,
                  v.pitch +
                    (e.key === "ArrowDown"
                      ? 0.1
                      : e.key === "ArrowUp"
                        ? -0.1
                        : 0),
                ),
              ),
            }));
        }}
        onPointerDown={(e) => {
          if ((e.button !== 0 && e.button !== 1) || gesture.current) return;
          if (e.button === 1) e.preventDefault();
          suppressClickUntil.current = 0;
          gesture.current = {
            x: e.clientX,
            y: e.clientY,
            id: e.pointerId,
            moved: false,
            mode: e.button === 1 || e.pointerType === "touch" ? "pan" : "rotate",
          };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          const dx = e.clientX - g.x,
            dy = e.clientY - g.y;
          if (!g.moved && Math.hypot(dx, dy) < 5) return;
          if (!g.moved) surface.current?.setPointerCapture?.(e.pointerId);
          g.moved = true;
          suppressClickUntil.current = Infinity;
          setDragging(true);
          setView((v) => g.mode === "rotate"
            ? {
                ...v,
                yaw: v.yaw + dx * 0.004,
                pitch: Math.max(-0.8, Math.min(0.8, v.pitch + dy * 0.003)),
              }
            : {
                ...v,
                panX: Math.max(-viewWidth / 2, Math.min(viewWidth / 2, v.panX + dx * 720 / surfaceSize.height)),
                panY: Math.max(-350, Math.min(350, v.panY + dy * 720 / surfaceSize.height)),
              });
          g.x = e.clientX;
          g.y = e.clientY;
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          suppressClickUntil.current = g.moved
            ? performance.now() + 200
            : 0;
          if (surface.current?.hasPointerCapture?.(e.pointerId))
            surface.current.releasePointerCapture(e.pointerId);
          gesture.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          suppressClickUntil.current = 0;
          setDragging(false);
        }}
        onPointerLeave={() => {
          if (gesture.current && !gesture.current.moved) gesture.current = null;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
          setDragging(false);
        }}
        onClickCapture={(e) => {
          if (performance.now() < suppressClickUntil.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClickUntil.current = 0;
          }
        }}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
      >
        <div className="pn-webgl" ref={canvasHost} />
        <div className="pn-chart-caption">
          <span>以诗为舟，群星相逢</span>
          <button
            type="button"
            className="pn-relation-visibility"
            aria-label={showAllRelations ? "收起全部关系线" : "显示全部关系线"}
            aria-pressed={showAllRelations}
            onClick={() => setShowAllRelations((value) => !value)}
          >
            {showAllRelations ? "收起全图连线" : `展开全图连线 · ${relations.length}`}
          </button>
        </div>
        <svg
          className="pn-nebula"
          viewBox={`0 0 ${viewWidth} 720`}
          aria-label="可旋转的诗人关系图"
        >
          <defs>
            <radialGradient id={`${prefix}-glow`}>
              <stop stopColor="currentColor" stopOpacity=".6" />
              <stop offset=".18" stopColor="currentColor" stopOpacity=".24" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          {fallback && (
            <g className="pn-fallback-stars" aria-hidden="true">
              {Array.from({ length: 260 }, (_, i) => {
                const p = project(
                  {
                    x: Math.sin(i * 127.1) * 660,
                    y: Math.cos(i * 311.7) * 470,
                    z: Math.sin(i * 43.3) * 360,
                  },
                );
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i % 13 === 0 ? 1.6 : 0.6}
                    opacity={0.25 + (i % 5) * 0.15}
                  />
                );
              })}
            </g>
          )}
          <g className="pn-orbit-guides" aria-hidden="true">
            {orbitGuides.map(({ index, path }) => <path key={index} d={path} />)}
          </g>
          <g className="pn-links">
            {networkRelations.map((r) => {
              const from = byId.get(r.source),
                to = byId.get(r.target);
              if (!from || !to) return null;
              const a = from.projected,
                b = to.projected;
              const path = `M${a.x},${a.y} Q${(a.x + b.x) * 0.38 + viewWidth * 0.12},${(a.y + b.y) * 0.38 + 355 * 0.24} ${b.x},${b.y}`;
              return (
                <g
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看${from.name}与${to.name}的关系`}
                  aria-pressed={selectedRelationId === r.id}
                  className={`pn-link ${activeRelationIds.has(r.id) ? "is-active" : "is-context"}`}
                  style={
                    {
                      "--link-color": relationColor(r.label),
                      "--link-depth-opacity": Math.max(
                        0.25,
                        Math.min(0.64, 0.48 - (a.depth + b.depth) / 2200),
                      ),
                    } as CSSProperties
                  }
                  onClick={() => onSelectRelation(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectRelation(r.id);
                    }
                  }}
                >
                  <title>{`${from.name}与${to.name} · ${r.label}\n${r.reviewStatus === "approved" ? "已核实" : "待核实线索"}\n${r.evidence}\n来源：${r.sourceLabel}`}</title>
                  <path className="pn-link-hit" d={path} />
                  <path
                    className="pn-link-line"
                    d={path}
                    strokeDasharray={
                      r.reviewStatus === "approved" ? undefined : "3 6"
                    }
                  />
                  <g
                    className="pn-link-label"
                    transform={`translate(${(a.x + b.x) / 2 + 6},${(a.y + b.y) / 2 - 12})`}
                  >
                    <rect x="-27" y="-12" width="54" height="22" rx="2" />
                    <text textAnchor="middle" y="4">
                      {r.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
          <g className="pn-nodes">
            {points
              .sort((a, b) => b.projected.depth - a.projected.depth)
              .map((p) => {
                const active = p.id === selectedPoetId && !selectedRelationId;
                const x = p.projected.x,
                  y = p.projected.y,
                  label = labels.get(p.id)!;
                return (
                  <g
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`查看诗人${p.name}`}
                    aria-pressed={active}
                    className={`pn-node${active ? " is-active" : ""}${connected.has(p.id) ? " is-related" : ""}${detailedStars && !fallback && isExperimentalPoet(p.name) ? " is-detailed" : ""}`}
                    style={{
                      color: p.star.color,
                      "--pn-depth-opacity": Math.max(0.56, Math.min(1, 0.82 - p.projected.depth / 1000)),
                    } as CSSProperties}
                    onClick={() => onSelectPoet(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPoet(p.id);
                      }
                    }}
                  >
                    <title>
                      {p.name} · {p.star.type} · {p.star.style}
                    </title>
                    {active && playing && (
                      <circle
                        className="pn-selection-wash"
                        cx={x}
                        cy={y}
                        r="44"
                        fill={`url(#${prefix}-glow)`}
                      />
                    )}
                    <circle
                      className="pn-node-halo"
                      cx={x}
                      cy={y}
                      r={(active ? 39 : 24) * p.star.size}
                      fill={`url(#${prefix}-glow)`}
                    />
                    {p.star.form === "binary" && (
                      <circle
                        className="pn-point-core"
                        cx={x + 10}
                        cy={y - 7}
                        r="1.8"
                        fill="currentColor"
                      />
                    )}
                    {(p.star.form === "flare" || p.star.form === "giant") && (
                      <path
                        className="pn-star-rays"
                        d={`M${x - 15},${y}h30 M${x},${y - 15}v30`}
                      />
                    )}
                    <circle
                      className="pn-point-core"
                      cx={x}
                      cy={y}
                      r={active ? 3.3 : 2}
                      fill="#f4f8ff"
                    />
                    <circle className="pn-node-hit" cx={x} cy={y} r="22" />
                    <text
                      className={`pn-node-name pn-node-name--${label.tier}`}
                      x={label.x}
                      y={label.y}
                      style={{ fontSize: label.fontSize }}
                    >
                      {p.name}
                    </text>
                  </g>
                );
              })}
          </g>
        </svg>
        <div className="pn-chart-legend">
          <span>
            <i />
            赠诗 <i />
            交游 <i />
            文学关联
          </span>
          <span>虚线 · 待核线索</span>
        </div>
      </div>
      <div className="pn-controls">
        <p id={`${prefix}-instructions`}>
          左键拖拽旋转 · 中键平移 · 滚轮缩放<span>方向键旋转，＋ / − 缩放</span>
        </p>
        <details className="pn-performance" aria-label="星空运行状态">
          <summary>运行信息</summary>
          {fallback ? "静态星图" : `${metrics.particles.toLocaleString()} 粒子`}
          <span>
            {fallback
              ? "兼容模式"
              : !playing
                ? "动态已暂停"
                : metrics.fps
                  ? `${metrics.fps} FPS`
                  : "WebGL"}
          </span>
        </details>
        <div>
          <button
            className="pn-motion"
            type="button"
            aria-label={playing ? "暂停星空动态" : "播放星空动态"}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? "暂停动态" : "播放动态"}
          </button>
          <button
            type="button"
            aria-label="缩小星云图"
            disabled={view.zoom <= 0.65}
            onClick={() => zoom(1 / 1.15)}
          >
            −
          </button>
          <output aria-label="图谱缩放比例">
            {Math.round(view.zoom * 100)}%
          </output>
          <button
            type="button"
            aria-label="放大星云图"
            disabled={view.zoom >= 1.65}
            onClick={() => zoom(1.15)}
          >
            ＋
          </button>
          <button
            type="button"
            className="pn-reset"
            onClick={() => setView(initialView)}
          >
            重置视角
          </button>
        </div>
      </div>
    </div>
  );
}
