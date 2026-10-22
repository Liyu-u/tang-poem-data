export type DataStatus = 'demo' | 'production';
export type ReviewStatus = 'demo' | 'pending' | 'approved' | 'needs_revision' | 'rejected';

export type DataRecord = {
  isDemo: boolean;
  dataStatus: DataStatus;
};

export type DemoRecord = {
  isDemo: true;
  dataStatus: 'demo';
};

export type Period = '初唐' | '盛唐' | '中唐' | '晚唐' | '待考';

export type PoemRecord = DataRecord & {
  id: string;
  title: string;
  poetId: string;
  poetName: string;
  period: Period;
  poeticForm: string;
  fullText: string;
  lineTexts: string[];
  themes: string[];
  imagery: string[];
  colors: string[];
  techniques: string[];
  sourceLabel: string;
  sourceLocator: string;
  reviewStatus: ReviewStatus;
  annotations?: {
    tags: Array<{ id: string; name: string; category: string; quote?: string; explanation?: string; confidence?: number }>;
    imagery: Array<{ id: string; name: string; category: string; quote?: string; explanation?: string; confidence?: number }>;
    colors: Array<{ term: string; normalizedColor: string; hex: string; quote?: string; usageType?: string }>;
    techniques: Array<{ id: string; name: string; quote?: string; explanation?: string; effect?: string; confidence?: number }>;
    places: Array<{ id: string; name: string; modernName: string; relationType: string; longitude: number; latitude: number }>;
  };
};

export type PoetRecord = DataRecord & {
  id: string;
  name: string;
  period: Period;
  birthYear?: number;
  deathYear?: number;
  biography: string;
  poemIds: string[];
  courtesyName?: string;
  artName?: string;
  reviewStatus?: ReviewStatus;
};

export type SourceRecord = DataRecord & {
  id: string;
  label: string;
  locator: string;
  note: string;
  reviewStatus?: ReviewStatus;
};

export type ImageryOccurrence = DataRecord & {
  poemId: string;
  imagery: string[];
};

export type ImageryNode = DataRecord & {
  id: string;
  name: string;
  category: string;
  poemCount: number;
};

export type ImageryLink = DataRecord & {
  source: string;
  target: string;
  poemCount: number;
  poemIds: string[];
};

export type DatasetQuality = {
  version: string;
  generatedAt: string;
  poemCount: number;
  poetCount: number;
  lineCount: number;
  sourceCount: number;
  approvedThemePoemCount: number;
  approvedImageryPoemCount: number;
  approvedColorPoemCount: number;
  approvedTechniquePoemCount: number;
  unresolvedReferenceCount: number;
  pendingRelationCount: number;
  pendingProsodyCount: number;
};

export type ExplorationFilters = {
  period?: Period;
  poetId?: string;
  poeticForm?: string;
  theme?: string;
  imagery?: string;
  color?: string;
  technique?: string;
};

export type TimelineData = DataRecord & {
  periods: Array<{ id: Period; poemCount: number; poetIds: string[] }>;
  poets: Array<{ id: string; name: string; period: Period; poemCount: number }>;
  poems: Array<{ id: string; title: string; period: Period; poetId: string }>;
};

export type Dataset = DataRecord & {
  poems: PoemRecord[];
  poets: PoetRecord[];
  sources: SourceRecord[];
  imageryOccurrences: ImageryOccurrence[];
  imageryGraph: DataRecord & {
    nodes: ImageryNode[];
    links: ImageryLink[];
  };
  periods: Array<{ id: Period; poemCount: number; poetIds: string[] }>;
  timeline: TimelineData;
  quality: DatasetQuality;
};

export type DemoDataset = Dataset & DemoRecord;
