import { useState } from 'react';
import journalCalligraphy from '../../assets/chapter-titles/journal-calligraphy.png';
import { journalPoets, journalRankingSource } from './journalData';
import { ThemeChart } from './ThemeChart';
import { PeriodTrend } from './PeriodTrend';
import { PoetProfile } from './PoetProfile';
import { Portrait } from './Portrait';
import './poetry-journal.css';

export function PoetryJournal() {
  const [selectedId, setSelectedId] = useState('li-bai');
  const [trendPoetId, setTrendPoetId] = useState('');
  const [mode, setMode] = useState<'count' | 'share'>('count');
  const ranking = [...journalPoets].sort((a, b) => b.count - a.count).slice(0, 5);
  const selectedPoet = journalPoets.find(poet => poet.id === selectedId) ?? journalPoets[0];
  const total = ranking.reduce((sum, poet) => sum + poet.count, 0);
  const max = Math.max(...ranking.map(poet => poet.count), 1);
  return <div className="poetry-journal">
    <div className="pj-paper-grain" aria-hidden="true" />
    <div className="pj-landscape" aria-hidden="true" />
    <header className="pj-title"><h2 id="craft-title"><img className="pj-title-calligraphy" src={journalCalligraphy} alt="诗词日志" width={1024} height={1536} /></h2><span className="pj-title-seal" aria-hidden="true">诗境</span><p>以诗观世 · 以词会友</p></header>
    <div className="pj-layout"><ThemeChart /><div className="pj-right">
      <PeriodTrend selectedId={trendPoetId} onSelect={setTrendPoetId} />
      <div className="pj-bottom">
        <article className="pj-panel pj-ranking" aria-labelledby="pj-ranking-title"><header className="pj-panel-heading"><h3 id="pj-ranking-title">诗歌收录数量 TOP 5</h3><p>来源：<a href={journalRankingSource.url} target="_blank" rel="noreferrer">汉语典</a> · 按该数据库收录口径统计</p></header>
          <div className="pj-toggle" aria-label="排行统计方式"><button type="button" aria-pressed={mode === 'count'} onClick={() => setMode('count')}>数量</button><button type="button" aria-pressed={mode === 'share'} onClick={() => setMode('share')}>占比</button></div>
          <div className="pj-ranking-list">{ranking.map(poet => <button key={poet.id} type="button" className="pj-rank" aria-label={'查看' + poet.name + '，' + (mode === 'count' ? poet.count + '首' : (total ? (poet.count / total * 100).toFixed(1) : '0.0') + '%')} aria-pressed={selectedId === poet.id} onClick={() => setSelectedId(poet.id)}><Portrait poet={poet} /><span className="pj-rank-name">{poet.name}</span><span className="pj-bar-track"><span className="pj-bar" style={{ width: poet.count / max * 100 + '%' }} /></span><span className="pj-rank-value">{mode === 'count' ? poet.count.toLocaleString('en-US') : (total ? (poet.count / total * 100).toFixed(1) : '0.0') + '%'}</span></button>)}</div>
          <p className="pj-ranking-footer">{mode === 'share' ? '占比以榜单五位诗人作品总量为分母' : '点击诗人，查看右侧人物档案'}</p>
        </article>
        <PoetProfile key={selectedPoet.id} poet={selectedPoet} />
      </div>
    </div></div>
    <footer className="pj-chapter-footer"><span>题材：所提供统计表 · 排行：汉语典 · 分期统计：林庚（1958）</span><span>五人年谱据搜韵系年 · 人物资料附出处 · 画像为艺术示意</span></footer>
  </div>;
}


