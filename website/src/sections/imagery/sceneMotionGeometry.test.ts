import { describe, expect, it } from 'vitest';
import { movePaintPoint, particlePose, type PaintLayer } from './sceneMotionGeometry';

const willow: PaintLayer = { id: 'willow', kind: 'bend', file: '', x: 110, y: 230, width: 180, height: 135, pivot: [185, 365], strength: 34, phase: 0 };
const pointer = { x: 780, y: 270, speed: 1, vx: 1, inside: true };

describe('independent painted subject motion', () => {
  it('keeps branch roots fixed while the painted tips bend visibly', () => {
    expect(movePaintPoint(willow, 185, 365, 2, 1, pointer)).toEqual({ x: 185, y: 365 });
    const tip = movePaintPoint(willow, 185, 235, 2, 1, pointer);
    expect(Math.abs(tip.x - 185)).toBeGreaterThan(8);
    expect(Math.abs(tip.x - 185)).toBeLessThan(70);
  });
  it('returns every original paint coordinate at zero activation', () => {
    for (const kind of ['bend', 'bird', 'cloud', 'mist', 'boat', 'reflection', 'bloom', 'water'] as const) {
      expect(movePaintPoint({ ...willow, kind }, 150, 250, 24, 0, pointer)).toEqual({ x: 150, y: 250 });
    }
  });
  it('keeps the boat and its reflection travelling together', () => {
    const boat = { ...willow, kind: 'boat' as const, pivot: [578, 860] as [number, number] };
    const reflection = { ...boat, kind: 'reflection' as const };
    const hull = movePaintPoint(boat, 578, 860, 3, 1, pointer);
    const mirror = movePaintPoint(reflection, 578, 880, 3, 1, pointer);
    expect(Math.abs(hull.x - mirror.x)).toBeLessThan(2);
    expect(Math.abs(hull.x - 578)).toBeGreaterThan(10);
  });
  it('bounds pointer overshoot and keeps spring gentler than a gust', () => {
    const gust = movePaintPoint(willow, 185, 235, 2, 1, { ...pointer, speed: 100, vx: 100 });
    const spring = movePaintPoint({ ...willow, strength: 11 }, 185, 235, 2, 1, pointer);
    expect(Number.isFinite(gust.x)).toBe(true);
    expect(Math.abs(gust.x - 185)).toBeLessThan(80);
    expect(Math.abs(spring.x - 185)).toBeLessThan(Math.abs(gust.x - 185));
  });
  it('emits original petals with staggered life cycles and no motion at rest', () => {
    const a = particlePose(0, 2, 1, pointer, '花');
    const b = particlePose(1, 2, 1, pointer, '花');
    expect(a.y).not.toBe(b.y);
    expect(a.alpha).toBeGreaterThan(0);
    expect(particlePose(0, 2, 0, pointer, '花').alpha).toBe(0);
  });
});
