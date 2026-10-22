import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AcknowledgementsScroll } from './AcknowledgementsScroll';
import { scrollPoems } from './scrollPoems';

afterEach(cleanup);
describe('鸣谢长卷', () => {
  it('uses a dedicated horizontal calligraphy image and separate full-height background rail', () => {
    const view = render(<MemoryRouter><AcknowledgementsScroll /></MemoryRouter>);
    expect(screen.getByRole('img', { name: '诗映大唐' })).toBeInTheDocument();
    expect(view.container.querySelector('.tang-credits__stage > .tang-credits__art')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.tang-credits__painting')).toHaveLength(3);
  });
  it('moves the background by its own width rather than stretching it to the poetry rail', () => {
    const view = render(<MemoryRouter><AcknowledgementsScroll /></MemoryRouter>);
    const region = screen.getByRole('region', { name: '大唐诗歌横向长卷' });
    const rail = view.container.querySelector<HTMLElement>('.tang-credits__art')!;
    Object.defineProperty(region, 'clientWidth', { value: 1000 });
    Object.defineProperty(region, 'scrollWidth', { value: 16000 });
    Object.defineProperty(rail, 'scrollWidth', { value: 6000 });
    fireEvent.keyDown(region, { key: 'End' });
    expect(rail.style.transform).toBe('translate3d(-5000px,0,0)');
    fireEvent.keyDown(region, { key: 'Home' });
    expect(rail.style.transform).toBe('translate3d(0px,0,0)');
  });
  it('includes forty-two poets and forty-four works with correct signature pairings', () => {
    expect(scrollPoems).toHaveLength(44);
    expect(new Set(scrollPoems.map(poem => poem[0])).size).toBe(42);
    expect(scrollPoems.find(poem => poem[1] === '春江花月夜')?.[0]).toBe('张若虚');
    expect(scrollPoems.find(poem => poem[1] === '赋得江边柳')?.[0]).toBe('鱼玄机');
  });
  it('pauses on seeking and supports replay from the beginning', () => {
    render(<MemoryRouter><AcknowledgementsScroll /></MemoryRouter>);
    fireEvent.keyDown(screen.getByRole('region', { name: '大唐诗歌横向长卷' }), { key: 'End' });
    expect(screen.getByRole('button', { name: '继续展卷' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '重展此卷' }));
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暂停展卷' })).toBeVisible();
    expect(screen.getByRole('heading', { name: /山河有尽，\s*诗意无穷。/ })).toBeInTheDocument();
  });
  it('starts paused when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    render(<MemoryRouter><AcknowledgementsScroll /></MemoryRouter>);
    expect(screen.getByRole('button', { name: '继续展卷' })).toBeVisible();
    vi.unstubAllGlobals();
  });
  it('waits for artwork and finishes at 1.8 times the original speed', () => {
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal('requestAnimationFrame', vi.fn((next: FrameRequestCallback) => { callback = next; return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const view = render(<MemoryRouter><AcknowledgementsScroll /></MemoryRouter>);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    view.container.querySelectorAll('img').forEach(img => fireEvent.load(img));
    act(() => callback(0));
    for (let time = 100; time <= 60_100; time += 100) act(() => callback(time));
    expect(screen.getByRole('button', { name: '暂停展卷' })).toBeVisible();
    for (let time = 60_200; time <= 120_100; time += 100) act(() => callback(time));
    expect(screen.getByRole('button', { name: '暂停展卷' })).toBeVisible();
    for (let time = 120_200; time <= 166_600; time += 100) act(() => callback(time));
    expect(screen.getByRole('button', { name: '暂停展卷' })).toBeVisible();
    for (let time = 166_700; time <= 166_800; time += 100) act(() => callback(time));
    expect(screen.getByRole('button', { name: '继续展卷' })).toBeVisible();
    vi.unstubAllGlobals();
  });
});
