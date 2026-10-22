import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tangPoemDataset } from '../data/adapters/tangPoem';
import { buildTimelineLayout } from '../lib/visualizations/timeline';
import { TangTimelineWheel } from './TangTimelineWheel';

describe('TangTimelineWheel', () => {
  it('renders periods and emits a period selection', () => {
    const onSelectPeriod = vi.fn();
    render(<TangTimelineWheel layout={buildTimelineLayout(tangPoemDataset.timeline)} onSelectPeriod={onSelectPeriod} />);

    expect(screen.getByRole('img', { name: '诗脉千年时间图谱' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '筛选盛唐，82首诗' }));
    expect(onSelectPeriod).toHaveBeenCalledWith('盛唐');
  });
});
