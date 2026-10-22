import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tangPoemDataset } from '../../data/adapters/tangPoem';
import { PoemDrawer } from './PoemDrawer';

describe('PoemDrawer', () => {
  it('renders poem metadata, annotations, and supports close', () => {
    const poem = tangPoemDataset.poems.find((entry) => entry.themes.length > 0)!;
    const onClose = vi.fn();
    render(<PoemDrawer poem={poem} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: poem.title })).toBeVisible();
    expect(screen.getByRole('dialog').textContent).toContain(poem.poetName);
    expect(screen.getByText(poem.themes[0])).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '关闭诗作详情' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
