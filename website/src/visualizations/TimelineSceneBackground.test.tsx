import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineSceneBackground } from './TimelineSceneBackground';
import { timelineScenes } from '../data/timelineScenes';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const base = () => document.querySelector<HTMLImageElement>('img[data-scene-base]')!;
const target = () => document.querySelector<HTMLImageElement>('img[data-scene-target]')!;
const background = () => screen.getByTestId('timeline-scene-background');

async function startFade(image = target()) {
  await act(async () => { fireEvent.load(image); });
  act(() => vi.advanceTimersByTime(40));
}

function finishFade(image = target(), propertyName = 'opacity') {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  fireEvent(image, event);
}

describe('node-specific chapter backgrounds', () => {
  it('reuses the already loaded cover on reversal without requiring another load event', async () => {
    const { rerender } = render(<TimelineSceneBackground index={-1} />);
    const cover = base();
    Object.defineProperties(cover, { complete: { value: true }, naturalWidth: { value: 1200 } });
    rerender(<TimelineSceneBackground index={0} />);
    await startFade();
    rerender(<TimelineSceneBackground index={-1} />);
    await act(async () => { finishFade(); });
    expect(target()).toBe(cover);
    act(() => vi.advanceTimersByTime(40));
    expect(background()).toHaveAttribute('data-transition-phase', 'fading');
    finishFade();
    expect(base()).toBe(cover);
    expect(target()).toBeNull();
  });

  it('settles a fade even when the browser drops transitionend', async () => {
    const { rerender } = render(<TimelineSceneBackground index={-1} />);
    rerender(<TimelineSceneBackground index={0} />);
    await startFade();
    act(() => vi.advanceTimersByTime(1200));
    expect(background()).toHaveAttribute('data-transition-phase', 'idle');
    expect(base()).toHaveAttribute('src', timelineScenes[1].image);
  });
  it('maps thirteen distinct backgrounds in manuscript order without altering poem artwork', () => {
    expect(timelineScenes.map(scene => scene.id)).toEqual(['prologue', ...Array.from({ length: 11 }, (_, index) => `work-${String(index + 1).padStart(2, '0')}`), 'epilogue']);
    expect(new Set(timelineScenes.map(scene => scene.image)).size).toBe(13);
    const { rerender } = render(<TimelineSceneBackground index={-1} />);
    expect(background()).toHaveAttribute('data-scene', 'prologue');
    for (let index = 0; index < 11; index++) {
      rerender(<TimelineSceneBackground index={index} />);
      expect(target()).toHaveAttribute('src', timelineScenes[index + 1].image);
    }
    rerender(<TimelineSceneBackground index={11} />);
    expect(background()).toHaveAttribute('data-scene', 'epilogue');
  });

  it('retains the base until opacity transitionend and promotes the same decoded image', async () => {
    const { rerender } = render(<TimelineSceneBackground index={-1} />);
    rerender(<TimelineSceneBackground index={0} />);
    const incoming = target();
    await startFade(incoming);
    expect(incoming).toHaveClass('is-ready');
    act(() => vi.advanceTimersByTime(900));
    expect(base()).toHaveAttribute('src', timelineScenes[0].image);
    finishFade(incoming, 'transform');
    expect(base()).toHaveAttribute('src', timelineScenes[0].image);
    finishFade(incoming);
    expect(base()).toBe(incoming);
    expect(background().querySelectorAll('img')).toHaveLength(1);
  });

  it('does not reveal the older base when another node is selected during a fade', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    const fading = target();
    await startFade(fading);
    act(() => vi.advanceTimersByTime(400));
    rerender(<TimelineSceneBackground index={2} />);
    expect(fading.isConnected).toBe(true);
    expect(target()).toBe(fading);
    expect(fading).toHaveClass('is-ready');
    expect(background().querySelectorAll('img')).toHaveLength(2);
    finishFade(fading);
    expect(base()).toBe(fading);
    expect(target()).toHaveAttribute('src', timelineScenes[3].image);
    await startFade();
    finishFade();
    expect(base()).toHaveAttribute('src', timelineScenes[3].image);
    expect(background().querySelectorAll('img')).toHaveLength(1);
  });

  it('coalesces rapid requests to the latest scene instead of displaying obsolete queued scenes', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    await startFade();
    const fading = target();
    for (const index of [2, 3, 7, 4, 9]) rerender(<TimelineSceneBackground index={index} />);
    expect(target()).toBe(fading);
    expect(background().querySelectorAll('img')).toHaveLength(2);
    finishFade(fading);
    expect(base()).toBe(fading);
    expect(target()).toHaveAttribute('src', timelineScenes[10].image);
  });

  it('preserves the visible layer on a quick reversal back to the base', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    await startFade();
    const fading = target();
    rerender(<TimelineSceneBackground index={0} />);
    expect(target()).toBe(fading);
    finishFade(fading);
    expect(base()).toBe(fading);
    expect(target()).toHaveAttribute('src', timelineScenes[1].image);
    await startFade();
    finishFade();
    expect(base()).toHaveAttribute('src', timelineScenes[1].image);
  });

  it('waits for decoding and a painted transparent frame before starting even a cached image', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    let resolveDecode!: () => void;
    Object.defineProperty(target(), 'decode', { value: () => new Promise<void>(resolve => { resolveDecode = resolve; }) });
    fireEvent.load(target());
    act(() => vi.advanceTimersByTime(2000));
    expect(target()).not.toHaveClass('is-ready');
    await act(async () => { resolveDecode(); });
    expect(target()).not.toHaveClass('is-ready');
    act(() => vi.advanceTimersByTime(17));
    expect(target()).not.toHaveClass('is-ready');
    act(() => vi.advanceTimersByTime(17));
    expect(target()).toHaveClass('is-ready');
  });

  it('ignores stale decode completion even if the user returns to the same requested scene', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    let resolveDecode!: () => void;
    const obsolete = target();
    Object.defineProperty(obsolete, 'decode', { value: () => new Promise<void>(resolve => { resolveDecode = resolve; }) });
    fireEvent.load(obsolete);
    rerender(<TimelineSceneBackground index={2} />);
    rerender(<TimelineSceneBackground index={1} />);
    expect(target()).not.toBe(obsolete);
    await act(async () => { resolveDecode(); });
    act(() => vi.advanceTimersByTime(2000));
    expect(background()).toHaveAttribute('data-transition-phase', 'loading');
    expect(target()).not.toHaveClass('is-ready');
    await startFade();
    expect(target()).toHaveClass('is-ready');
  });

  it('can supersede or cancel an invisible loading request without exposing any other scene', () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    const original = base();
    rerender(<TimelineSceneBackground index={1} />);
    rerender(<TimelineSceneBackground index={5} />);
    expect(base()).toBe(original);
    expect(target()).toHaveAttribute('src', timelineScenes[6].image);
    rerender(<TimelineSceneBackground index={0} />);
    expect(base()).toBe(original);
    expect(target()).toBeNull();
  });

  it('keeps the last complete scene on network or decode failures and recovers on navigation', async () => {
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    const original = base();
    rerender(<TimelineSceneBackground index={1} />);
    fireEvent.error(target());
    expect(target()).toHaveClass('is-failed');
    expect(base()).toBe(original);
    rerender(<TimelineSceneBackground index={2} />);
    Object.defineProperty(target(), 'decode', { value: () => Promise.reject(new Error('decode failed')) });
    await act(async () => { fireEvent.load(target()); });
    expect(target()).toHaveClass('is-failed');
    expect(base()).toBe(original);
    rerender(<TimelineSceneBackground index={3} />);
    await startFade();
    finishFade();
    expect(base()).toHaveAttribute('src', timelineScenes[4].image);
  });

  it('settles decoded scenes without waiting for transitionend under reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { rerender } = render(<TimelineSceneBackground index={0} />);
    rerender(<TimelineSceneBackground index={1} />);
    const incoming = target();
    await startFade(incoming);
    expect(base()).toBe(incoming);
    expect(target()).toBeNull();
  });
});
