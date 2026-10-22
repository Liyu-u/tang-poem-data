import { describe, expect, it } from 'vitest';
import { buildChronology, getPoetryChronology, type ChronologyWork } from './journalChronology';
import { journalPoets } from './journalData';

const work = (id: string, date: string): ChronologyWork => ({ id, title: id, date, form: 'QiJue', genre: '绝句', sourceUrl: `https://www.sou-yun.cn/Query.aspx?type=poem1&id=${id}` });

describe('从逐首来源汇总系年，不推测缺失值', () => {
  it('仅单年记录进入热力图；区间、约年、未注明及生卒年外日期不混入', () => {
    const result = buildChronology({ birthYear: 701, endYear: 762, works: [
      work('1', '759年'), work('2', '759年秋'), work('3', '744-745年'),
      work('4', '约752年'), work('5', ''), work('6', '800年'), work('7', '742年或744年'),
    ] });
    expect(result.years).toEqual({ 759: 2 });
    expect(result.years[701]).toBeUndefined();
    expect(result.annualWorks.map(item => item.id)).toEqual(['1', '2']);
    expect(result.uncertainWorks.map(item => item.id)).toEqual(['3', '4', '6', '7']);
    expect(result.undatedWorks.map(item => item.id)).toEqual(['5']);
    expect(result.annualWorks.length + result.uncertainWorks.length + result.undatedWorks.length).toBe(7);
  });

  it('按来源编号去重，不把组诗不同篇目合成一首', () => {
    const result = buildChronology({ birthYear: 701, endYear: 762, works: [work('1', '744年'), work('1', '744年'), { ...work('2', '744年'), title: '1' }] });
    expect(result.years[744]).toBe(2);
    expect(result.works).toHaveLength(2);
  });

  it('发布数据保留十以上组诗序号，并将交叉核查发现的异说单列', () => {
    const li = getPoetryChronology({ id: 'li-bai' })!;
    expect(li.works.find(work => work.title === '古风·其十')).toBeDefined();
    expect(li.works.some(work => /其一零|其一一|其二零/.test(work.title))).toBe(false);
    expect(li.uncertainWorks.map(work => work.id)).toEqual(expect.arrayContaining(['26453', '26460']));
    expect(li.annualWorks.some(work => work.id === '26453' || work.id === '26460')).toBe(false);
    expect(li.uncertainWorks.find(work => work.id === '26453')).toMatchObject({ sourceDate: '736年', datingSourceUrl: expect.stringMatching(/^https:/) });
  });

  it.each(journalPoets)('$name的发布记录可对账，代表作与人物资料均附来源', poet => {
    const data = getPoetryChronology(poet)!;
    expect(data.works.length + data.excludedTotal).toBe(data.indexedTotal);
    expect(data.annualWorks.length + data.uncertainWorks.length + data.undatedWorks.length).toBe(data.works.length);
    expect(Object.values(data.years).reduce((sum, count) => sum + count, 0)).toBe(data.annualWorks.length);
    expect(data.works.every(work => work.sourceUrl.endsWith(`id=${work.id}`))).toBe(true);
    expect(poet.works).toHaveLength(3);
    expect(poet.works.every(work => work.text && work.sourceUrl)).toBe(true);
    expect(poet.profile?.biography).not.toMatch(/待补充|待上传/);
    expect(poet.sources).toHaveLength(2);
  });
});
