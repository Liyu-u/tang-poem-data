import { describe, expect, it } from 'vitest';
import { tangPoemDataset } from './tangPoem';

describe('tang poem dataset adapter', () => {
  it('loads the exported corpus and preserves review state', () => {
    expect(tangPoemDataset.isDemo).toBe(false);
    expect(tangPoemDataset.dataStatus).toBe('production');
    expect(tangPoemDataset.poems).toHaveLength(160);
    expect(tangPoemDataset.poets).toHaveLength(21);
    expect(tangPoemDataset.poems[0].lineTexts.length).toBeGreaterThan(0);
    expect(tangPoemDataset.poems.some((poem) => poem.reviewStatus === 'pending')).toBe(true);
  });

  it('exposes approved annotation arrays for exploration filters', () => {
    const poem = tangPoemDataset.poems.find((entry) => entry.themes.length > 0);
    expect(poem).toBeDefined();
    expect(poem?.themes.length).toBeGreaterThan(0);
    expect(tangPoemDataset.imageryGraph.nodes.length).toBeGreaterThan(0);
    expect(tangPoemDataset.quality.unresolvedReferenceCount).toBe(0);
  });
});
