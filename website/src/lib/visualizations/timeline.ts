import type { Period, TimelineData } from '../../types/domain';
import type { TimelineLayout, TimelineNode } from '../../types/visualization';

const TAU = Math.PI * 2;

export function buildTimelineLayout(
  timeline: TimelineData,
  selectedPeriod?: Period | null,
  width = 820,
  height = 560,
): TimelineLayout {
  const center = { x: width / 2, y: height / 2, label: '唐' };
  const periods = timeline.periods.map((period, index) => {
    const startAngle = -Math.PI / 2 + (index * TAU) / timeline.periods.length;
    return {
      id: period.id,
      label: period.id,
      x: center.x,
      y: center.y,
      startAngle,
      endAngle: startAngle + TAU / timeline.periods.length - 0.08,
      innerRadius: 88,
      outerRadius: 142,
      poemCount: period.poemCount,
    };
  });

  const activePeriods = selectedPeriod ? new Set([selectedPeriod]) : new Set(timeline.periods.map((period) => period.id));
  const poetsByPeriod = new Map<string, typeof timeline.poets>();
  for (const poet of timeline.poets) {
    if (!activePeriods.has(poet.period as Period)) continue;
    const poets = poetsByPeriod.get(poet.period) ?? [];
    poets.push(poet);
    poetsByPeriod.set(poet.period, poets);
  }

  const poetNodes: TimelineNode[] = [];
  const poemNodes: TimelineNode[] = [];
  const selectedPoems = timeline.poems.filter((poem) => activePeriods.has(poem.period as Period));
  const poemsByPoet = new Map<string, typeof selectedPoems>();
  for (const poem of selectedPoems) {
    const poems = poemsByPoet.get(poem.poetId) ?? [];
    poems.push(poem);
    poemsByPoet.set(poem.poetId, poems);
  }

  for (const [period, poets] of poetsByPeriod) {
    const periodIndex = timeline.periods.findIndex((entry) => entry.id === period);
    const periodAngle = -Math.PI / 2 + ((periodIndex + 0.5) * TAU) / timeline.periods.length;
    const spread = Math.min(0.48, 0.16 * Math.max(1, poets.length - 1));
    poets.forEach((poet, poetIndex) => {
      const poetAngle = periodAngle + (poetIndex - (poets.length - 1) / 2) * (spread / Math.max(1, poets.length - 1));
      const poetNode: TimelineNode = {
        id: poet.id,
        label: poet.name,
        kind: 'poet',
        period,
        x: center.x + Math.cos(poetAngle) * 190,
        y: center.y + Math.sin(poetAngle) * 190,
        radius: 7 + Math.min(8, Math.sqrt(poet.poemCount)),
      };
      poetNodes.push(poetNode);

      const poems = poemsByPoet.get(poet.id) ?? [];
      poems.forEach((poem, poemIndex) => {
        const poemAngle = poetAngle + (poemIndex - (poems.length - 1) / 2) * 0.04;
        poemNodes.push({
          id: poem.id,
          label: poem.title,
          kind: 'poem',
          period,
          x: center.x + Math.cos(poemAngle) * 255,
          y: center.y + Math.sin(poemAngle) * 255,
          radius: 3.5,
        });
      });
    });
  }

  return { width, height, center, periods, poets: poetNodes, poems: poemNodes };
}
