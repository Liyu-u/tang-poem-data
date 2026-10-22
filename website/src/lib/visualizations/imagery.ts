import { scaleSqrt } from 'd3-scale';

export type ImageryLayoutNode = {
  id: string;
  label: string;
  category: string;
  poemCount: number;
  x: number;
  y: number;
  radius: number;
  selected: boolean;
};

export type ImageryLayoutLink = {
  key: string;
  source: string;
  target: string;
  poemCount: number;
  poemIds: string[];
  path: string;
};

export type ImageryLayout = {
  width: number;
  height: number;
  center: { x: number; y: number };
  nodes: ImageryLayoutNode[];
  links: ImageryLayoutLink[];
};

type ImageryGraph = {
  nodes: Array<{ id: string; name: string; category: string; poemCount: number }>;
  links: Array<{ source: string; target: string; poemCount: number; poemIds: string[] }>;
};

export function buildImageryLayout(
  graph: ImageryGraph,
  selectedImagery?: string | null,
  width = 760,
  height = 520,
): ImageryLayout {
  const center = { x: width / 2, y: height / 2 };
  const nodes = [...graph.nodes].sort((a, b) => b.poemCount - a.poemCount || a.name.localeCompare(b.name, 'zh-CN'));
  const radiusScale = scaleSqrt().domain([0, Math.max(1, ...nodes.map((node) => node.poemCount))]).range([8, 28]);
  const layoutNodes = nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2;
    const orbit = Math.min(width, height) * 0.34;
    return {
      id: node.id,
      label: node.name,
      category: node.category,
      poemCount: node.poemCount,
      x: center.x + Math.cos(angle) * orbit,
      y: center.y + Math.sin(angle) * orbit,
      radius: radiusScale(node.poemCount),
      selected: Boolean(selectedImagery && selectedImagery === node.name),
    };
  });
  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  const nodeByLabel = new Map(layoutNodes.map((node) => [node.label, node]));

  const layoutLinks = graph.links.flatMap((link) => {
    const source = nodeById.get(link.source) ?? nodeByLabel.get(link.source);
    const target = nodeById.get(link.target) ?? nodeByLabel.get(link.target);
    if (!source || !target) return [];
    return [{
      key: `${source.id}::${target.id}`,
      source: source.id,
      target: target.id,
      poemCount: link.poemCount,
      poemIds: link.poemIds,
      path: `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} L ${target.x.toFixed(2)} ${target.y.toFixed(2)}`,
    }];
  });

  return { width, height, center, nodes: layoutNodes, links: layoutLinks };
}
