import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PoetryCalendar } from './PoetryCalendar';
import { journalPoets } from './journalData';

afterEach(cleanup);

describe('有来源的全生涯热力图', () => {
  it.each(journalPoets)('一次显示$name的全部生涯，去掉范围筛选及模拟数据', poet => {
    render(<PoetryCalendar poet={poet} />);
    const [birth, death] = poet.dates.match(/\d{3}/g)!.map(Number);
    const grid = screen.getByRole('group', { name: `${poet.name}年度创作热力图` });
    expect(within(grid).getAllByRole('button')).toHaveLength(death - birth + 1);
    expect(within(grid).getByRole('button', { name: new RegExp(`^${birth}年：`) })).toBeVisible();
    expect(within(grid).getByRole('button', { name: new RegExp(`^${death}年：`) })).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/示例|示意|未系年作品目录待补充/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '搜韵系年' })).toHaveAttribute('href', expect.stringContaining('sou-yun.cn/PoemIndex.aspx?'));
  });

  it('区分资料缺失与零创作，选择年份可查看逐首来源', () => {
    render(<PoetryCalendar poet={journalPoets.find(poet => poet.id === 'li-bai')!} />);
    const birth = screen.getByRole('button', { name: /^701年：/ });
    expect(birth).toHaveAccessibleName('701年：未见系年记录');
    expect(birth).toHaveAttribute('data-level', 'unknown');
    fireEvent.click(screen.getByRole('button', { name: /^759年：/ }));
    const details = screen.getByTestId('chronology-year-records');
    expect(details).toHaveTextContent('759 年');
    fireEvent.click(within(details).getByRole('button'));
    expect(within(details).getByRole('link', { name: /早发白帝城|早發白帝城/ })).toHaveAttribute('href', expect.stringMatching(/Query.aspx\?type=poem1&id=\d+/));
  });

  it('键盘移动只改变年份，不隐藏其他年代', () => {
    render(<PoetryCalendar poet={journalPoets.find(poet => poet.id === 'li-bai')!} />);
    const grid = screen.getByRole('group', { name: '李白年度创作热力图' });
    const first = within(grid).getAllByRole('button').find(button => button.tabIndex === 0)!;
    fireEvent.keyDown(first, { key: 'End' });
    expect(screen.getByRole('button', { name: /^762年：/ })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(screen.getByRole('button', { name: /^701年：/ })).toHaveFocus();
    expect(within(grid).getAllByRole('button')).toHaveLength(62);
  });
});
