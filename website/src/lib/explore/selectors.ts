import type {
  ExplorationFilters,
  ImageryLink,
  ImageryNode,
  ImageryOccurrence,
  PoemRecord,
} from '../../types/domain';

const normalize = (value: string) => value.trim().toLocaleLowerCase('zh-CN');

export function searchPoems(poems: PoemRecord[], query: string): PoemRecord[] {
  const needle = normalize(query);
  if (!needle) return poems;

  return poems.filter((poem) => {
    const haystack = [
      poem.title,
      poem.poetName,
      poem.fullText,
      ...poem.themes,
      ...poem.imagery,
      ...poem.colors,
      ...poem.techniques,
    ].map(normalize);
    return haystack.some((value) => value.includes(needle));
  });
}

export function filterPoems(poems: PoemRecord[], filters: ExplorationFilters): PoemRecord[] {
  return poems.filter((poem) => {
    if (filters.period && poem.period !== filters.period) return false;
    if (filters.poetId && poem.poetId !== filters.poetId) return false;
    if (filters.poeticForm && poem.poeticForm !== filters.poeticForm) return false;
    if (filters.theme && !poem.themes.includes(filters.theme)) return false;
    if (filters.imagery && !poem.imagery.includes(filters.imagery)) return false;
    if (filters.color && !poem.colors.includes(filters.color)) return false;
    if (filters.technique && !poem.techniques.includes(filters.technique)) return false;
    return true;
  });
}

export function getPoemById(poems: PoemRecord[], id: string | undefined): PoemRecord | null {
  return poems.find((poem) => poem.id === id) ?? null;
}

export function buildImageryGraph(
  poems: PoemRecord[],
  occurrences: ImageryOccurrence[],
): { nodes: ImageryNode[]; links: ImageryLink[]; isDemo: true; dataStatus: 'demo' } {
  const poemById = new Map(poems.map((poem) => [poem.id, poem]));
  const poemSets = occurrences
    .filter((occurrence) => poemById.has(occurrence.poemId))
    .map((occurrence) => ({ poemId: occurrence.poemId, imagery: [...new Set(occurrence.imagery)] }));
  const poemIdsByImagery = new Map<string, Set<string>>();
  const linkMap = new Map<string, { source: string; target: string; poemIds: Set<string> }>();

  for (const occurrence of poemSets) {
    for (const imagery of occurrence.imagery) {
      const poemIds = poemIdsByImagery.get(imagery) ?? new Set<string>();
      poemIds.add(occurrence.poemId);
      poemIdsByImagery.set(imagery, poemIds);
    }

    for (let index = 0; index < occurrence.imagery.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < occurrence.imagery.length; nextIndex += 1) {
        const source = occurrence.imagery[index];
        const target = occurrence.imagery[nextIndex];
        const key = `${source}::${target}`;
        const link = linkMap.get(key) ?? { source, target, poemIds: new Set<string>() };
        link.poemIds.add(occurrence.poemId);
        linkMap.set(key, link);
      }
    }
  }

  const nodes = [...poemIdsByImagery.entries()]
    .map(([name, poemIds]) => ({ ...demoFlag(), id: name, name, category: '演示意象', poemCount: poemIds.size }))
    .sort((a, b) => b.poemCount - a.poemCount || a.name.localeCompare(b.name, 'zh-CN'));

  const links = [...linkMap.values()]
    .map((link) => ({ ...demoFlag(), source: link.source, target: link.target, poemCount: link.poemIds.size, poemIds: [...link.poemIds] }))
    .sort((a, b) => b.poemCount - a.poemCount || `${a.source}${a.target}`.localeCompare(`${b.source}${b.target}`, 'zh-CN'));

  return { nodes, links, ...demoFlag() };
}

function demoFlag() {
  return { isDemo: true as const, dataStatus: 'demo' as const };
}
