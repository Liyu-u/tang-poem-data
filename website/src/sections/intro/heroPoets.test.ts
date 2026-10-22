import { describe, expect, it } from 'vitest';
import { buildHeroPoets } from './heroPoets';
import { tangPoemDataset } from '../../data/adapters/tangPoem';

const dataset = {
  poets: [
    { id: 'li-bai', name: '李白', period: '盛唐', poemIds: ['poem-2', 'poem-1'] },
    { id: 'du-fu', name: '杜甫', period: '盛唐', poemIds: ['poem-3'] },
    { id: 'unknown', name: '无名诗人', period: '待考', poemIds: [] },
  ],
  poems: [
    { id: 'poem-1', poetId: 'li-bai', title: '蜀道难', lineTexts: ['噫吁戏！', '危乎高哉！'] },
    { id: 'poem-2', poetId: 'li-bai', title: '静夜思', lineTexts: ['床前明月光，', '疑是地上霜。'] },
    { id: 'poem-3', poetId: 'du-fu', title: '春望', lineTexts: ['国破山河在，', '城春草木深。'] },
  ],
} as const;

describe('首屏诗人数据', () => {
  it('正式数据中五位诗人各展示八首不同作品的真实诗句', () => {
    const poets = buildHeroPoets(tangPoemDataset);
    expect(poets).toHaveLength(5);
    for (const poet of poets) {
      expect(poet.verses).toHaveLength(8);
      expect(new Set(poet.verses.map(verse => verse.title)).size).toBe(8);
      for (const verse of poet.verses) {
        expect(tangPoemDataset.poems.some(poem => poem.poetId === poet.id
          && poem.title === verse.title && poem.lineTexts.includes(verse.text))).toBe(true);
      }
    }
  });

  it('按固定优先级为诗人选择代表作，并生成两句诗文', () => {
    const heroPoets = buildHeroPoets(dataset);
    const liBai = heroPoets.find((poet) => poet.name === '李白');

    expect(liBai?.workTitle).toBe('静夜思');
    expect(liBai?.quote).toBe('床前明月光，疑是地上霜。');
    expect(liBai?.position).toEqual({ top: '18%', left: '70%' });
    expect(liBai?.figureClip).toMatch(/^polygon\(/);
    expect(liBai?.figureClip.split(',').length).toBeGreaterThan(5);
  });

  it('只返回有诗作的首屏诗人，缺失的诗人不会渲染空热点', () => {
    const heroPoets = buildHeroPoets(dataset);

    expect(heroPoets.map((poet) => poet.name)).toEqual(['李白', '杜甫']);
    expect(heroPoets.every((poet) => poet.quote.length > 0)).toBe(true);
  });

  it('散落诗句每首作品只取一句，并保留对应出处', () => {
    const liBai = buildHeroPoets(dataset).find((poet) => poet.name === '李白');
    expect(liBai?.verses).toEqual([
      { text: '床前明月光，', title: '静夜思' },
      { text: '噫吁戏！', title: '蜀道难' },
    ]);
  });

  it('代表作很长时仍从八首不同作品选句，跳过空句与其他作者', () => {
    const liBai = buildHeroPoets({
      poets: dataset.poets,
      poems: [
        { id: 'main', poetId: 'li-bai', title: '静夜思', lineTexts: ['床前明月光，', ...Array(10).fill('疑是地上霜。')] },
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `other-${index}`, poetId: 'li-bai', title: `作品${index}`,
          lineTexts: [' ', `诗句${index}`, '不应选中的第二句'],
        })),
        { id: 'foreign', poetId: 'du-fu', title: '春望', lineTexts: ['国破山河在，'] },
      ],
    }).find(poet => poet.name === '李白');
    expect(liBai?.verses).toHaveLength(8);
    expect(new Set(liBai?.verses.map(verse => verse.title)).size).toBe(8);
    expect(liBai?.verses.map(verse => verse.text)).toEqual([
      '床前明月光，', '诗句0', '诗句1', '诗句2', '诗句3', '诗句4', '诗句5', '诗句6',
    ]);
  });

  it('只配置红线圈出的五位首屏人物', () => {
    const names = buildHeroPoets({
      poets: [
        { id: 'li-bai', name: '李白', period: '盛唐' },
        { id: 'du-fu', name: '杜甫', period: '盛唐' },
        { id: 'wang-wei', name: '王维', period: '盛唐' },
        { id: 'li-shangyin', name: '李商隐', period: '晚唐' },
        { id: 'bai-juyi', name: '白居易', period: '中唐' },
        { id: 'meng-haoran', name: '孟浩然', period: '盛唐' },
      ],
      poems: [
        { id: 'li-bai-poem', poetId: 'li-bai', title: '静夜思', lineTexts: ['床前明月光，'] },
        { id: 'du-fu-poem', poetId: 'du-fu', title: '春望', lineTexts: ['国破山河在，'] },
        { id: 'wang-wei-poem', poetId: 'wang-wei', title: '山居秋暝', lineTexts: ['空山新雨后，'] },
        { id: 'li-shangyin-poem', poetId: 'li-shangyin', title: '锦瑟', lineTexts: ['锦瑟无端五十弦，'] },
        { id: 'bai-juyi-poem', poetId: 'bai-juyi', title: '琵琶行', lineTexts: ['浔阳江头夜送客，'] },
        { id: 'meng-haoran-poem', poetId: 'meng-haoran', title: '春晓', lineTexts: ['春眠不觉晓，'] },
      ],
    });

    expect(names.map((poet) => poet.name)).toEqual(['李白', '杜甫', '王维', '白居易', '李商隐']);
  });
});
