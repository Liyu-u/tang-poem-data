import { buildImageryGraph } from '../../lib/explore/selectors';
import { demoImageryOccurrences } from '../demo/annotations';
import { demoPoets, demoPoems, demoSources } from '../demo/poems';
import { demoPeriods } from '../demo/visualizations';
import type { DemoDataset, TimelineData } from '../../types/domain';

const timeline: TimelineData = {
  isDemo: true,
  dataStatus: 'demo',
  periods: demoPeriods,
  poets: demoPoets.map((poet) => ({ id: poet.id, name: poet.name, period: poet.period, poemCount: poet.poemIds.length })),
  poems: demoPoems.map((poem) => ({ id: poem.id, title: poem.title, period: poem.period, poetId: poem.poetId })),
};

export const demoDataset: DemoDataset = {
  isDemo: true,
  dataStatus: 'demo',
  poems: demoPoems,
  poets: demoPoets,
  sources: demoSources,
  imageryOccurrences: demoImageryOccurrences,
  imageryGraph: buildImageryGraph(demoPoems, demoImageryOccurrences),
  periods: demoPeriods,
  timeline,
  quality: {
    version: 'demo',
    generatedAt: 'demo',
    poemCount: demoPoems.length,
    poetCount: demoPoets.length,
    lineCount: demoPoems.reduce((count, poem) => count + poem.lineTexts.length, 0),
    sourceCount: demoSources.length,
    approvedThemePoemCount: demoPoems.length,
    approvedImageryPoemCount: demoPoems.length,
    approvedColorPoemCount: demoPoems.filter((poem) => poem.colors.length > 0).length,
    approvedTechniquePoemCount: demoPoems.length,
    unresolvedReferenceCount: 0,
    pendingRelationCount: 0,
    pendingProsodyCount: 0,
  },
};
