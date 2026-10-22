import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tangPoemDataset } from '../data/adapters/tangPoem';
import { buildImageryLayout } from '../lib/visualizations/imagery';
import { ImageryChord } from './ImageryChord';

describe('ImageryChord', () => {
  it('renders imagery labels and emits node selection', () => {
    const onSelectImagery = vi.fn();
    const layout = buildImageryLayout(tangPoemDataset.imageryGraph);
    render(<ImageryChord layout={layout} onSelectImagery={onSelectImagery} onSelectLink={vi.fn()} />);

    expect(screen.getByRole('img', { name: '诗有万象意象关系图' })).toBeVisible();
    const first = layout.nodes[0];
    fireEvent.click(screen.getByRole('button', { name: `查看意象${first.label}，${first.poemCount}首诗` }));
    expect(onSelectImagery).toHaveBeenCalledWith(first.label);
  });
});
