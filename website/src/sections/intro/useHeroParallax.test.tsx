import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHeroParallax } from './useHeroParallax';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(enabled = true) {
  const section = document.createElement('section');
  const figure = document.createElement('div');
  figure.dataset.heroDepth = 'figures';
  figure.style.transform = 'translate(8%, 6%)';
  section.append(figure);
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 1000, height: 600 } as DOMRect);
  const mediaListeners = new Set<() => void>();
  const media = { matches: enabled, addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn), removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn) };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  let time = 0;
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const onFrame = vi.fn();
  const hook = renderHook(() => useHeroParallax({ current: section }, onFrame));
  const settle = () => act(() => {
    for (let index = 0; index < 180 && frames.size; index += 1) {
      time += 16;
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach(fn => fn(time));
    }
  });
  return { section, figure, frames, onFrame, settle, media, mediaListeners, ...hook };
}

describe('首页鼠标视差', () => {
  it('连续100次鼠标事件只测量一次首页尺寸，避免事件频率驱动布局读取', () => {
    const { section, settle } = setup();
    vi.mocked(section.getBoundingClientRect).mockClear();
    for (let index = 0; index < 100; index += 1) {
      fireEvent(section, new MouseEvent('pointermove', { clientX: 700 + index, clientY: 400 }));
    }
    settle();
    expect(section.getBoundingClientRect).toHaveBeenCalledTimes(1);
  });

  it('根据首页内鼠标位置产生有界偏移，离开时归零并停止更新', () => {
    const { section, figure, settle, frames, onFrame } = setup();
    fireEvent(section, new MouseEvent('pointermove', { clientX: 1100, clientY: 700 }));
    settle();
    expect(figure.style.translate).toBe('-22px -14px');
    expect(figure.style.transform).toBe('translate(8%, 6%)');
    expect(section.style.getPropertyValue('--hero-parallax-x')).toBe('');
    expect(onFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    fireEvent(section, new MouseEvent('pointerleave'));
    settle();
    expect(figure.style.translate).toBe('0px 0px');
    expect(frames.size).toBe(0);
  });

  it('触屏、小屏或减少动态效果模式不启动视差', () => {
    const { section, figure, frames } = setup(false);
    fireEvent(section, new MouseEvent('pointermove', { clientX: 1100, clientY: 700 }));
    expect(frames.size).toBe(0);
    expect(figure.style.translate).toBe('0px 0px');
  });

  it('动态偏好改变时立即复位，并取消待执行帧', () => {
    const { section, figure, media, mediaListeners, settle, frames } = setup();
    fireEvent(section, new MouseEvent('pointermove', { clientX: 1100, clientY: 700 }));
    settle();
    act(() => { media.matches = false; mediaListeners.forEach(fn => fn()); });
    expect(figure.style.translate).toBe('0px 0px');
    expect(frames.size).toBe(0);
  });

  it('卸载时停止动画并移除监听', () => {
    const { section, frames, unmount, mediaListeners } = setup();
    fireEvent(section, new MouseEvent('pointermove', { clientX: 1100, clientY: 700 }));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(mediaListeners.size).toBe(0);
    fireEvent(section, new MouseEvent('pointermove', { clientX: 1100, clientY: 700 }));
    expect(frames.size).toBe(0);
  });
});
