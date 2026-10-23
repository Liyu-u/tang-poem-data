import { describe, expect, it } from 'vitest';
import { tangPoemDataset } from './tangPoem';

describe('tang poem dataset adapter', () => {
  it('loads the exported corpus and preserves review state', () => {
    expect(tangPoemDataset.isDemo).toBe(false);
    expect(tangPoemDataset.dataStatus).toBe('production');
    expect(tangPoemDataset.poems.length).toBeGreaterThan(160);
    expect(tangPoemDataset.poets).toHaveLength(80);
    expect(tangPoemDataset.poems[0].lineTexts.length).toBeGreaterThan(0);
    expect(tangPoemDataset.poems.some((poem) => poem.reviewStatus === 'pending')).toBe(true);
  });

  it('keeps sourced reading additions separate from literary annotations', () => {
    const additions = tangPoemDataset.poems.filter(poem => poem.id.startsWith('souyun-'));
    expect(additions.length).toBeGreaterThan(200);
    expect(new Set(tangPoemDataset.poems.map(poem => poem.id)).size).toBe(tangPoemDataset.poems.length);
    for (const poet of tangPoemDataset.poets) {
      expect(poet.biography.length).toBeGreaterThan(10);
      expect(tangPoemDataset.poems.some(poem => poem.poetId === poet.id)).toBe(true);
    }
    for (const poem of additions) {
      expect(poem.fullText.length).toBeGreaterThan(5);
      expect(poem.sourceLocator).toMatch(/^https:\/\/www\.sou-yun\.cn\/Query\.aspx/);
      expect(poem.themes).toEqual([]);
      expect(poem.imagery).toEqual([]);
    }
    expect(tangPoemDataset.quality.poemCount).toBe(tangPoemDataset.poems.length);
  });

  it('exposes approved annotation arrays for exploration filters', () => {
    const poem = tangPoemDataset.poems.find((entry) => entry.themes.length > 0);
    expect(poem).toBeDefined();
    expect(poem?.themes.length).toBeGreaterThan(0);
    expect(tangPoemDataset.imageryGraph.nodes.length).toBeGreaterThan(0);
    expect(tangPoemDataset.quality.unresolvedReferenceCount).toBe(0);
  });
});
