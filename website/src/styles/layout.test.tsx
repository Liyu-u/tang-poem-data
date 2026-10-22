import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../app/App';

describe('editorial scroll shell', () => {
  afterEach(cleanup);
  it('exposes the labelled Wenjing long-scroll main landmark', () => {
    render(<App />);
    expect(screen.getByRole('main', { name: '诗映大唐数字长卷' })).toBeVisible();
    expect(screen.getByTestId('wenjing-shell')).toHaveAttribute('data-visual-language', 'oriental-editorial');
  });
  it('keeps the timeline heading accessible when displaying generated calligraphy', () => {
    render(<App />);
    const title = screen.getByRole('heading', { name: '诗脉千年', level: 2 });
    expect(within(title).getByRole('img', { hidden: true })).toHaveAttribute('src', expect.stringContaining('timeline-title-calligraphy.png'));
    expect(screen.getByRole('region', { name: '诗脉千年' })).toHaveAttribute('id', 'timeline');
  });
});
