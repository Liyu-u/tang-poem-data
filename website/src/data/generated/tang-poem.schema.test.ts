import { describe, expect, it } from 'vitest';
import bundle from './tang-poem.json';

describe('generated Tang poem bundle contract', () => {
  it('keeps manifest counts aligned with exported records', () => {
    expect(bundle.meta.poemCount).toBe(bundle.poems.length);
    expect(bundle.meta.poetCount).toBe(bundle.poets.length);
    expect(bundle.meta.lineCount).toBe(bundle.poems.reduce((count, poem) => count + poem.lines.length, 0));
    expect(bundle.meta.unresolvedReferenceCount).toBe(0);
  });

  it('contains no orphan line, poem, poet, or imagery graph references', () => {
    const poemIds = new Set(bundle.poems.map((poem) => poem.id));
    const poetIds = new Set(bundle.poets.map((poet) => poet.id));
    const imageryIds = new Set(bundle.graphs.imagery.nodes.map((node) => node.id));

    expect(bundle.poems.every((poem) => poetIds.has(poem.poetId))).toBe(true);
    expect(bundle.poems.every((poem) => poem.lines.every((line) => poemIds.has(poem.id)))).toBe(true);
    expect(bundle.graphs.timeline.poems.every((poem) => poemIds.has(poem.id) && poetIds.has(poem.poetId))).toBe(true);
    expect(bundle.graphs.imagery.links.every((link) => imageryIds.has(link.source) && imageryIds.has(link.target))).toBe(true);
  });
});
