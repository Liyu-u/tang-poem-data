import rawBundle from '../generated/tang-poem.json';
import { demoDataset } from './demo';
import type { Dataset, ImageryLink, ImageryNode, ImageryOccurrence, Period, PoemRecord, PoetRecord, SourceRecord } from '../../types/domain';

type RawBundle = typeof rawBundle;
const production = { isDemo: false as const, dataStatus: 'production' as const };

const sourceById = new Map(rawBundle.sources.map((source) => [source.id, source]));
const poetById = new Map(rawBundle.poets.map((poet) => [poet.id, poet]));

const poems: PoemRecord[] = rawBundle.poems.map((poem) => {
  const poet = poetById.get(poem.poetId);
  const source = sourceById.get(poem.sourceId);
  return {
    ...production,
    id: poem.id,
    title: poem.title,
    poetId: poem.poetId,
    poetName: poet?.name ?? '佚名',
    period: poem.period as PoemRecord['period'],
    poeticForm: poem.poeticForm,
    fullText: poem.fullText,
    lineTexts: poem.lines.map((line) => line.text),
    themes: poem.themes,
    imagery: poem.imagery,
    colors: poem.colors,
    techniques: poem.techniques,
    sourceLabel: source?.title || '未标注来源',
    sourceLocator: poem.sourceLocator,
    reviewStatus: poem.reviewStatus as PoemRecord['reviewStatus'],
    annotations: poem.annotations,
  };
});

const poets: PoetRecord[] = rawBundle.poets.map((poet) => ({
  ...production,
  id: poet.id,
  name: poet.name,
  period: poet.period as PoetRecord['period'],
  birthYear: poet.birthYear ?? undefined,
  deathYear: poet.deathYear ?? undefined,
  biography: poet.biography,
  poemIds: poet.poemIds,
  courtesyName: poet.courtesyName || undefined,
  artName: poet.artName || undefined,
  reviewStatus: poet.reviewStatus as PoetRecord['reviewStatus'],
}));

const sources: SourceRecord[] = rawBundle.sources.map((source) => ({
  ...production,
  id: source.id,
  label: source.title || source.type,
  locator: source.url,
  note: source.rights,
  reviewStatus: source.reviewStatus as SourceRecord['reviewStatus'],
}));

const imageryOccurrences: ImageryOccurrence[] = poems.map((poem) => ({
  ...production,
  poemId: poem.id,
  imagery: poem.imagery,
}));

const imageryNameById = new Map(rawBundle.graphs.imagery.nodes.map((node) => [node.id, node.name]));
const imageryGraph: Dataset['imageryGraph'] = {
  ...production,
  nodes: rawBundle.graphs.imagery.nodes.map((node): ImageryNode => ({
    ...production,
    id: node.name,
    name: node.name,
    category: node.category,
    poemCount: node.poemCount,
  })),
  links: rawBundle.graphs.imagery.links.map((link): ImageryLink => ({
    ...production,
    source: imageryNameById.get(link.source) ?? link.source,
    target: imageryNameById.get(link.target) ?? link.target,
    poemCount: link.poemCount,
    poemIds: link.poemIds,
  })),
};

const timeline: Dataset['timeline'] = {
  ...production,
  periods: rawBundle.graphs.timeline.periods.map((period) => ({
    id: period.id as PoetRecord['period'],
    poemCount: period.poemCount,
    poetIds: period.poetIds,
  })),
  poets: rawBundle.graphs.timeline.poets.map((poet) => ({
    id: poet.id,
    name: poet.name,
    period: poet.period as Period,
    poemCount: poet.poemCount,
  })),
  poems: rawBundle.graphs.timeline.poems.map((poem) => ({
    id: poem.id,
    title: poem.title,
    period: poem.period as Period,
    poetId: poem.poetId,
  })),
};

export const tangPoemDataset: Dataset = {
  ...production,
  poems,
  poets,
  sources,
  imageryOccurrences,
  imageryGraph,
  periods: timeline.periods,
  timeline,
  quality: {
    ...rawBundle.meta,
    pendingRelationCount: rawBundle.quality.pendingRelationCount,
    pendingProsodyCount: rawBundle.quality.pendingProsodyCount,
  },
};

export function getDataset(mode: 'demo' | 'production' = 'production'): Dataset {
  if (mode === 'demo') {
    return demoDataset;
  }
  return tangPoemDataset;
}

export type FrontendBundle = RawBundle;
