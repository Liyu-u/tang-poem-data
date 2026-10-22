import { describe, expect, it } from 'vitest';
import { demoDataset } from '../../data/adapters/demo';
import { buildImageryGraph, filterPoems, searchPoems } from './selectors';

describe('exploration selectors', () => {
  it('searches title, poet, original text, and imagery', () => {
    expect(searchPoems(demoDataset.poems, '月').map((poem) => poem.id)).toContain('poem-jingyesi');
  });

  it('combines period and poetic-form filters', () => {
    const result = filterPoems(demoDataset.poems, { period: '盛唐', poeticForm: '五言绝句' });
    expect(result.every((poem) => poem.period === '盛唐' && poem.poeticForm === '五言绝句')).toBe(true);
  });

  it('builds co-occurrence links with poem ids and Demo status', () => {
    const graph = buildImageryGraph(demoDataset.poems, demoDataset.imageryOccurrences);
    expect(graph.links.some((link) => link.source === '月' && link.target === '霜')).toBe(true);
    expect(graph.isDemo).toBe(true);
  });
});
