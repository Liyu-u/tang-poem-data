import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeChart } from './ThemeChart';
import { themeVerses } from './themeVerses';
import { layoutCornerVerses, layoutMiddleVerses, layoutVerses } from './verseLayout';
import { themeArtwork } from './themeArtwork';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('题材悬停诗句', () => {
  it('plays only the hovered sector, preserves one decoder and stops over the center', async () => {
    vi.useFakeTimers();
    const { container } = render(<ThemeChart />);
    for (const button of screen.getAllByRole('button')) {
      fireEvent.mouseEnter(button);
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(container.querySelectorAll('video')).toHaveLength(1);
      const clipId = button.querySelector('image')!.getAttribute('clip-path');
      expect(container.querySelector('.pj-theme-motion')!.parentElement).toHaveAttribute('clip-path', clipId);
      fireEvent.playing(container.querySelector('video')!);
      expect(container.querySelector('.pj-theme-motion')).toHaveClass('is-playing');
      fireEvent.mouseLeave(button);
      expect(container.querySelector('.pj-theme-motion')).not.toHaveClass('is-playing');
    }
  });
  it('fills all four diagonal gaps at staggered heights without overlapping existing lettering', () => {
    const space = { width: 650, height: 760, cx: 325, cy: 380, radius: 260 };
    const lines = themeVerses.war.lines;
    for (const seed of [1, 2, 3]) {
      const outer = layoutVerses(lines, space, seed);
      const middle = layoutMiddleVerses(lines.filter((_, index) => index % 2 === 0), space, outer, seed);
      const corners = layoutCornerVerses(lines.filter((_, index) => index % 2 === 1), space, [...outer, ...middle], seed);
      corners.forEach((a, index) => {
        expect(a.fontSize).toBeGreaterThan(0);
        expect(index % 2 ? a.x > space.cx : a.x < space.cx).toBe(true);
        expect(index < 2 ? a.y < 65 : a.y + a.height > space.height - 95).toBe(true);
        [...outer, ...middle, ...corners.slice(index + 1)].forEach(b => {
          if (b.fontSize) expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false);
        });
      });
    }
  });
  it('clips the six supplied illustrations to their matching segments and retains the borders', () => {
    render(<ThemeChart />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    Object.values(themeArtwork).forEach(art => {
      const image = buttons.map(button => button.querySelector('image')).find(image => image?.getAttribute('href') === art.src);
      expect(image).toBeDefined();
      expect(image).toHaveAttribute('x', String(art.x));
      expect(image).toHaveAttribute('width', String(art.width));
      expect(image).toHaveAttribute('height', String(art.height));
      expect(image?.getAttribute('clip-path')).toMatch(/^url\(#/);
      expect(image?.parentElement?.querySelector('.pj-theme-separator')).toBeInTheDocument();
    });
  });
  it('fills the middle left and right gaps without disturbing the surrounding verses', () => {
    const space = { width: 466, height: 493, cx: 233, cy: 246, radius: 198 };
    const lines = themeVerses.homesick.lines;
    for (const seed of [1, 137, 274]) {
      const outer = layoutVerses(lines, space, seed);
      const snapshot = JSON.stringify(outer);
      const middle = layoutMiddleVerses(lines.filter((_, index) => index % 2 === 0), space, outer, seed);
      expect(JSON.stringify(outer)).toBe(snapshot);
      expect(middle[0].fontSize).toBeGreaterThan(0);
      expect(middle[1].fontSize).toBeGreaterThan(0);
      expect(middle[0].x + middle[0].width / 2).toBeLessThan(space.cx - space.radius * .5);
      expect(middle[1].x + middle[1].width / 2).toBeGreaterThan(space.cx + space.radius * .5);
      middle.slice(0, 2).forEach(column => expect(Math.abs(column.y + column.height / 2 - space.cy)).toBeLessThan(space.radius * .3));
      middle.forEach((a, index) => [...outer, ...middle.slice(index + 1)].forEach(b => {
        if (a.fontSize && b.fontSize) expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false);
      }));
    }
  });
  it('provides eight verse columns for every theme and mutes the other segment labels', () => {
    render(<ThemeChart />);
    for (const verse of Object.values(themeVerses)) expect(verse.lines).toHaveLength(8);
    const target = screen.getByRole('button', { name: /^羁旅思乡，/ });
    fireEvent.focus(target);
    const columns = screen.getByLabelText('羁旅思乡题材诗句').querySelectorAll('.pj-verse-column:not(.pj-verse-middle):not(.pj-verse-corner)');
    expect(screen.getByLabelText('羁旅思乡题材诗句').querySelectorAll('.pj-verse-corner')).toHaveLength(4);
    expect(screen.getByLabelText('羁旅思乡题材诗句').querySelectorAll('.pj-verse-middle')).toHaveLength(4);
    expect(columns).toHaveLength(8);
    expect(columns[7]).toHaveClass('pj-verse-column--7');
    const letters = columns[0].querySelectorAll<HTMLElement>('span');
    expect(letters[1].style.getPropertyValue('--verse-delay')).toBe('220ms');
    expect(letters[4].style.getPropertyValue('--verse-delay')).toBe('880ms');
    for (const button of screen.getAllByRole('button').filter(button => button !== target)) {
      expect(button).toHaveClass('is-muted');
      expect(button.querySelector('.pj-donut-arc-label')).toBeInTheDocument();
    }
  });
  it('highlights immediately while waiting for a sustained hover before revealing verses', () => {
    vi.useFakeTimers();
    render(<ThemeChart />);
    const homesick = screen.getByRole('button', { name: /^羁旅思乡，/ });
    const farewell = screen.getByRole('button', { name: /^交游送别，/ });
    fireEvent.mouseEnter(homesick);
    expect(homesick).toHaveClass('is-highlighted');
    expect(farewell).toHaveClass('is-muted');
    expect(screen.queryByLabelText('羁旅思乡题材诗句')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(449); });
    expect(screen.queryByLabelText('交游送别题材诗句')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByLabelText('羁旅思乡题材诗句')).toBeInTheDocument();
    fireEvent.mouseEnter(farewell);
    expect(farewell).toHaveClass('is-highlighted');
    expect(homesick).toHaveClass('is-muted');
    expect(screen.getByLabelText('羁旅思乡题材诗句')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(449); });
    expect(screen.queryByLabelText('交游送别题材诗句')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByLabelText('交游送别题材诗句')).toBeInTheDocument();
  });
  it('raises the hovered segment and replaces the verse cleanly on rapid changes', () => {
    vi.useFakeTimers();
    render(<ThemeChart />);
    const homesick = screen.getByRole('button', { name: /^羁旅思乡，/ });
    fireEvent.mouseEnter(homesick);
    act(() => { vi.advanceTimersByTime(470); });
    expect(homesick).toHaveClass('is-highlighted');
    expect(screen.getByLabelText('羁旅思乡题材诗句')).toHaveTextContent('举头望明月');
    const farewell = screen.getByRole('button', { name: /^交游送别，/ });
    fireEvent.mouseEnter(farewell);
    act(() => { vi.advanceTimersByTime(470); });
    expect(screen.queryByLabelText('羁旅思乡题材诗句')).not.toBeInTheDocument();
    expect(screen.getByLabelText('交游送别题材诗句')).toHaveTextContent('海内存知己');
    fireEvent.mouseLeave(screen.getByRole('article', { name: '唐诗魅力' }));
    act(() => { vi.advanceTimersByTime(470); });
    expect(farewell).not.toHaveClass('is-highlighted');
    expect(screen.queryByLabelText('交游送别题材诗句')).not.toBeInTheDocument();
  });
  it('supports keyboard focus and keeps tap selection until toggled off', () => {
    render(<ThemeChart />);
    const target = screen.getByRole('button', { name: /^羁旅思乡，/ });
    fireEvent.focus(target);
    expect(target).toHaveClass('is-highlighted');
    fireEvent.blur(target);
    fireEvent.click(target);
    expect(target).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('羁旅思乡题材诗句')).toBeInTheDocument();
    fireEvent.click(target);
    expect(target).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText('羁旅思乡题材诗句')).not.toBeInTheDocument();
  });
  it('preserves the keyboard order when focusing a segment', () => {
    render(<ThemeChart />);
    const names = screen.getAllByRole('button').map(button => button.getAttribute('aria-label'));
    fireEvent.focus(screen.getAllByRole('button')[0]);
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(names);
  });
  it('restarts letter reveal when returning to the same theme', () => {
    vi.useFakeTimers();
    render(<ThemeChart />);
    const target = screen.getByRole('button', { name: /^羁旅思乡，/ });
    fireEvent.mouseEnter(target);
    act(() => { vi.advanceTimersByTime(470); });
    const firstLetter = screen.getByLabelText('羁旅思乡题材诗句').querySelector('.pj-verse-column span');
    fireEvent.mouseLeave(screen.getByRole('article', { name: '唐诗魅力' }));
    fireEvent.mouseEnter(target);
    act(() => { vi.advanceTimersByTime(470); });
    expect(screen.getByLabelText('羁旅思乡题材诗句').querySelector('.pj-verse-column span')).not.toBe(firstLetter);
  });
  it('preserves outgoing letters until the fade finishes during rapid switches', () => {
    vi.useFakeTimers();
    render(<ThemeChart />);
    fireEvent.focus(screen.getByRole('button', { name: /^羁旅思乡，/ }));
    const first = screen.getByLabelText('羁旅思乡题材诗句');
    const letter = first.querySelector('.pj-verse-column span');
    fireEvent.focus(screen.getByRole('button', { name: /^边塞，/ }));
    expect(first).toBeInTheDocument();
    expect(first).toHaveClass('is-leaving');
    expect(first.querySelector('.pj-verse-column span')).toBe(letter);
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.focus(screen.getByRole('button', { name: /^羁旅思乡，/ }));
    expect(screen.getByLabelText('羁旅思乡题材诗句')).not.toBe(first);
    act(() => { vi.advanceTimersByTime(400); });
    expect(first).not.toBeInTheDocument();
    expect(screen.getByLabelText('羁旅思乡题材诗句')).toBeInTheDocument();
  });
  it('adapts placement to the ring, varies each reveal, and prevents overlapping columns', () => {
    for (const [width, height, radius] of [[466, 493, 198], [650, 760, 260], [320, 350, 132]]) {
      const space = { width, height, cx: width / 2, cy: height / 2, radius };
      const lines = themeVerses.war.lines;
      const first = layoutVerses(lines, space, 1);
      expect(first).not.toEqual(layoutVerses(lines, space, 2));
      expect(first).not.toEqual(layoutVerses(lines, { ...space, cx: space.cx + 50 }, 1));
      first.forEach((a, index) => {
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.y + a.height).toBeLessThanOrEqual(height);
        expect(a.x + a.width).toBeLessThanOrEqual(width);
        first.slice(index + 1).forEach(b => {
          if (a.fontSize && b.fontSize) expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false);
        });
      });
      expect(first.reduce((sum, placement) => sum + placement.visible, 0)).toBeGreaterThan(lines.join('').length / 2);
    }
  });
});

