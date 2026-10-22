import baiPortrait from '../../assets/hero-figure-bai-juyi.png';
import duPortrait from '../../assets/hero-figure-dufu.png';
import liPortrait from '../../assets/hero-figure-libai-complete.png';
import yuanPortrait from '../../assets/journal/poet-portraits/元稹-彩色.png';
import liuPortrait from '../../assets/journal/poet-portraits/刘禹锡-彩色.png';
import { reviewedProfiles } from './journalProfiles';
import primaryWorks from '../../data/generated/journalPrimaryWorks.json';

export type JournalTheme = { id: string; name: string; value: number; color: string; image?: string };
export type JournalWork = { title: string; excerpt: string; tag?: string; image?: string; text?: string; sourceUrl?: string; date?: string };
export type JournalPoet = {
  id: string; name: string; count: number; portrait?: string; dates: string;
  alias: string; school: string; description: string; quote: string;
  works: JournalWork[];
  sources?: { title: string; url: string }[];
  profile?: { hometown?: string; biography?: string; milestones?: string[]; connections?: string[]; achievements?: string; status?: string };
};

// TCCP public train/val/test files, counted at this immutable revision.
// README's 3,247 differs from the 3,206 nonempty records actually distributed.
// Counts and file hashes: artifacts/tccp-public-data/source-audit.json.
export const tccpSource = {
  url: 'https://github.com/shuizhonghaitong/classification_GAT/tree/8efecb2506f94799423d759298f8dd1946ac6613/data',
  total: 3206,
  splits: { train: 2804, validation: 159, test: 243 },
};
export const tccpThemes: JournalTheme[] = [
  { id: 'homesick', name: '思乡', value: 655, color: '#a55448' },
  { id: 'farewell', name: '送别', value: 637, color: '#8ba79b' },
  { id: 'war', name: '战争', value: 606, color: '#a76b48' },
  { id: 'missing', name: '怀人', value: 469, color: '#436f83' },
  { id: 'pastoral', name: '田园', value: 199, color: '#477f70' },
  { id: 'history', name: '怀古', value: 169, color: '#837a68' },
  { id: 'objects', name: '咏物', value: 158, color: '#c38962' },
  { id: 'landscape', name: '山水', value: 158, color: '#687d58' },
  { id: 'boudoir', name: '闺怨', value: 155, color: '#967488' },
];

// User-supplied topic table: the five largest categories, followed by the
// remaining six rows combined. This replaces the old TCCP sample in the chart.
export const journalThemes: JournalTheme[] = [
  { id: 'landscape-pastoral', name: '山水田园', value: 14225, color: '#788675' },
  { id: 'farewell', name: '交游送别', value: 12733, color: '#8896a8' },
  { id: 'objects', name: '咏物与托物言志', value: 8066, color: '#c7bb9b' },
  { id: 'homesick', name: '羁旅思乡', value: 7131, color: '#536477' },
  { id: 'war', name: '边塞', value: 4092, color: '#c4a17a' },
  { id: 'other', name: '其他', value: 3984 + 2762 + 2440 + 1173 + 806 + 200, color: '#b18a6d' },
];
export const journalThemeTotal = journalThemes.reduce((sum, theme) => sum + theme.value, 0);

// 汉语典 /shici author counts checked 2026-10-21; chronology uses its own 搜韵 corpus.
export const journalRankingSource = { title: '汉语典诗词库', url: 'https://www.hanyudian.com/shici', checkedAt: '2026-10-21' };
const rankedPoets: Pick<JournalPoet, 'id' | 'name' | 'count' | 'dates' | 'portrait'>[] = [
  { id: 'bai-juyi', name: '白居易', count: 3008, portrait: baiPortrait, dates: '唐 · 772—846' },
  { id: 'du-fu', name: '杜甫', count: 1489, portrait: duPortrait, dates: '唐 · 712—770' },
  { id: 'li-bai', name: '李白', count: 1207, portrait: liPortrait, dates: '唐 · 701—762' },
  { id: 'yuan-zhen', name: '元稹', count: 910, portrait: yuanPortrait, dates: '唐 · 779—831' },
  { id: 'liu-yuxi', name: '刘禹锡', count: 886, portrait: liuPortrait, dates: '唐 · 772—842' },
];
export const journalPoets: JournalPoet[] = rankedPoets.map(poet => ({
  ...poet, ...reviewedProfiles[poet.id],
  works: (primaryWorks as Record<string, JournalWork[]>)[poet.id] ?? [],
}));

