/**
 * Ranking source: src/data/source/imagery_top15.csv (raw_occurrences).
 * Feature cards use the user-supplied category statistics; ranking uses raw word counts.
 * Art positions address the 4 × 2 illustration atlas (column, row).
 */
export type ImageryFeature = {
  id: string;
  category: string;
  name: string;
  verse: string;
  description: string;
  note?: string;
  art: readonly [number, number];
};

export type ImageryChapterContent = {
  rankingTitle: string;
  unit: string;
  axisMax: number;
  axisStep: number;
  ranking: { name: string; count: number }[];
  featuresTitle: string;
  introduction: string;
  features: ImageryFeature[];
};

export const imageryChapterContent: ImageryChapterContent = {
  rankingTitle: '唐诗意象词频前 10 名',
  unit: '次',
  axisMax: 20000,
  axisStep: 4000,
  ranking: [
    { name: '山', count: 18212 },
    { name: '风', count: 17030 },
    { name: '日', count: 16688 },
    { name: '云', count: 15891 },
    { name: '天', count: 14158 },
    { name: '花', count: 12340 },
    { name: '水', count: 12292 },
    { name: '月', count: 12204 },
    { name: '春', count: 11842 },
    { name: '秋', count: 8708 },
    { name: '夜', count: 8159 },
    { name: '江', count: 8131 },
    { name: '雨', count: 6459 },
    { name: '草', count: 5932 },
    { name: '烟', count: 5773 },
  ],
  featuresTitle: '诗人最爱的意象',
  introduction: '从出现次数出发，看唐诗中各类常见意象。',
  features: [
    { id: 'season', category: '诗中的季节', name: '春', verse: '出现 11,842 次', description: '涉及 10,861 首诗', art: [0, 0] },
    { id: 'time', category: '诗中的时段', name: '夜', verse: '出现 8,048 次', description: '明确时段词中最多', note: '排除兼有太阳、日期含义的“日”；日／白昼为 16,055 次，涉及 13,908 首诗。', art: [1, 0] },
    { id: 'flower', category: '诗中的花', name: '荷／莲', verse: '出现 2,138 次', description: '涉及 1,979 首诗', note: '具体花种中最多；泛称“花”为 10,887 次，涉及 9,931 首诗。', art: [2, 0] },
    { id: 'tree', category: '诗中的树', name: '松', verse: '出现 3,706 次', description: '涉及 3,552 首诗', art: [3, 0] },
    { id: 'animal', category: '诗中的动物', name: '马', verse: '出现 5,475 次', description: '涉及 4,941 首诗', art: [0, 1] },
    { id: 'instrument', category: '诗中的乐器', name: '琴', verse: '出现 1,614 次', description: '涉及 1,558 首诗', art: [1, 1] },
    { id: 'mountain', category: '诗中的山岳', name: '南山', verse: '出现 413 次', description: '涉及 406 首诗', note: '“南山”可能是方位性称谓，不一定指唯一地点。', art: [2, 1] },
    { id: 'building', category: '诗中的建筑', name: '长城', verse: '出现 111 次', description: '涉及 101 首诗', note: '按具体建筑／地标口径统计；“门”等建筑通称不参与此类比较。', art: [3, 1] },
  ],
};
