import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimelineBookend } from './TimelineBookend';
import { timelineBookends } from '../data/timelineBookends';

afterEach(cleanup);
describe('bookend composition', () => {
  it('keeps the full prologue manuscript, date and entry action together', () => {
    render(<TimelineBookend kind="prologue" onPrimary={() => {}} onDirectory={() => {}} />);
    expect(screen.getByText('序章 · 公元618年')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '大唐初启 万千诗声将起' })).toBeInTheDocument();
    for (const paragraph of timelineBookends.prologue.paragraphs) {
      expect(screen.getByLabelText('序章导语')).toHaveTextContent(paragraph.replace(/\n/g, ' '));
    }
    expect(screen.getByRole('button', { name: '循诗入唐 →' })).toBeInTheDocument();
  });
  it('keeps all epilogue prose intact and leaves its actions for the below-axis area', () => {
    render(<TimelineBookend kind="epilogue" onPrimary={() => {}} onDirectory={() => {}} />);
    expect(screen.getByText('尾声 · 公元907年')).toBeInTheDocument();
    for (const paragraph of timelineBookends.epilogue.paragraphs) {
      expect(screen.getByLabelText('尾声导语')).toHaveTextContent(paragraph.replace(/\n/g, ' '));
    }
    expect(screen.queryByRole('button')).toBeNull();
  });
});
