import type { JournalPoet } from './journalData';
import sourceData from '../../data/generated/journalChronology.json';

export type ChronologyWork = {
  id: string;
  title: string;
  date: string;
  form: string;
  genre: string;
  sourceUrl: string;
  sourceDate?: string;
  datingSourceUrl?: string;
};

export type ChronologySource = {
  birthYear: number;
  endYear: number;
  sourceUrl: string;
  retrievedAt: string;
  indexedTotal: number;
  excludedTotal: number;
  works: ChronologyWork[];
};

export type PoetryChronology = ChronologySource & {
  years: Record<number, number>;
  annualWorks: (ChronologyWork & { year: number })[];
  uncertainWorks: ChronologyWork[];
  undatedWorks: ChronologyWork[];
};

/** Adopt only a single explicit CE year; ranges, approximate and invalid dates stay separate. */
export function buildChronology(source: Pick<ChronologySource, 'birthYear' | 'endYear' | 'works'>) {
  const works = [...new Map(source.works.map(work => [work.id, work])).values()];
  const years: Record<number, number> = {};
  const annualWorks: (ChronologyWork & { year: number })[] = [];
  const uncertainWorks: ChronologyWork[] = [];
  const undatedWorks: ChronologyWork[] = [];
  for (const work of works) {
    const match = work.date.match(/^(\d{3})年(?:春|夏|秋|冬|[一二三四五六七八九十正闰腊\d月日初中下上旬末季孟仲暮\s])*$/);
    const year = match ? Number(match[1]) : undefined;
    if (year !== undefined && year >= source.birthYear && year <= source.endYear) {
      years[year] = (years[year] ?? 0) + 1;
      annualWorks.push({ ...work, year });
    } else if (work.date.trim()) uncertainWorks.push(work);
    else undatedWorks.push(work);
  }
  return { ...source, works, years, annualWorks, uncertainWorks, undatedWorks };
}

const sources = sourceData as Record<string, ChronologySource>;
const chronologies = new Map<string, PoetryChronology>();
export function getPoetryChronology(poet: Pick<JournalPoet, 'id'>): PoetryChronology | null {
  const source = sources[poet.id];
  if (!source) return null;
  if (!chronologies.has(poet.id)) chronologies.set(poet.id, { ...source, ...buildChronology(source) });
  return chronologies.get(poet.id)!;
}

export function chronologyLevel(count: number | undefined) {
  return count === undefined ? 'unknown' : count <= 10 ? '1' : count <= 30 ? '2' : count <= 60 ? '3' : '4';
}

