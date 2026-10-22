import { useId, useRef, useState } from 'react';
import type { JournalPoet } from './journalData';
import { PoetryCalendar } from './PoetryCalendar';
import { Portrait } from './Portrait';

const tabs = [{ id: 'overview', name: '概览' }, { id: 'biography', name: '生平资料' }, { id: 'works', name: '代表作品' }] as const;
type ProfileTab = (typeof tabs)[number]['id'];

function Works({ poet, initialTitle = null }: { poet: JournalPoet; initialTitle?: string | null }) {
  return <section className="pj-work-section" aria-label="诗人代表作品">
    {poet.works.length ? poet.works.map(work => <details key={work.title} open={initialTitle === work.title || undefined}>
      <summary>{work.title}<span>{work.tag}</span></summary>
      <p className="pj-work-text">{work.text || work.excerpt}</p>
      {work.sourceUrl && <p className="pj-work-meta">来源标年：{work.date || '未注明'} · <a href={work.sourceUrl} target="_blank" rel="noreferrer">查看原文与校注</a></p>}
    </details>) : <p className="pj-empty">尚未收录代表作品</p>}
  </section>;
}

function ProfileSources({ poet }: { poet: JournalPoet }) {
  return poet.sources?.length ? <div className="pj-profile-sources" aria-label="人物资料出处">{poet.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div> : null;
}

export function PoetProfile({ poet }: { poet: JournalPoet }) {
  const uid = useId();
  const [view, setView] = useState<ProfileTab>('overview');
  const [workTitle, setWorkTitle] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  return <article className="pj-panel pj-profile" data-view={view} aria-label={`${poet.name}诗人介绍`}>
    <div className="pj-profile-tabs" role="tablist" aria-label="诗人档案">{tabs.map((tab, index) => <button key={tab.id} ref={node => { tabRefs.current[index] = node; }} type="button" role="tab" id={`${uid}-${tab.id}-tab`} aria-controls={`${uid}-${tab.id}-panel`} aria-selected={view === tab.id} tabIndex={view === tab.id ? 0 : -1} onClick={() => setView(tab.id)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setView(tabs[next].id);
      tabRefs.current[next]?.focus();
    }}>{tab.name}</button>)}</div>
    {tabs.map(tab => <div key={tab.id} className="pj-profile-content" role="tabpanel" tabIndex={0} id={`${uid}-${tab.id}-panel`} aria-labelledby={`${uid}-${tab.id}-tab`} hidden={view !== tab.id}>
      {view === tab.id && <>
          <header className="pj-profile-summary"><Portrait poet={poet} /><div className="pj-summary-identity"><h3>{poet.name}</h3><span>{poet.school}</span><span className="pj-summary-dates">{poet.dates}</span></div><p title={poet.alias}>{poet.alias}</p></header>
        {view === 'overview' && <>
          
          <nav className="pj-work-links" aria-label="诗人代表作品"><span>代表作</span>{poet.works.length ? poet.works.slice(0, 3).map(work => <button key={work.title} type="button" onClick={() => { setWorkTitle(work.title); setView('works'); tabRefs.current[2]?.focus(); }}>{work.title}</button>) : <span className="pj-work-links-empty">尚未收录</span>}</nav>
          <PoetryCalendar poet={poet} />
        </>}
        {view === 'biography' && <><div className="pj-biography"><dl><div><dt>字号</dt><dd>{poet.alias}</dd></div><div><dt>生卒年</dt><dd>{poet.dates}</dd></div><div><dt>籍贯</dt><dd>{poet.profile?.hometown || '资料待核实'}</dd></div></dl><section><h4>人物简介</h4><p>{poet.profile?.biography || '尚未接入可核实的人物传记。'}</p></section><section><h4>创作风格与评价</h4><p>{poet.description}</p><blockquote>{poet.quote}<cite>— {poet.name}</cite></blockquote><dl><div><dt>主要成就</dt><dd>{poet.profile?.achievements || '资料待核实'}</dd></div><div><dt>历史地位</dt><dd>{poet.profile?.status || '资料待核实'}</dd></div></dl></section><section><h4>主要经历</h4>{poet.profile?.milestones?.length ? <ol>{poet.profile.milestones.map((item, index) => <li key={index}>{item}</li>)}</ol> : <p>尚未收录有据可查的经历。</p>}</section><section><h4>交游关系</h4>{poet.profile?.connections?.length ? <ul>{poet.profile.connections.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>尚未收录有据可查的交游记录。</p>}</section></div><ProfileSources poet={poet} /></>}
        {view === 'works' && <><Works key={workTitle ?? poet.id} poet={poet} initialTitle={workTitle} /><p className="pj-footnote">原文采用链接所示版本；创作年份为来源系年，未标年不作推定。</p></>}
      </>}
    </div>)}
  </article>;
}
