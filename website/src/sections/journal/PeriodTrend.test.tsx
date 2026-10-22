import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PeriodTrend } from './PeriodTrend';
import { journalTimelinePoets } from './journalData';
import { poetRecitations } from './poetRecitations';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('provides five distinct sourced verses for every poet on the curve', () => {
  for (const poet of journalTimelinePoets) {
    const verses = poetRecitations[poet.id];
    expect(verses).toHaveLength(5);
    expect(new Set(verses.map(verse => verse.text)).size).toBe(5);
    expect(verses.every(verse => verse.title && verse.source.startsWith('https://'))).toBe(true);
  }
});

it('recites one verse per visit, avoids immediate repeats, and dismisses on leave or Escape', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(<PeriodTrend selectedId="li-bai" onSelect={() => {}} />);
  const poet = screen.getByRole('button', { name: '查看时期代表诗人李白' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.mouseEnter(poet);
  const first = screen.getByRole('tooltip').textContent;
  expect(first).toBe('天生我材必有用千金散尽还复来');
  expect(first).not.toMatch(/[，。？！《》]/);
  expect(first).not.toContain('将进酒');
  const columns = screen.getByRole('tooltip').querySelectorAll('p > span');
  expect(columns).toHaveLength(2);
  expect(columns[0]).toHaveTextContent('天生我材必有用');
  expect(columns[1]).toHaveTextContent('千金散尽还复来');
  expect(Number.parseFloat(screen.getByRole('tooltip').style.height)).toBeGreaterThanOrEqual(30);
  fireEvent.mouseMove(poet);
  expect(screen.getByRole('tooltip').textContent).toBe(first);
  fireEvent.mouseLeave(poet);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.focus(poet);
  expect(screen.getByRole('tooltip').textContent).not.toBe(first);
  fireEvent.keyDown(poet, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.focus(screen.getByRole('button', { name: '查看时期代表诗人韦庄' }));
  expect(screen.getByRole('tooltip')).toHaveAccessibleName('韦庄吟诗');
  fireEvent.blur(screen.getByRole('button', { name: '查看时期代表诗人韦庄' }));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});


it('anchors recital columns around the hovered poet rather than the previous poet', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(<PeriodTrend selectedId="li-bai" onSelect={() => {}} />);
  const poet = screen.getByRole('button', { name: '查看时期代表诗人李白' });
  fireEvent.mouseEnter(poet);
  const tooltip = screen.getByRole('tooltip');
  const center = parseFloat(tooltip.style.left) + parseFloat(tooltip.style.width) / 2;
  expect(center).toBeCloseTo(parseFloat(poet.style.left), 0);
  expect(tooltip.closest('.pj-trend-plot')).toBeNull();
});


it('keeps the three goose characters in one vertical column', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(<PeriodTrend selectedId="li-bai" onSelect={() => {}} />);
  fireEvent.mouseEnter(screen.getByRole('button', { name: '查看时期代表诗人骆宾王' }));
  const columns = screen.getByRole('tooltip').querySelectorAll('p > span');
  expect(columns).toHaveLength(2);
  expect(columns[0]).toHaveTextContent('鹅鹅鹅');
  expect(columns[1]).toHaveTextContent('曲项向天歌');
});
