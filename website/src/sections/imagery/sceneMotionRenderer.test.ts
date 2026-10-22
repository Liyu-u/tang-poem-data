import { describe, expect, it } from 'vitest';
import { artworkPoint } from './sceneMotionRenderer';

describe('painting pointer coordinates', () => {
  it('accounts for contain letterboxing on wide and tall canvases', () => {
    expect(artworkPoint(500, 500, { left: 0, top: 0, width: 1000, height: 1000 })).toEqual({ x: 594, y: 662 });
    expect(artworkPoint(250, 500, { left: 0, top: 0, width: 500, height: 1000 })).toEqual({ x: 594, y: 662 });
  });
  it('clamps points outside the painting and handles a hidden canvas', () => {
    expect(artworkPoint(-100, -100, { left: 0, top: 0, width: 1188, height: 1324 })).toEqual({ x: 0, y: 0 });
    expect(artworkPoint(1, 1, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 594, y: 662 });
  });
});
