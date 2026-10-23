import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlobalNav } from './GlobalNav';

afterEach(cleanup);

describe('GlobalNav', () => {
  it('closes the mobile menu when the current chapter changes and updates its theme', () => {
    const { rerender } = render(<GlobalNav activeSection="imagery" onNavigate={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '展开导航' }));
    rerender(<GlobalNav activeSection="poets" onNavigate={() => undefined} />);
    expect(screen.getByRole('button', { name: '展开导航' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('banner')).toHaveAttribute('data-section', 'poets');
    expect(screen.getByRole('link', { name: '诗人星河' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: '诗有万象' })).not.toHaveAttribute('aria-current');
  });
  it('renders the four chapter links and points them at section ids', () => {
    render(<GlobalNav activeSection="intro" onNavigate={() => undefined} />);
    expect(screen.getByRole('link', { name: '诗脉千年' })).toHaveAttribute('href', '#timeline');
    expect(screen.queryByRole('link', { name: '一诗万境' })).not.toBeInTheDocument();
  });

  it('uses the project logo and toggles the mobile menu', () => {
    render(<GlobalNav activeSection="intro" onNavigate={() => undefined} />);
    expect(screen.getByRole('img', { name: '诗映大唐' })).toBeVisible();
    const toggle = screen.getByRole('button', { name: '展开导航' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('link', { name: '诗脉千年' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not expose search or intercept the slash shortcut', () => {
    render(<GlobalNav activeSection="intro" onNavigate={() => undefined} />);
    expect(screen.queryByRole('button', { name: '打开搜索' })).not.toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: '/' });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
