import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntroSection } from './IntroSection';
import { ExplorerProvider } from '../../store/explorer';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function renderIntro() {
  return render(
    <MemoryRouter>
      <ExplorerProvider>
        <IntroSection />
      </ExplorerProvider>
    </MemoryRouter>,
  );
}

describe('首页标题页', () => {
  it('页面布局变化后重新测量人物位置，保持悬停准确', async () => {
    const { container } = renderIntro();
    const image = screen.getByTestId('hero-figure-layer-李白');
    Object.defineProperties(image, { naturalWidth: { value: 1403 }, naturalHeight: { value: 1121 } });
    const pixels = new Uint8ClampedArray(1403 * 1121 * 4).fill(255);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(), getImageData: () => ({ data: pixels }),
    } as unknown as CanvasRenderingContext2D);
    fireEvent.load(image);
    const layer = container.querySelector('.intro-section__figure-layer') as HTMLElement;
    let left = 0;
    vi.spyOn(layer, 'getBoundingClientRect').mockImplementation(() => ({ left, top: 0, width: 1975, height: 796 }) as DOMRect);
    const button = screen.getByRole('button', { name: '查看李白的代表作' });
    fireEvent.mouseMove(layer, { clientX: 1020, clientY: 80 });
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    left = 22;
    fireEvent(window, new Event('resize'));
    fireEvent.mouseMove(layer, { clientX: 1020, clientY: 80 });
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    fireEvent.mouseMove(layer, { clientX: 1042, clientY: 80 });
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  });

  it('人物悬停检测合并到帧内，连续移动复用坐标缓存', async () => {
    const { container } = renderIntro();
    const layer = container.querySelector('.intro-section__figure-layer') as HTMLElement;
    const readBounds = vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1975, height: 796 } as DOMRect);
    for (let index = 0; index < 100; index += 1) {
      fireEvent.mouseMove(layer, { clientX: 1020 + index, clientY: 80 });
    }
    expect(readBounds).not.toHaveBeenCalled();
    await waitFor(() => expect(readBounds).toHaveBeenCalledTimes(1));
    for (let index = 0; index < 100; index += 1) {
      fireEvent.mouseMove(layer, { clientX: 1020 + index, clientY: 80 });
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(readBounds).toHaveBeenCalledTimes(1);
  });

  it('依次聚焦五位诗人时，横向引句层不再切换为代表诗句', async () => {
    const user = userEvent.setup();
    const { container } = renderIntro();
    for (let index = 0; index < 5; index += 1) {
      await user.tab();
      expect(container.querySelector('.intro-section__quote p')).toHaveTextContent('以诗为镜，观照大唐。');
      expect(container.querySelector('.intro-section__quote-label')).toHaveTextContent('唐诗背景句');
      expect(container.querySelector('.intro-section__poetry-field:not(.is-leaving)')).not.toBeNull();
    }
  });

  it('诗句起点分布在标注的上方中部区域', async () => {
    const user = userEvent.setup();
    const { container } = renderIntro();
    await user.tab();
    const verses = [...container.querySelectorAll<HTMLElement>('.intro-section__verse')];
    expect(verses.length).toBeGreaterThan(0);
    for (const verse of verses) {
      expect(parseFloat(verse.style.left)).toBeGreaterThanOrEqual(30);
      expect(parseFloat(verse.style.left)).toBeLessThanOrEqual(69);
      expect(parseFloat(verse.style.top)).toBeGreaterThanOrEqual(8);
      expect(parseFloat(verse.style.top)).toBeLessThanOrEqual(14);
    }
    expect(Math.min(...verses.map(verse => parseFloat(verse.style.left)))).toBeLessThan(34);
  });

  it('粒子飞散后逐渐消失，时长适中且不超过诗文退场时间', async () => {
    const user = userEvent.setup();
    const { container } = renderIntro();
    await user.tab();
    const particles = container.querySelectorAll<HTMLElement>('.intro-section__verse-particle');
    expect(particles.length).toBeGreaterThan(0);
    for (const particle of particles) {
      const duration = parseFloat(particle.style.getPropertyValue('--dust-duration'));
      expect(duration).toBeGreaterThanOrEqual(1.2);
      expect(duration + parseFloat(particle.style.getPropertyValue('--dust-exit-delay'))).toBeLessThan(2);
    }
  });

  it('悬停诗人的背景诗文全部竖排，粒子分布不超出诗文区域', async () => {
    const user = userEvent.setup();
    const { container } = renderIntro();
    await user.tab();
    const verses = container.querySelectorAll('.intro-section__verse');
    expect(verses.length).toBeGreaterThan(0);
    for (const verse of verses) {
      expect(verse).toHaveClass('is-vertical');
      const particles = verse.querySelectorAll<HTMLElement>('.intro-section__verse-particle');
      expect(particles.length).toBeGreaterThanOrEqual(16);
      for (const particle of particles) {
        expect(parseFloat(particle.style.left)).toBeLessThan(100);
        expect(parseFloat(particle.style.top)).toBeLessThan(100);
      }
    }
  });

  it('离开诗人后保留诗句完成淡出，再清理诗句与粒子', async () => {
    const user = userEvent.setup();
    const { container } = renderIntro();
    await user.tab();
    const field = container.querySelector('.intro-section__poetry-field');
    expect(field).not.toBeNull();
    expect(field?.querySelectorAll('.intro-section__verse-particle').length).toBeGreaterThan(0);
    await user.tab({ shift: true });
    expect(field).toHaveClass('is-leaving');
    expect(field).toBeInTheDocument();
    await waitFor(() => expect(field).not.toBeInTheDocument(), { timeout: 3000 });
  });

  it('键盘聚焦诗人时切换代表句，离开后恢复默认诗句', async () => {
    const user = userEvent.setup();
    renderIntro();

    const quote = screen.getByTestId('hero-poem-quote');
    const liBai = screen.getByRole('button', { name: '查看李白的代表作' });
    const figureHotspot = screen.getByTestId('hero-figure-hotspot-李白');

    expect(quote).toHaveTextContent('以诗为镜，观照大唐。');
    expect(figureHotspot).toHaveAttribute('data-hit-shape', 'figure');
    expect(screen.getAllByTestId(/hero-figure-hotspot-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/hero-figure-layer-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/hero-figure-layer-/).every((image) => image.getAttribute('src')?.includes('hero-figure-'))).toBe(true);
    expect(screen.queryByRole('heading', { name: '文镜' })).not.toBeInTheDocument();

    await user.tab();

    expect(quote).toHaveTextContent('床前明月光，疑是地上霜。');
    expect(liBai).toHaveAttribute('aria-pressed', 'true');

    await user.tab({ shift: true });

    expect(quote).toHaveTextContent('以诗为镜，观照大唐。');
    expect(liBai).toHaveAttribute('aria-pressed', 'false');
  });
});
