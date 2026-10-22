import { timelineWorks } from '../../data/timelineContent';

// Shared SVG geometry and node anchors: a deeper rim without moving the center down.
export const TIMELINE_AXIS_PATH = 'M 30 0 A 470 100 0 0 0 970 0';
export function getTimelineAxisY(positionPercent: number): number {
  return 100 * Math.sqrt(Math.max(0, 1 - ((positionPercent - 50) / 47) ** 2));
}

export type TimelineRailStage = {
  id: string;
  label: string;
  year: string;
  title: string;
  summary: string;
  themes: string[];
  author: string;
  poemTitle: string;
  period: string;
  interpretation: string;
};

export type TimelineRailArtwork = {
  image: string;
  preview: string;
};

export type TimelineRailCard = {
  id: string;
  title: string;
  author: string;
  period: string;
  interpretation: string;
  image: string;
  preview: string;
  stageIndex: number;
};

export type TimelineRailVisualState = {
  distance: number;
  scale: number;
  opacity: number;
  blur: number;
  zIndex: number;
  isCenter: boolean;
};

export function buildTimelineRailStages(): TimelineRailStage[] {
  return timelineWorks.map((work, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `stage-${number}`,
      label: `节点 ${number}`,
      year: work.year,
      title: work.event,
      summary: work.history,
      themes: [],
      author: work.author,
      poemTitle: work.title,
      period: work.period,
      interpretation: work.interpretation,
    };
  });
}

export function buildTimelineRailCards(artwork: Record<string, TimelineRailArtwork>): TimelineRailCard[] {
  return buildTimelineRailStages().map((stage, index) => {
    const poster = artwork[stage.poemTitle];
    if (!poster) throw new Error(`Missing timeline artwork: ${stage.poemTitle}`);
    return {
      id: `work-${String(index + 1).padStart(2, '0')}`,
      title: stage.poemTitle,
      author: stage.author,
      period: stage.period,
      interpretation: stage.interpretation,
      image: poster.image,
      preview: poster.preview,
      stageIndex: index,
    };
  });
}

export function normalizeTimelineWheelDelta(delta: number, deltaMode: number, viewportSize: number): number {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * viewportSize;
  return delta;
}

export function getTimelineRailVisualState(index: number, activeIndex: number): TimelineRailVisualState {
  const distance = Math.abs(index - activeIndex);
  const isCenter = distance === 0;

  if (isCenter) {
    return { distance, scale: 1, opacity: 1, blur: 0, zIndex: 5, isCenter };
  }

  if (distance === 1) {
    return { distance, scale: 0.82, opacity: 0.66, blur: 0.25, zIndex: 4, isCenter };
  }

  return {
    distance,
    scale: Math.max(0.58, 0.68 - (distance - 2) * 0.03),
    opacity: Math.max(0.16, 0.34 - (distance - 2) * 0.06),
    blur: Math.min(2.5, 0.55 + (distance - 2) * 0.25),
    zIndex: Math.max(1, 3 - distance),
    isCenter,
  };
}
