import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageryLandscapeRanking } from './ImageryLandscapeRanking';
import { imageryChapterContent } from './imageryContent';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('approved watercolor ranking', () => {
  it('cancels the hovered scene when a touch scroll cancels its pointer', () => {
    render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    const wind = screen.getByRole('button', { name: '风：17,030 次' });
    fireEvent.pointerEnter(wind);
    expect(wind).toHaveAttribute('data-active', 'true');
    fireEvent.pointerCancel(wind);
    expect(wind).toHaveAttribute('data-active', 'false');
  });
  it('does not mount a moving canvas under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    fireEvent.focus(screen.getByRole('button', { name: '月：12,204 次' }));
    expect(container.querySelector('canvas')).toBeNull();
  });
  it('retains value feedback without playing scene animation when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    const water = screen.getByRole('button', { name: '水：12,292 次' });
    fireEvent.pointerEnter(water);
    expect(water).toHaveAttribute('data-active', 'true');
    expect(container.querySelectorAll('animate, animateTransform')).toHaveLength(0);
  });
  it('animates only the pointed-to painted scene and settles on leaving', async () => {
    const { container } = render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    expect(container.querySelector('[data-animated-scene]')).toBeNull();
    const water = screen.getByRole('button', { name: '水：12,292 次' });
    fireEvent.pointerEnter(water);
    expect(container.querySelectorAll('[data-animated-scene]')).toHaveLength(1);
    expect(container.querySelector('[data-animated-scene]')).toHaveAttribute('data-animated-scene', '水');
    fireEvent.pointerLeave(water);
    await waitFor(() => expect(container.querySelector('[data-animated-scene]')).toBeNull());
    fireEvent.focus(screen.getByRole('button', { name: '月：12,204 次' }));
    expect(container.querySelector('[data-animated-scene]')).toHaveAttribute('data-animated-scene', '月');
  });
  it('highlights only the corresponding value and restores it when the pointer leaves', () => {
    render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    const mountain = screen.getByRole('button', { name: '山：18,212 次' });
    const wind = screen.getByRole('button', { name: '风：17,030 次' });
    fireEvent.pointerEnter(mountain);
    expect(mountain).toHaveAttribute('data-active', 'true');
    expect(wind).toHaveAttribute('data-active', 'false');
    fireEvent.pointerLeave(mountain);
    expect(mountain).toHaveAttribute('data-active', 'false');
    fireEvent.focus(wind);
    expect(wind).toHaveAttribute('data-active', 'true');
    fireEvent.blur(wind);
    expect(wind).toHaveAttribute('data-active', 'false');
  });
  it('presents the approved artwork with the matching ten accessible values', () => {
    render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    const figure = screen.getByRole('figure', { name: '唐诗意象词频前 10 名' });
    expect(within(figure).getByRole('img')).toHaveAttribute('src', expect.stringContaining('imagery-ridgeline-paper.png'));
    expect(within(figure).getAllByRole('listitem')).toHaveLength(10);
    expect(within(figure).getByText('山：18,212 次')).toBeInTheDocument();
    expect(within(figure).getByText('秋：8,708 次')).toBeInTheDocument();
  });

  it('shows readable data if the chart artwork cannot load', () => {
    render(<ImageryLandscapeRanking content={imageryChapterContent} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '唐诗意象词频前 10 名' })).toBeVisible();
    expect(screen.getByText('山：18,212 次')).toBeVisible();
  });
});

