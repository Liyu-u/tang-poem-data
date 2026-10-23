import { useMemo, useRef, useState } from "react";
import type { Dataset, Period } from "../../types/domain";
import { buildPoetNetwork } from "./poetNetwork";
import { PoetNebula } from "./PoetNebula";
import { StarStudy } from "./StarStudy";
import { experimentNames, isExperimentalPoet } from "./experimentCatalog";
import "./poet-jianghu.css";

type Props = { dataset: Dataset; onOpenPoem: (id: string) => void };

export function PoetJianghu({ dataset, onOpenPoem }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const { poets, relations } = useMemo(
    () => buildPoetNetwork(dataset),
    [dataset],
  );
  const [selection, setSelection] = useState<{
    type: "poet" | "relation";
    id: string;
  }>({
    type: "poet",
    id: poets.find((p) => p.name === "李白")?.id ?? poets[0]?.id ?? "",
  });
  const [query, setQuery] = useState("");
  const [epoch, setEpoch] = useState<Period | "全部">("全部");
  const [relationType, setRelationType] = useState("全部关系");
  const [detailedStars, setDetailedStars] = useState(true);
  const [studyOpen, setStudyOpen] = useState(false);
  const visiblePoets = useMemo(
    () => poets.filter((p) => epoch === "全部" || p.period === epoch),
    [poets, epoch],
  );
  const visibleIds = new Set(visiblePoets.map((p) => p.id));
  const visibleRelations = relations.filter(
    (r) =>
      visibleIds.has(r.source) &&
      visibleIds.has(r.target) &&
      (relationType === "全部关系" || r.label === relationType),
  );
  const poet = poets.find((p) => p.id === selection.id) ?? poets[0];
  const relation =
    selection.type === "relation"
      ? relations.find((r) => r.id === selection.id)
      : undefined;
  const from = poets.find((p) => p.id === relation?.source);
  const to = poets.find((p) => p.id === relation?.target);
  const links = poet
    ? relations.filter((r) => r.source === poet.id || r.target === poet.id)
    : [];
  const works = dataset.poems
    .filter((p) =>
      relation ? relation.poemIds.includes(p.id) : p.poetId === poet?.id,
    )
    .slice(0, 5);
  const matches = query.trim()
    ? poets.filter((p) => p.name.includes(query.trim()))
    : [];
  const selectPoet = (id: string) => {
    setSelection({ type: "poet", id });
    setQuery("");
    const target = poets.find((p) => p.id === id);
    if (epoch !== "全部" && target?.period !== epoch) setEpoch("全部");
  };
  const selectEpoch = (next: Period | "全部") => {
    setEpoch(next);
    setSelection({
      type: "poet",
      id: poets.find((p) => next === "全部" || p.period === next)?.id ?? "",
    });
  };
  const selectRelation = (id: string) => {
    setEpoch("全部");
    setRelationType("全部关系");
    setSelection({ type: "relation", id });
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("浏览器未能进入全屏，可继续在当前视图观星。");
    }
  };

  return (
    <div className="poet-jianghu" ref={root}>
      <header className="pn-intro">
        <div className="pn-title">
          <p className="pn-kicker">绢本星图</p>
          <h2 id="poets-title" aria-label="诗人星河">
            诗人星河
          </h2>
          <p>循着一束星光，遇见一位诗人。</p>
        </div>
        <p className="pn-intro-verse">海内存知己，天涯若比邻。</p>
        {document.fullscreenEnabled && (
          <button type="button" className="pn-fullscreen" onClick={fullscreen}>
            全屏 / 退出
          </button>
        )}
        <div className="pn-search">
          <label htmlFor="pn-poet-search">循名访友</label>
          <div>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10" cy="10" r="6" />
              <path d="m15 15 5 5" />
            </svg>
            <input
              id="pn-poet-search"
              type="search"
              aria-label="查找诗人"
              placeholder="输入诗人姓名"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query.trim() && (
            <div className="pn-search-results">
              {matches.length ? (
                matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPoet(p.id)}
                  >
                    {p.name}
                    <span>{p.period}</span>
                  </button>
                ))
              ) : (
                <p role="status">未找到这位诗人，请换个名字试试。</p>
              )}
            </div>
          )}
        </div>
      </header>
      {poets.length > 0 ? (
        <>
          <div className="pn-filters">
            <div role="group" aria-label="按时代筛选">
              {(["全部", "初唐", "盛唐", "中唐", "晚唐"] as const).map(
                (period) => (
                  <button
                    type="button"
                    key={period}
                    aria-label={
                      period === "全部" ? "查看全部时代" : `只看${period}`
                    }
                    aria-pressed={epoch === period}
                    onClick={() => selectEpoch(period)}
                  >
                    {period}
                  </button>
                ),
              )}
            </div>
            <details className="pn-relation-tools">
              <summary>
                关系筛选{relationType !== "全部关系" && ` · ${relationType}`}
              </summary>
              <div role="group" aria-label="按关系类型筛选">
                {["全部关系", ...new Set(relations.map((r) => r.label))].map(
                  (type) => (
                    <button
                      type="button"
                      key={type}
                      aria-pressed={relationType === type}
                      onClick={() => {
                        setRelationType(type);
                        if (selection.type === "relation")
                          setSelection({
                            type: "poet",
                            id: relation?.source ?? poets[0].id,
                          });
                      }}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
            </details>
            <span className="pn-sample-count">
              {visiblePoets.length} / {poets.length} 位诗人
            </span>
          </div>
          <details className="pn-observation-tools">
            <summary>星体观测工具</summary>
            <div className="pn-experiment">
              <div role="group" aria-label="星体观察">
                {experimentNames
                  .filter((name) => poets.some((p) => p.name === name))
                  .map((name) => {
                    const target = poets.find((p) => p.name === name)!;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-label={`观察${name}`}
                        aria-pressed={
                          selection.type === "poet" && poet?.id === target.id
                        }
                        onClick={() => selectPoet(target.id)}
                      >
                        {name}
                      </button>
                    );
                  })}
              </div>
              <div
                className="pn-render-switch"
                role="group"
                aria-label="星体显示"
              >
                <button
                  type="button"
                  aria-pressed={!detailedStars}
                  onClick={() => setDetailedStars(false)}
                >
                  光点
                </button>
                <button
                  type="button"
                  aria-pressed={detailedStars}
                  onClick={() => setDetailedStars(true)}
                >
                  精细星体
                </button>
              </div>
            </div>
          </details>
          {fullscreenError && (
            <p className="pn-fullscreen-error" role="status">
              {fullscreenError}
            </p>
          )}
          <div className="pn-explore">
            <PoetNebula
              poets={visiblePoets}
              relations={visibleRelations}
              selectedPoetId={relation ? undefined : poet?.id}
              selectedRelationId={relation?.id}
              onSelectPoet={selectPoet}
              onSelectRelation={(id) => setSelection({ type: "relation", id })}
              detailedStars={detailedStars}
            />
          </div>
          <aside className="pn-detail" aria-label="诗人江湖详情">
            {relation && from && to ? (
              <>
                <div className="pn-detail-topline">
                  <span>诗间往来</span>
                </div>
                <div className="pn-relation-heading">
                  <button type="button" onClick={() => selectPoet(from.id)}>
                    {from.name}
                  </button>
                  <span aria-hidden="true">
                    {relation.directed ? "→" : "—"}
                  </span>
                  <button type="button" onClick={() => selectPoet(to.id)}>
                    {to.name}
                  </button>
                </div>
                <h3 className="pn-sr-only">
                  {from.name}与{to.name}
                </h3>
                <p className="pn-relation-type">
                  {relation.label}
                  {relation.directed && <span>作者 → 诗中对象</span>}
                </p>
                <p className="pn-biography">{relation.explanation}</p>
                <h4>关系依据</h4>
                <p className="pn-evidence">{relation.evidence}</p>
                <h4>相关诗作</h4>
                {works.length === 0 && (
                  <p className="pn-empty-works">
                    本地尚未收录对应诗作，文献线索见下方。
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="pn-detail-topline">
                  <span>人物小传</span>
                </div>
                <div className="pn-person-heading">
                  <div>
                    <p className="pn-style">
                      {poet.period} / {poet.star.style}
                    </p>
                    <h3>{poet.name}</h3>
                    <p className="pn-star-type">{poet.star.type}</p>
                    {poet.courtesyName && (
                      <p>
                        字{poet.courtesyName}
                        {poet.artName && ` · 号${poet.artName}`}
                      </p>
                    )}
                    <span className="pn-dates">
                      {poet.dateLabel ??
                        `${poet.birthYear ?? "生年待考"} — ${poet.deathYear ?? "卒年待考"}`}
                    </span>
                  </div>
                </div>
                {isExperimentalPoet(poet.name) && (
                  <div className="pn-study-disclosure">
                    <button
                      type="button"
                      aria-expanded={studyOpen}
                      onClick={() => setStudyOpen((open) => !open)}
                    >
                      {studyOpen ? "收起星体近景" : "展开星体近景"}
                      <span aria-hidden="true">{studyOpen ? "−" : "+"}</span>
                    </button>
                    {studyOpen && (
                      <StarStudy name={poet.name} detailed={detailedStars} />
                    )}
                  </div>
                )}
                <h4>星体意象</h4>
                <p className="pn-star-reason">{poet.star.reason}</p>
                <details className="pn-bio-details">
                  <summary>人物小传</summary>
                  <p className="pn-biography">
                    {poet.biography || "人物生平资料正在整理。"}
                  </p>
                  {poet.biographyUrl && <a href={poet.biographyUrl} target="_blank" rel="noreferrer">文献原文</a>}
                </details>
                <div className="pn-person-meta">
                  <span>{poet.period}</span>
                  <span>
                    收录{" "}
                    {dataset.poems.filter((p) => p.poetId === poet.id).length}{" "}
                    首
                  </span>
                  <span>{links.length} 条关系线索</span>
                </div>
                <h4>代表诗作</h4>
                {works.length === 0 && (
                  <p className="pn-empty-works">本地暂未收录该诗人的作品。</p>
                )}
              </>
            )}
            <div className="pn-works">
              {works.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  aria-label={`阅读《${work.title}》`}
                  onClick={() => onOpenPoem(work.id)}
                >
                  <span>《{work.title}》</span>
                  <small>{work.lineTexts[0]}</small>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </button>
              ))}
            </div>
            {relation ? (
              <div className="pn-source">
                <h4>资料出处</h4>
                <p>{relation.sourceLabel}</p>
                <button
                  type="button"
                  onClick={() => selectPoet(relation.source)}
                >
                  返回{from?.name}小传
                </button>
              </div>
            ) : (
              <>
                <h4>诗间关联</h4>
                <div className="pn-related">
                  {links.length ? (
                    links.map((link) => {
                      const other = poets.find(
                        (p) =>
                          p.id ===
                          (link.source === poet.id ? link.target : link.source),
                      );
                      return (
                        <button
                          key={link.id}
                          type="button"
                          onClick={() => selectRelation(link.id)}
                        >
                          <span>{other?.name}</span>
                          <small>{link.label}</small>
                        </button>
                      );
                    })
                  ) : (
                    <p>暂未收录有据可循的关系线索。</p>
                  )}
                </div>
                {works[0] && (
                  <blockquote className="pn-person-quote">
                    {works[0].lineTexts.slice(0, 2).join("")}
                    <cite>
                      —— {poet.name}《{works[0].title}》
                    </cite>
                  </blockquote>
                )}
              </>
            )}
          </aside>
        </>
      ) : (
        <p className="pn-empty">诗人资料整理中</p>
      )}
    </div>
  );
}

