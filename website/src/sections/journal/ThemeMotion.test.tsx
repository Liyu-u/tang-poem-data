import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeMotion } from './ThemeMotion';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const view = (theme: string | null, explicit = false) => <svg><ThemeMotion themeId={theme} clipId={theme ? `mask-${theme}` : null} explicit={explicit} /></svg>;

it('waits 100ms, shares one player, and restarts when the sector changes', async () => {
  const { container, rerender } = render(view(null));
  expect(container.querySelector('video')).toBeNull();
  rerender(view('war'));
  await act(async () => { vi.advanceTimersByTime(99); });
  expect(container.querySelector('video')).toBeNull();
  await act(async () => { vi.advanceTimersByTime(1); });
  const video = container.querySelector('video')!;
  expect(video).toBeTruthy();
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  fireEvent.playing(video);
  expect(container.querySelector('.pj-theme-motion')).toHaveClass('is-playing');
  expect(container.querySelector('[clip-path]')).toHaveAttribute('clip-path', 'url(#mask-war)');
  video.currentTime = 4;
  rerender(view('farewell'));
  expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
  await act(async () => { vi.advanceTimersByTime(100); });
  expect(container.querySelectorAll('video')).toHaveLength(1);
  expect(container.querySelector('video')).toBe(video);
  expect(video.currentTime).toBe(0);
  expect(container.querySelector('[clip-path]')).toHaveAttribute('clip-path', 'url(#mask-farewell)');
  rerender(view(null));
  fireEvent.playing(video);
  expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});

it('cancels transient hover and retains the still on rejection or media error', async () => {
  const { container, rerender } = render(view('war'));
  act(() => { vi.advanceTimersByTime(50); });
  rerender(view(null));
  await act(async () => { vi.advanceTimersByTime(200); });
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('blocked'));
  rerender(view('objects'));
  await act(async () => { vi.advanceTimersByTime(100); });
  const video = container.querySelector('video')!;
  fireEvent.playing(video);
  expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
  fireEvent.error(video);
  expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
});

it('honors reduced motion for hover but allows an explicit click', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const { container, rerender } = render(view('war'));
  await act(async () => { vi.advanceTimersByTime(100); });
  expect(container.querySelector('video')).toBeNull();
  rerender(view('war', true));
  await act(async () => { vi.advanceTimersByTime(100); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
});

it('stops on visibility loss and does not restart without a new activation', async () => {
  const { container } = render(view('war'));
  await act(async () => { vi.advanceTimersByTime(100); });
  fireEvent.playing(container.querySelector('video')!);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
});

it('observes the HTML chart container rather than clipped SVG geometry', () => {
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    observe = observe;
    disconnect = vi.fn();
  });
  const { container } = render(view(null));
  expect(observe).toHaveBeenCalledWith(container);
});

it('plays the borderland horses at 1.5x and all other sectors at 1.2x', async () => {
  const { container, rerender } = render(view('war'));
  await act(async () => { vi.advanceTimersByTime(100); });
  const video = container.querySelector('video')!;
  expect(video.playbackRate).toBe(1.5);
  for (const theme of ['farewell', 'objects', 'homesick', 'other', 'landscape-pastoral']) {
    rerender(view(theme));
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(video.playbackRate).toBe(1.2);
  }
});

it('retains the last sector mask throughout fade-out instead of exposing the rectangular video', async () => {
  const { container, rerender } = render(view('war'));
  await act(async () => { vi.advanceTimersByTime(100); });
  fireEvent.playing(container.querySelector('video')!);
  rerender(view(null));
  const layer = container.querySelector('.pj-theme-motion')!;
  expect(layer).not.toHaveClass('is-playing');
  expect(layer.parentElement).toHaveAttribute('clip-path', 'url(#mask-war)');
  act(() => { vi.advanceTimersByTime(150); });
  expect(layer.parentElement).toHaveAttribute('clip-path', 'url(#mask-war)');
  rerender(view('objects'));
  expect(layer.parentElement).toHaveAttribute('clip-path', 'url(#mask-objects)');
  rerender(view(null));
  expect(layer.parentElement).toHaveAttribute('clip-path', 'url(#mask-objects)');
});
