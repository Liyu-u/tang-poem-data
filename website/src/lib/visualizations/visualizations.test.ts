import { describe, expect, it } from 'vitest';
import { tangPoemDataset } from '../../data/adapters/tangPoem';
import { buildImageryLayout } from './imagery';
import { buildTimelineLayout } from './timeline';

describe('visualization projections', () => {
  it('projects all periods and narrows poem nodes by selected period', () => {
    const full = buildTimelineLayout(tangPoemDataset.timeline);
    const highTang = buildTimelineLayout(tangPoemDataset.timeline, '盛唐');

    expect(full.periods).toHaveLength(5);
    expect(full.poems).toHaveLength(160);
    expect(highTang.poems.every((poem) => poem.period === '盛唐')).toBe(true);
    expect(highTang.poems.length).toBe(82);
  });

  it('projects weighted imagery links with stable node coordinates', () => {
    const layout = buildImageryLayout(tangPoemDataset.imageryGraph);

    expect(layout.nodes.length).toBeGreaterThan(0);
    expect(layout.links.length).toBeGreaterThan(0);
    expect(layout.links.every((link) => link.poemCount > 0 && link.path.startsWith('M '))).toBe(true);
    expect(new Set(layout.nodes.map((node) => `${node.x}:${node.y}`)).size).toBe(layout.nodes.length);
  });
});
