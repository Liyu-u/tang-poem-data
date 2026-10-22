import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App', () => {
  it('updates the navigation theme when scrolling into a chapter', async () => {
    const view = render(<App />);
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.id === 'imagery' ? 0 : 2000;
      return { top, bottom: top + 1200, height: 1200, width: 1000, left: 0, right: 1000, x: 0, y: top, toJSON: () => ({}) };
    });
    try {
      fireEvent.scroll(window);
      await waitFor(() => expect(screen.getByRole('link', { name: '诗映大唐' }).closest('header')).toHaveAttribute('data-section', 'imagery'));
      expect(screen.getByRole('link', { name: '诗有万象' })).toHaveAttribute('aria-current', 'location');
    } finally {
      measure.mockRestore();
      view.unmount();
    }
  });

  it('renders the full-bleed Wenjing hero and real dataset boundary', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: '诗映大唐' })).toBeVisible();
    expect(screen.getByRole('region', { name: '诗映大唐首页' })).toBeVisible();
    expect(screen.getByRole('region', { name: '诗脉千年互动时间轴' })).toBeVisible();
  });
});
