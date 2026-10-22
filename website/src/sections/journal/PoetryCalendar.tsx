import { useRef, useState } from 'react';
import type { JournalPoet } from './journalData';
import { chronologyLevel, getPoetryChronology, type ChronologyWork } from './journalChronology';

function WorkSources({ works }: { works: ChronologyWork[] }) {
  return <ul className="pj-source-works">{works.map(work => <li key={work.id}><a href={work.sourceUrl} target="_blank" rel="noreferrer">{work.title}</a><span>{work.date || '来源未标年'}</span>{work.datingSourceUrl && <a href={work.datingSourceUrl} target="_blank" rel="noreferrer">系年异说依据</a>}</li>)}</ul>;
}

export function PoetryCalendar({ poet }: { poet: JournalPoet }) {
  const data = getPoetryChronology(poet);
  const initialYear = data ? [...data.annualWorks].sort((a, b) => b.year - a.year)[0]?.year ?? data.birthYear : 0;
  const [selected, setSelected] = useState(initialYear);
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [showSources, setShowSources] = useState(false);
  if (!data) return <section className="pj-chronology" aria-label={poet.name + '创作年谱'}><header className="pj-chronology-heading"><h4>创作年谱</h4></header><p className="pj-chronology-empty">系年资料待补充</p><p className="pj-chronology-note">缺失资料保持未知，不按零创作处理。</p></section>;
  const { birthYear, endYear, years, annualWorks, uncertainWorks, undatedWorks } = data;
  const firstDecade = Math.floor(birthYear / 10) * 10;
  const decades = Array.from({ length: Math.floor(endYear / 10) - Math.floor(birthYear / 10) + 1 }, (_, i) => firstDecade + i * 10);
  const selectedWorks = annualWorks.filter(work => work.year === selected);
  const countLabel = (year: number) => years[year] === undefined ? '未见系年记录' : `收录可系年诗作${years[year]}首`;
  const selectYear = (year: number) => { setSelected(year); setShowSources(false); };
  return <section className="pj-chronology" aria-label={poet.name + '创作年谱'}>
    <header className="pj-chronology-heading"><h4>创作年谱</h4><a className="pj-chronology-source" href={data.sourceUrl} target="_blank" rel="noreferrer">搜韵系年</a></header>
    <p className="pj-chronology-summary">每格一年 · 已标年 {annualWorks.length} 首 · 未标年 {undatedWorks.length} 首{uncertainWorks.length > 0 && ` · 约年等 ${uncertainWorks.length} 首`}</p>
    <div className="pj-annual-grid" role="group" aria-label={poet.name + '年度创作热力图'}><span />{Array.from({ length: 10 }, (_, i) => <span className="pj-year-digit" key={i}>{i}</span>)}{decades.map(decade => <div className="pj-decade-row" key={decade}><span className="pj-decade-label">{decade}—{decade + 9}</span>{Array.from({ length: 10 }, (_, i) => {
      const year = decade + i;
      if (year < birthYear || year > endYear) return <span className="pj-year-outside" key={year} />;
      return <button key={year} type="button" className="pj-year-cell" ref={node => { refs.current[year] = node; }} tabIndex={selected === year ? 0 : -1} data-level={chronologyLevel(years[year])} aria-label={`${year}年：${countLabel(year)}`} title={`${year}年 · ${countLabel(year)}`} aria-pressed={selected === year} onClick={() => selectYear(year)} onFocus={() => selectYear(year)} onKeyDown={event => {
        const moves: Record<string, number> = { ArrowLeft: year - 1, ArrowRight: year + 1, ArrowUp: year - 10, ArrowDown: year + 10, Home: birthYear, End: endYear };
        if (!(event.key in moves)) return;
        event.preventDefault();
        refs.current[Math.max(birthYear, Math.min(endYear, moves[event.key]))]?.focus();
      }} />;
    })}</div>)}</div>
    <div className="pj-annual-legend" aria-label="年度作品数量图例">{[['unknown', '未见记录'], ['1', '1—10'], ['2', '11—30'], ['3', '31—60'], ['4', '61+ 首']].map(([level, text]) => <span key={level}><i data-level={level} />{text}</span>)}</div>
    <div className="pj-selected-year" data-testid="chronology-year-records">
      <button type="button" aria-expanded={showSources} aria-controls={`pj-year-sources-${poet.id}`} onClick={() => setShowSources(!showSources)}><strong>{selected} 年</strong><span>{selectedWorks.length ? `${selectedWorks.length} 首 · ${showSources ? '收起' : '查看'}目录` : '未见系年记录'}</span></button>
      <div id={`pj-year-sources-${poet.id}`} hidden={!showSources}>{showSources && (selectedWorks.length ? <WorkSources works={selectedWorks} /> : <p className="pj-chronology-note">该来源未收录此年的明确系年记录。</p>)}</div>
    </div>
  </section>;
}