function pendingPoet(id: string, name: string, alias = '字号待补充'): JournalPoet {
  return { id, name, count: 0, dates: '生卒年待补充', alias, school: '资料待补充', description: '诗人资料待上传', quote: '代表诗句待补充', works: [] };
}
export const journalExtraPoets = [
  pendingPoet('wang-ji', '王绩'), pendingPoet('wang-bo', '王勃', '字子安'),
  pendingPoet('yang-jiong', '杨炯'), pendingPoet('lu-zhaolin', '卢照邻'),
  pendingPoet('luo-binwang', '骆宾王'), pendingPoet('chen-ziang', '陈子昂'),
  pendingPoet('meng-haoran', '孟浩然'), pendingPoet('wang-wei', '王维'),
  pendingPoet('wang-changling', '王昌龄'), pendingPoet('gao-shi', '高适'), pendingPoet('cen-shen', '岑参'),
  pendingPoet('wei-yingwu', '韦应物'), pendingPoet('meng-jiao', '孟郊'), pendingPoet('han-yu', '韩愈'),
  pendingPoet('liu-zongyuan', '柳宗元'), pendingPoet('li-he', '李贺'),
  pendingPoet('du-mu', '杜牧'), pendingPoet('xu-hun', '许浑'),
  pendingPoet('li-shangyin', '李商隐'), pendingPoet('wen-tingyun', '温庭筠'), pendingPoet('wei-zhuang', '韦庄'),
];
export const allJournalPoets = [...journalPoets, ...journalExtraPoets];

export type JournalPeriod = { id: string; name: string; count: number; poetIds: string[]; illustration?: string };
// Historical approximate counts from Lin Geng, 盛唐气象 (1958).
// Excludes Five Dynasties and authors whose lives could not be dated.
export const journalPeriodSource = {
  publication: '林庚《盛唐气象》（1958）',
  url: 'https://jypl.pku.edu.cn/article/info?aid=271016555',
  fullTextUrl: 'https://www.aisixiang.com/data/146447.html',
};
export const journalPeriods: JournalPeriod[] = [
  { id: 'early', name: '初唐', count: 2757, poetIds: ['wang-ji', 'wang-bo', 'yang-jiong', 'lu-zhaolin', 'luo-binwang', 'chen-ziang'] },
  { id: 'high', name: '盛唐', count: 6341, poetIds: ['meng-haoran', 'wang-wei', 'wang-changling', 'gao-shi', 'li-bai', 'du-fu', 'cen-shen'] },
  { id: 'middle', name: '中唐', count: 19020, poetIds: ['wei-yingwu', 'meng-jiao', 'han-yu', 'liu-zongyuan', 'liu-yuxi', 'bai-juyi', 'yuan-zhen', 'li-he'] },
  { id: 'late', name: '晚唐', count: 14744, poetIds: ['du-mu', 'xu-hun', 'li-shangyin', 'wen-tingyun', 'wei-zhuang'] },
];
const periodPortraitFiles = import.meta.glob<string>('../../assets/journal/poet-portraits/*.png', { eager: true, query: '?url', import: 'default' });
export const journalPeriodPortraits: Record<string, string | undefined> = Object.fromEntries([
  ['luo-binwang', '骆宾王'], ['wang-bo', '王勃'], ['chen-ziang', '陈子昂'],
  ['meng-haoran', '孟浩然'], ['wang-wei', '王维'], ['li-bai', '李白'],
  ['du-fu', '杜甫'], ['wei-yingwu', '韦应物'], ['meng-jiao', '孟郊'],
  ['han-yu', '韩愈'], ['liu-yuxi', '刘禹锡'], ['bai-juyi', '白居易'],
  ['du-mu', '杜牧'], ['li-shangyin', '李商隐'], ['wei-zhuang', '韦庄'],
].map(([id, name]) => [id, periodPortraitFiles[`../../assets/journal/poet-portraits/${name}.png`]]));



// Adopted birth years for the visible chronological selection, not years of composition.
// Disputed years remain explicitly approximate; see README source audit.
export const journalTimelinePoets = [
  { id: 'luo-binwang', year: 619, approximate: true },
  { id: 'wang-bo', year: 650, approximate: true },
  { id: 'chen-ziang', year: 661, approximate: false },
  { id: 'meng-haoran', year: 689, approximate: false },
  { id: 'wang-wei', year: 701, approximate: true },
  { id: 'li-bai', year: 701, approximate: false },
  { id: 'du-fu', year: 712, approximate: false },
  { id: 'wei-yingwu', year: 737, approximate: true },
  { id: 'meng-jiao', year: 751, approximate: false },
  { id: 'han-yu', year: 768, approximate: false },
  { id: 'liu-yuxi', year: 772, approximate: false },
  { id: 'bai-juyi', year: 772, approximate: false },
  { id: 'du-mu', year: 803, approximate: false },
  { id: 'li-shangyin', year: 813, approximate: true },
  { id: 'wei-zhuang', year: 836, approximate: false },
].sort((a, b) => a.year - b.year);

// A conventional four-period boundary scheme used for orientation only.
// It does not redefine Lin Geng's author-based count methodology.
export const journalTimelinePeriods = [
  { id: 'early', start: 618, end: 712 },
  { id: 'high', start: 712, end: 762 },
  { id: 'middle', start: 762, end: 827 },
  { id: 'late', start: 827, end: 907 },
];
