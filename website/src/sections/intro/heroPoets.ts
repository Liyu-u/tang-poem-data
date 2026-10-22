export type HeroPoetPosition = {
  top: string;
  left: string;
};

export type HeroPoet = {
  id: string;
  name: string;
  period: string;
  workTitle: string;
  quote: string;
  verses: ReadonlyArray<{ text: string; title: string }>;
  position: HeroPoetPosition;
  figureClip: string;
  transformOrigin: string;
};

type HeroPoetDataset = {
  poets: ReadonlyArray<{ id: string; name: string; period: string }>;
  poems: ReadonlyArray<{ id: string; poetId: string; title: string; lineTexts: ReadonlyArray<string> }>;
};

type HeroPoetSpec = {
  name: string;
  position: HeroPoetPosition;
  figureClip: string;
  transformOrigin: string;
  preferredTitles: ReadonlyArray<string>;
};

const heroPoetSpecs: ReadonlyArray<HeroPoetSpec> = [
  {
    name: '李白',
    position: { top: '18%', left: '70%' },
    figureClip: 'polygon(54% 3%, 70% 3%, 77% 14%, 83% 28%, 88% 42%, 93% 57%, 91% 76%, 86% 99%, 68% 99%, 64% 83%, 59% 68%, 53% 57%, 49% 47%, 51% 38%, 55% 32%, 51% 28%, 53% 23%, 50% 20%)',
    transformOrigin: '70% 32%',
    preferredTitles: ['静夜思', '蜀道难', '早发白帝城'],
  },
  {
    name: '杜甫',
    position: { top: '75%', left: '39%' },
    figureClip: 'polygon(31% 61%, 38% 55%, 44% 57%, 50% 68%, 53% 85%, 58% 99%, 32% 99%, 32% 92%, 27% 88%, 31% 81%, 29% 74%)',
    transformOrigin: '40% 77%',
    preferredTitles: ['春望', '登高', '望岳'],
  },
  {
    name: '王维',
    position: { top: '67%', left: '51%' },
    figureClip: 'polygon(44% 51%, 50% 48%, 56% 52%, 60% 66%, 58% 81%, 62% 99%, 43% 99%, 40% 89%, 42% 77%, 39% 64%)',
    transformOrigin: '51% 76%',
    preferredTitles: ['山居秋暝', '鹿柴', '竹里馆'],
  },
  {
    name: '白居易',
    position: { top: '66%', left: '84%' },
    figureClip: 'polygon(70% 50%, 77% 48%, 84% 50%, 90% 57%, 94% 54%, 98% 49%, 100% 52%, 100% 99%, 72% 99%, 68% 87%, 69% 73%, 67% 64%)',
    transformOrigin: '82% 70%',
    preferredTitles: ['琵琶行', '赋得古原草送别'],
  },
  {
    name: '李商隐',
    position: { top: '73%', left: '66%' },
    figureClip: 'polygon(57% 57%, 63% 55%, 69% 61%, 74% 76%, 77% 95%, 79% 99%, 57% 99%, 54% 90%, 53% 79%, 54% 69%)',
    transformOrigin: '66% 77%',
    preferredTitles: ['锦瑟', '夜雨寄北'],
  },
];

function pickRepresentativePoem(
  poetId: string,
  preferredTitles: ReadonlyArray<string>,
  poems: HeroPoetDataset['poems'],
) {
  const poetPoems = poems.filter((poem) => poem.poetId === poetId && poem.lineTexts.length > 0);
  return preferredTitles
    .map((title) => poetPoems.find((poem) => poem.title === title))
    .find((poem) => poem !== undefined) ?? poetPoems[0];
}

export function buildHeroPoets(dataset: HeroPoetDataset): HeroPoet[] {
  return heroPoetSpecs.flatMap((spec) => {
    const poet = dataset.poets.find((entry) => entry.name === spec.name);
    if (!poet) return [];

    const poem = pickRepresentativePoem(poet.id, spec.preferredTitles, dataset.poems);
    if (!poem) return [];

    return [{
      id: poet.id,
      name: poet.name,
      period: poet.period,
      workTitle: poem.title,
      quote: poem.lineTexts.slice(0, 2).join(''),
      verses: [poem, ...dataset.poems.filter((entry) => entry.poetId === poet.id && entry.id !== poem.id)]
        .flatMap((entry) => {
          const text = entry.lineTexts.find((line) => line.trim())?.trim();
          return text ? [{ text, title: entry.title }] : [];
        })
        .filter((entry, index, entries) => entries.findIndex((other) => other.text === entry.text || other.title === entry.title) === index)
        .slice(0, 8),
      position: spec.position,
      figureClip: spec.figureClip,
      transformOrigin: spec.transformOrigin,
    }];
  });
}
