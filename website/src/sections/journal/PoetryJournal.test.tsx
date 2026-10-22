import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PoetryJournal } from './PoetryJournal';
import { journalPoets } from './journalData';
import { getJournalDays } from './journalCalendar';
import { getThemeShares } from './journalCharts';

afterEach(cleanup);

describe('诗词日志', () => {
  it('allows keyboard focus inside the biography reading area', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('tab', { name: '生平资料' }));
    const biography = screen.getByRole('tabpanel', { name: '生平资料' });
    expect(biography).toHaveAttribute('tabindex', '0');
    biography.focus();
    expect(biography).toHaveFocus();
    expect(within(biography).getByRole('heading', { name: '交游关系' })).toBeInTheDocument();
  });
  it('uses color artwork for all five ranking and profile portraits', () => {
    render(<PoetryJournal />);
    for (const poet of journalPoets) {
      const row = screen.getByRole('button', { name: new RegExp('查看' + poet.name) });
      const image = within(row).getByRole('img');
      expect(image.closest('.pj-portrait')).not.toHaveClass('pj-portrait--monochrome');
      expect(image).toHaveAttribute('src', poet.portrait);
      fireEvent.click(row);
      const profile = within(screen.getByRole('tabpanel', { name: '概览' })).getByRole('img');
      expect(profile).toHaveAttribute('src', poet.portrait);
      expect(profile.closest('.pj-portrait')).not.toHaveClass('pj-portrait--monochrome');
    }
  });
  it('keeps the selected poet portrait synchronized across all profile tabs', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('button', { name: /查看刘禹锡/ }));
    for (const name of ['概览', '生平资料', '代表作品']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      const panel = screen.getByRole('tabpanel', { name });
      expect(within(panel).getByRole('img', { name: '刘禹锡画像（艺术示意）' })).toHaveAttribute('src', expect.stringContaining(encodeURIComponent('刘禹锡')));
    }
    fireEvent.click(screen.getByRole('button', { name: /查看元稹/ }));
    expect(within(screen.getByRole('tabpanel', { name: '概览' })).getByRole('img', { name: '元稹画像（艺术示意）' })).toHaveAttribute('src', expect.stringContaining(encodeURIComponent('元稹')));
  });
  it('prioritizes the chronology and opens full works from compact title links', () => {
    render(<PoetryJournal />);
    const overview = screen.getByRole('tabpanel', { name: '概览' });
    expect(within(overview).queryByText('君不见，黄河之水天上来，奔流到海不复回。')).not.toBeInTheDocument();
    expect(within(overview).queryByText('主要成就')).not.toBeInTheDocument();
    expect(within(overview).getByRole('group', { name: '李白年度创作热力图' })).toBeVisible();
    fireEvent.click(within(overview).getByRole('button', { name: '将进酒' }));
    expect(screen.getByRole('tab', { name: '代表作品' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/君不见黄河之水天上来/)).toBeVisible();
  });
  it('selects a ranked poet and updates the profile without changing the chapter', () => {
    render(<PoetryJournal />);
    expect(screen.getByRole('heading', { name: '李白' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /查看杜甫/ }));
    expect(screen.getByRole('heading', { name: '杜甫' })).toBeVisible();
    expect(screen.getByRole('button', { name: /查看杜甫/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('春望')).toBeVisible();
  });

  it('uses the five-poet total as the percentage denominator', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('button', { name: '占比' }));
    const total = journalPoets.reduce((sum, poet) => sum + poet.count, 0);
    const row = screen.getByRole('button', { name: /查看白居易/ });
    expect(within(row).getByText(`${(journalPoets[0].count / total * 100).toFixed(1)}%`)).toBeVisible();
    expect(row).toHaveAccessibleName(`查看白居易，${(journalPoets[0].count / total * 100).toFixed(1)}%`);
    expect(screen.getByText('占比以榜单五位诗人作品总量为分母')).toBeVisible();
  });

  it('keeps the full lifetime visible when selecting a year', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('button', { name: /^744年：/ }));
    expect(screen.getByTestId('chronology-year-records')).toHaveTextContent('744 年');
    expect(screen.queryByRole('combobox', { name: '年谱范围' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: '李白年度创作热力图' })).getAllByRole('button')).toHaveLength(62);
    fireEvent.click(screen.getByRole('button', { name: /将进酒/ }));
    expect(screen.getByText(/君不见黄河之水天上来/)).toBeVisible();
  });

  it('keeps one annual tab stop and moves between years and decades with arrow keys', () => {
    render(<PoetryJournal />);
    const first = screen.getByRole('button', { name: /^744年：/ });
    fireEvent.click(first);
    expect(first).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const nextWeek = screen.getByRole('button', { name: /^745年：/ });
    expect(nextWeek).toHaveFocus();
    expect(nextWeek).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(nextWeek, { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: /^735年：/ })).toHaveFocus();
  });

  it('keeps uncertain works separate and pending data explicit', () => {
    render(<PoetryJournal />);
    expect(screen.queryByText('据来源所标年份汇总，非逐年创作总量；空格不代表零创作。')).not.toBeInTheDocument();
    expect(screen.queryByText('统计口径与未标年目录')).not.toBeInTheDocument();
    expect(screen.queryByText(/示例数据/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /查看元稹/ }));
    expect(screen.getByRole('group', { name: '元稹年度创作热力图' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '查看时期代表诗人王勃' }));
    expect(screen.getByRole('heading', { name: '元稹' })).toBeVisible();
    expect(screen.queryByRole('group', { name: '王勃年度创作热力图' })).not.toBeInTheDocument();
  });

  it('provides a biography area and resets the profile tab when selecting another poet', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('tab', { name: '生平资料' }));
    const details = screen.getByRole('tabpanel', { name: '生平资料' });
    expect(within(details).getByRole('heading', { name: '人物简介' })).toBeVisible();
    expect(within(details).getByRole('heading', { name: '主要经历' })).toBeVisible();
    expect(within(details).getByRole('heading', { name: '交游关系' })).toBeVisible();
    expect(within(details).getByText(/李白（701—762），唐代诗人/)).toBeVisible();
    expect(within(details).getByRole('link', { name: /李白传/ })).toHaveAttribute('href', expect.stringContaining('新唐書/卷202'));
    fireEvent.click(screen.getByRole('button', { name: /查看杜甫/ }));
    expect(screen.getByRole('tab', { name: '概览' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: '杜甫' })).toBeVisible();
  });

  it('shows the theme donut and keeps trend poet selection independent of the profile', () => {
    render(<PoetryJournal />);
    expect(screen.getByRole('heading', { name: '唐诗魅力' })).toBeVisible();
    const chart = screen.getByRole('group', { name: '唐诗题材分布，共57612首，前五类及其他' });
    expect(chart).toBeInTheDocument();
    expect(within(chart).getAllByRole('button')).toHaveLength(6);
    expect(within(chart).getByRole('button', { name: '山水田园，14225首，24.69%' })).toBeVisible();
    expect(within(chart).getByRole('button', { name: '其他，11365首，19.73%' })).toBeVisible();
    expect(within(chart).getByRole('button', { name: '交游送别，12733首，22.10%' })).toBeVisible();
    expect(within(chart).getByRole('button', { name: '咏物与托物言志，8066首，14.00%' })).toBeVisible();
    expect(within(chart).getByRole('button', { name: '边塞，4092首，7.10%' })).toBeVisible();
    expect(within(chart).getByText('57,612首')).toBeVisible();
    expect(chart.querySelectorAll('textPath')).toHaveLength(6);
    const homesick = within(chart).getByRole('button', { name: '羁旅思乡，7131首，12.38%' });
    fireEvent.click(homesick);
    expect(homesick).toHaveAttribute('aria-pressed', 'true');
    expect(chart.querySelectorAll('.is-muted')).toHaveLength(5);
    fireEvent.keyDown(homesick, { key: 'Enter' });
    expect(homesick).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'TCCP题材数量与占比' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TCCP公开数据' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '唐诗流变' })).toBeVisible();
    const trend = screen.getByRole('group', { name: '全唐诗四期收录作品数量折线图，据林庚1958年统计' });
    expect(trend.querySelectorAll('circle')).toHaveLength(4);
    expect(within(trend).getByText('19,020')).toBeVisible();
    expect(trend.querySelector('.pj-period-line')?.getAttribute('d')).toMatch(/C/);
    expect(screen.queryByLabelText('查看时期数量')).not.toBeInTheDocument();
    fireEvent.focus(screen.getByRole('button', { name: '查看时期代表诗人白居易' }));
    expect(screen.getByText('中唐 · 约19,020首')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '查看时期代表诗人王勃' }));
    expect(screen.getByRole('heading', { name: '李白' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '王勃' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /查看杜甫，/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看时期代表诗人白居易' }));
    expect(screen.getByRole('heading', { name: '杜甫' })).toBeVisible();
    expect(screen.getByRole('button', { name: /查看杜甫，/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes the duplicate chronology tab and preserves keyboard navigation', () => {
    render(<PoetryJournal />);
    fireEvent.click(screen.getByRole('tab', { name: '代表作品' }));
    expect(screen.getByRole('tabpanel', { name: '代表作品' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('tab', { name: '代表作品' }), { key: 'ArrowRight' });
    expect(screen.queryByRole('tab', { name: '创作年谱' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '概览' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: '概览' })).toBeVisible();
  });
});

describe('主题比例', () => {
  it('calculates shares from counts and handles an empty total', () => {
    expect(getThemeShares([{ value: 30 }, { value: 70 }, { value: 10 }]).reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100);
    expect(getThemeShares([{ value: 0 }])[0].share).toBe(0);
  });
});

describe('日志日期', () => {
  it('includes leap day and keeps unknown data distinct from zero', () => {
    const days = getJournalDays(2024, { '2024-02-29': 2, '2024-03-01': 0 });
    expect(days).toHaveLength(366);
    expect(days.find(day => day.date === '2024-02-29')?.count).toBe(2);
    expect(days.find(day => day.date === '2024-03-01')?.count).toBe(0);
    expect(days[0].count).toBeUndefined();
    expect(getJournalDays(2025, {})).toHaveLength(365);
  });
});



