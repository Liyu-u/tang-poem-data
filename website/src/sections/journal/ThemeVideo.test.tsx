import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeVideo } from './ThemeVideo';
import { farewellVideoBounds } from './farewellVideo';

const bounds = { x: 24, y: -49, width: 153, height: 196 };
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers();
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('送别扇区视频', () => {
  it('registers the first frame to the matching image crop without stretching it', () => {
    // Registration belongs to the archived v2 illustration, not the new still.
    const scale = 175 / 468;
    const art = { x: 65 * scale, y: -130 * scale, width: 408 * scale, height: 522 * scale };
    const frame = farewellVideoBounds(art);
    expect(frame.width / frame.height).toBeCloseTo(1280 / 720, 8);
    expect(frame.x).toBeCloseTo(art.x, 0);
    expect(frame.y).toBeGreaterThan(art.y + art.height * .27);
    expect(frame.y + frame.height).toBeLessThan(art.y + art.height);
    // A person landmark at video (420, 280) lands at reference (133.69, 235.32).
    const x = frame.x + 420 / 1280 * frame.width;
    const y = frame.y + 280 / 720 * frame.height;
    const imageScale = art.width / 408;
    expect(x).toBeCloseTo(art.x + 133.690033 * imageScale, 4);
    expect(y).toBeCloseTo(art.y + 235.315907 * imageScale, 4);
  });
  it('loads only after sustained activation, clips to the original shape, and fades in after playing', async () => {
    const { container, rerender } = render(<svg><ThemeVideo active={false} clipId="farewell-mask" bounds={bounds} /></svg>);
    expect(container.querySelector('video')).toBeNull();
    rerender(<svg><ThemeVideo active clipId="farewell-mask" bounds={bounds} /></svg>);
    act(() => { vi.advanceTimersByTime(299); });
    expect(container.querySelector('video')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); });
    const video = container.querySelector('video')!;
    expect(play).toHaveBeenCalledOnce();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.controls).toBe(false);
    expect(container.querySelector('[clip-path]')).toHaveAttribute('clip-path', 'url(#farewell-mask)');
    expect(container.querySelector('foreignObject')).toHaveAttribute('width', '153');
    expect(container.querySelector('.pj-theme-video')).not.toHaveClass('is-playing');
    fireEvent.playing(video);
    expect(container.querySelector('.pj-theme-video')).toHaveClass('is-playing');
    video.currentTime = 3;
    rerender(<svg><ThemeVideo active={false} clipId="farewell-mask" bounds={bounds} /></svg>);
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector('.pj-theme-video')).not.toHaveClass('is-playing');
    rerender(<svg><ThemeVideo active clipId="farewell-mask" bounds={bounds} /></svg>);
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(video.currentTime).toBe(0);
  });
  it('cancels quick activation and keeps the still image on playback failure', async () => {
    const { container, rerender } = render(<svg><ThemeVideo active clipId="mask" bounds={bounds} /></svg>);
    act(() => { vi.advanceTimersByTime(150); });
    rerender(<svg><ThemeVideo active={false} clipId="mask" bounds={bounds} /></svg>);
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(play).not.toHaveBeenCalled();
    play.mockRejectedValueOnce(new Error('blocked'));
    rerender(<svg><ThemeVideo active clipId="mask" bounds={bounds} /></svg>);
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(container.querySelector('.pj-theme-video')).not.toHaveClass('is-playing');
    fireEvent.error(container.querySelector('video')!);
    expect(container.querySelector('.pj-theme-video')).not.toHaveClass('is-playing');
  });
  it('keeps a static image when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const { container } = render(<svg><ThemeVideo active clipId="mask" bounds={bounds} /></svg>);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(container.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });
  it('stops when navigating away', async () => {
    const { container } = render(<svg><ThemeVideo active clipId="mask" bounds={bounds} /></svg>);
    await act(async () => { vi.advanceTimersByTime(300); });
    fireEvent.playing(container.querySelector('video')!);
    act(() => { window.dispatchEvent(new Event('hashchange')); });
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector('.pj-theme-video')).not.toHaveClass('is-playing');
  });
});
