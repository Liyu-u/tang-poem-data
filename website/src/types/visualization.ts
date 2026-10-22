export type Point = {
  x: number;
  y: number;
};

export type TimelineArc = Point & {
  id: string;
  label: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  poemCount: number;
};

export type TimelineNode = Point & {
  id: string;
  label: string;
  kind: 'poet' | 'poem';
  period: string;
  radius: number;
};

export type TimelineLayout = {
  width: number;
  height: number;
  center: Point & { label: string };
  periods: TimelineArc[];
  poets: TimelineNode[];
  poems: TimelineNode[];
};

export type ChordNode = {
  id: string;
  label: string;
  index: number;
  startAngle: number;
  endAngle: number;
  radius: number;
};

export type ChordRibbon = {
  key: string;
  source: string;
  target: string;
  poemCount: number;
  poemIds: string[];
  path: string;
};

export type ChordLayout = {
  width: number;
  height: number;
  center: Point;
  nodes: ChordNode[];
  ribbons: ChordRibbon[];
};
