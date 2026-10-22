import type { Period } from '../../types/domain';

const demo = { isDemo: true as const, dataStatus: 'demo' as const };

export const demoPeriods: Array<{ id: Period; poemCount: number; poetIds: string[] }> = [
  { id: '初唐', poemCount: 0, poetIds: [] },
  { id: '盛唐', poemCount: 7, poetIds: ['poet-libai', 'poet-wangwei', 'poet-menghaoran', 'poet-wangzhihuan', 'poet-wangchangling', 'poet-dufu'] },
  { id: '中唐', poemCount: 0, poetIds: [] },
  { id: '晚唐', poemCount: 0, poetIds: [] },
];

export const demoThemes = [
  { ...demo, id: '山水田园', values: [0, 4, 0, 0], color: '#637f78' },
  { ...demo, id: '边塞征战', values: [0, 1, 0, 0], color: '#a74332' },
  { ...demo, id: '思乡怀人', values: [0, 1, 0, 0], color: '#7286a3' },
  { ...demo, id: '人生感怀', values: [0, 3, 0, 0], color: '#b78c55' },
];
