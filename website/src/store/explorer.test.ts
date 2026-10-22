import { describe, expect, it } from 'vitest';
import { explorerReducer, initialExplorerState } from './explorer';

describe('explorerReducer', () => {
  it('selecting a period adds a trail node and preserves existing filters', () => {
    const next = explorerReducer(initialExplorerState, { type: 'selectPeriod', period: '盛唐' });
    expect(next.selectedPeriod).toBe('盛唐');
    expect(next.trail.at(-1)).toEqual({ type: 'period', label: '盛唐' });
  });

  it('selecting an imagery link keeps both endpoints in the trail', () => {
    const next = explorerReducer(initialExplorerState, { type: 'selectLink', source: '月', target: '霜' });
    expect(next.selectedLink).toEqual({ source: '月', target: '霜' });
    expect(next.trail.at(-1)).toEqual({ type: 'link', label: '月 × 霜' });
  });
});
