import { describe, expect, it } from 'vitest';
import { timelineArtwork } from '../../data/timelineArtwork';
import {
  buildTimelineRailCards,
  buildTimelineRailStages,
  getTimelineRailVisualState,
  normalizeTimelineWheelDelta,
  getTimelineAxisY,
  TIMELINE_AXIS_PATH,
} from './timelineRail';

describe('timeline rail model', () => {
  it('uses a deeper symmetric arc while retaining the center height for label clearance', () => {
    expect(TIMELINE_AXIS_PATH).toBe('M 30 0 A 470 100 0 0 0 970 0');
    expect(getTimelineAxisY(3)).toBe(0);
    expect(getTimelineAxisY(97)).toBe(0);
    expect(getTimelineAxisY(50)).toBe(100);
    expect(getTimelineAxisY(20)).toBeCloseTo(getTimelineAxisY(80));
  });
  it('combines historical node connections with the existing close reading for all eleven backs', () => {
    const cards = buildTimelineRailCards(timelineArtwork);
    const expectedConnections = [
      ['同是宦游人', '海内存知己', '起点'],
      ['武则天', '北征', '全诗仅四句'],
      ['具体创作年份难以确定', '游子与思妇', '初唐向盛唐过渡'],
      ['737年', '出使', '大漠孤烟直'],
      ['744年', '离开长安', '直挂云帆济沧海'],
      ['757年', '家书抵万金', '感时花溅泪'],
      ['767年', '夔州', '落木'],
      ['新乐府', '宫市', '衣着单薄'],
      ['826年', '二十三年弃置身', '病树'],
      ['晚唐', '玉树后庭花', '以歌唱谋生的女子'],
      ['880年前后', '泽国江山入战图', '一将功成万骨枯'],
    ];
    for (const [index, phrases] of expectedConnections.entries()) {
      for (const phrase of phrases) expect(cards[index].interpretation).toContain(phrase);
    }
  });
  it('creates eleven manuscript stages with the agreed date corrections', () => {
    const stages = buildTimelineRailStages();

    expect(stages).toHaveLength(11);
    expect(stages[0]).toMatchObject({ id: 'stage-01', label: '节点 01', year: '7世纪60年代前后', author: '王勃', poemTitle: '送杜少府之任蜀州' });
    expect(stages.at(-1)).toMatchObject({ id: 'stage-11', label: '节点 11' });
    expect(stages.at(-1)?.year).toBe('879—880年前后');
    expect(stages.every((stage) => stage.summary.length > 80 && stage.interpretation.length > 80)).toBe(true);
  });

  it('creates exactly eleven works with a one-to-one stage mapping', () => {
    const cards = buildTimelineRailCards(timelineArtwork);

    expect(cards).toHaveLength(11);
    expect(cards[0]).toMatchObject({ id: 'work-01', image: timelineArtwork['送杜少府之任蜀州'].image, stageIndex: 0 });
    expect(cards[1]).toMatchObject({ id: 'work-02', image: timelineArtwork['登幽州台歌'].image, stageIndex: 1 });
    expect(cards[2]).toMatchObject({ id: 'work-03', image: timelineArtwork['春江花月夜'].image, stageIndex: 2 });
    expect(new Set(cards.map((card) => card.image)).size).toBe(11);
    for (const card of cards) {
      expect(card.image).toBe(timelineArtwork[card.title].image);
      expect(card.preview).toBe(timelineArtwork[card.title].preview);
      expect(card.preview).not.toBe(card.image);
    }
    expect(cards.map((card) => card.stageIndex)).toEqual(Array.from({ length: 11 }, (_, index) => index));
    expect(cards.at(-1)?.stageIndex).toBe(10);
  });

  it('does not silently reuse another poem poster when a title is missing', () => {
    expect(() => buildTimelineRailCards({})).toThrow('送杜少府之任蜀州');
  });

  it('normalizes wheel line and page deltas before applying timeline distance', () => {
    expect(normalizeTimelineWheelDelta(3, 0, 800)).toBe(3);
    expect(normalizeTimelineWheelDelta(3, 1, 800)).toBe(48);
    expect(normalizeTimelineWheelDelta(1, 2, 800)).toBe(800);
  });

  it('makes the centered card crisp and the edge cards smaller and softer', () => {
    const center = getTimelineRailVisualState(5, 5);
    const near = getTimelineRailVisualState(4, 5);
    const edge = getTimelineRailVisualState(3, 5);

    expect(center).toMatchObject({ distance: 0, scale: 1, opacity: 1, blur: 0, isCenter: true });
    expect(near.scale).toBeLessThan(center.scale);
    expect(near.opacity).toBeLessThan(center.opacity);
    expect(near.blur).toBe(0.25);
    expect(edge.blur).toBe(0.55);
    expect(edge.blur).toBeGreaterThan(near.blur);
    expect(edge.isCenter).toBe(false);
  });
});
