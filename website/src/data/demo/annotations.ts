import type { ImageryOccurrence } from '../../types/domain';

const demo = { isDemo: true as const, dataStatus: 'demo' as const };

export const demoImageryOccurrences: ImageryOccurrence[] = [
  { ...demo, poemId: 'poem-jingyesi', imagery: ['月', '霜', '夜'] },
  { ...demo, poemId: 'poem-lushan', imagery: ['山', '水', '云'] },
  { ...demo, poemId: 'poem-chunxiao', imagery: ['夜', '风', '花', '鸟'] },
  { ...demo, poemId: 'poem-guanque', imagery: ['山', '水', '日'] },
  { ...demo, poemId: 'poem-chusai', imagery: ['月', '山', '关'] },
  { ...demo, poemId: 'poem-wangyue', imagery: ['山', '青', '晓'] },
  { ...demo, poemId: 'poem-shanju', imagery: ['山', '雨', '月', '泉', '水'] },
];
