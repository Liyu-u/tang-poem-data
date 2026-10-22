import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImageryChapter } from './ImageryChapter';

afterEach(cleanup);

describe('favorite imagery interactions', () => {
  it('uses Great Wall statistics and subject-specific artwork for the wall and rearing horse', () => {
    render(<ImageryChapter />);
    const wall = screen.getByRole('article', { name: '长城' });
    expect(wall).toHaveTextContent('出现 111 次');
    expect(wall).toHaveTextContent('涉及 101 首诗');
    expect(screen.queryByRole('article', { name: '门' })).not.toBeInTheDocument();
    for (const [name, file] of [['长城', 'great-wall-sequence'], ['马', 'horse-rearing-sequence']]) {
      const images = screen.getByRole('article', { name }).querySelectorAll('img');
      images.forEach((image) => expect(image.getAttribute('src')).toContain(file));
    }
  });
  it('allows independent touch or keyboard activation and restoration', () => {
    render(<ImageryChapter />);
    const spring = screen.getByRole('button', { name: '春：切换意象画面' });
    const night = screen.getByRole('button', { name: '夜：切换意象画面' });
    expect(screen.getAllByRole('button', { name: /切换意象画面/ })).toHaveLength(8);
    expect(spring).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(spring);
    expect(spring).toHaveAttribute('aria-pressed', 'true');
    expect(night).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(spring, { key: 'Escape' });
    expect(spring).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to the original when the sequence fails, and keeps the sequence when the original fails', () => {
    render(<ImageryChapter />);
    const card = screen.getByRole('article', { name: '春' });
    const images = card.querySelectorAll('img');
    expect(images).toHaveLength(9);
    images.forEach((image, index) => { if (index > 0) fireEvent.error(image); });
    expect(images[0]).not.toHaveStyle({ opacity: '0' });
    images.forEach((image, index) => { if (index > 0) fireEvent.load(image); });
    fireEvent.error(images[0]);
    expect(card).toHaveAttribute('data-active-available', 'true');
  });
});

