import { describe, expect, it } from 'vitest';
import stylesheet from '../styles/timeline.css?raw';

describe('timeline card occlusion and decorative ink', () => {
  it('reserves space below the curve for node labels before the event heading', () => {
    const curve = stylesheet.match(/\.timeline-rail__curve\s*\{([^}]+)\}/)?.[1] ?? '';
    const nodes = stylesheet.match(/\.timeline-rail__nodes\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(curve).toContain('height: calc(100% - 2rem)');
    expect(nodes).toContain('inset: 0 0 2rem');
  });
  it('keeps 560ms verse crossfades without permanent blur or gradient fading', () => {
    expect(stylesheet).toContain('timeline-verse-arrive 560ms cubic-bezier(0.16, 1, 0.3, 1)');
    expect(stylesheet).toContain('timeline-verse-depart 560ms cubic-bezier(0.16, 1, 0.3, 1)');
    const backdrop = stylesheet.match(/\.timeline-rail__verse-backdrop\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(backdrop).toContain('filter: none');
    expect(backdrop).toContain('mask-image: none');
    expect(backdrop).toContain('font-size: clamp(1.6rem, 8.5cqh, 3.25rem)');
    expect(backdrop).toContain('font-family: "TimelineHandwriting"');
    expect(stylesheet).toContain('local("STXingkai")');
    const reduced = stylesheet.split('@media (prefers-reduced-motion: reduce)')[1];
    expect(reduced).toContain('.timeline-rail__verse-layer.is-leaving { display: none; animation: none; }');
  });
  it('keeps the node heading visibly larger than its history body at desktop and mobile sizes', () => {
    const heading = stylesheet.match(/(?:^|\n)\.timeline-rail__current-stage\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(heading).toContain('font-size: clamp(1.1rem, 1.35vw, 1.4rem)');
    expect(heading).toContain('font-weight: 700');
    expect(heading).toContain('text-wrap: balance');
    const mobile = stylesheet.split('@media (max-width: 800px)')[1];
    expect(mobile).toMatch(/\.timeline-rail__current-stage\s*\{[^}]*font-size: 1.05rem/);
    expect(mobile).toMatch(/\.timeline-rail__history-reading\s*\{[^}]*font-size: 0.95rem/);
  });

  it('softens side-card silhouettes while retaining a solid occlusion core and readable focus', () => {
    expect(stylesheet).toContain('filter: blur(var(--rail-edge-blur))');
    expect(stylesheet).toContain('mask-image: linear-gradient(to right, transparent, #000 2.5%, #000 97.5%, transparent)');
    expect(stylesheet).toContain('.timeline-rail__card-shell:not(.is-center):focus-within { filter: none; mask-image: none; }');
    expect(stylesheet).toContain('font-size: clamp(0.95rem, 1.08vw, 1.075rem)');
  });
  it('floats verse columns vertically in small staggered seamless cycles', () => {
    expect(stylesheet).toContain('animation: timeline-verse-float 8s ease-in-out infinite');
    expect(stylesheet).toContain('0%, 100% { transform: translateY(-4px)');
    expect(stylesheet).toContain('50% { transform: translateY(4px)');
    expect(stylesheet).toContain('animation-duration: 9.6s');
    expect(stylesheet).toContain('animation-duration: 8.8s');
  });
  it('keeps decorative ink clear and retains the scene-color fallback', () => {
    const backdrop = stylesheet.match(/\.timeline-rail__verse-backdrop\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(backdrop).toContain('padding: 0.6rem 2.25rem 1rem');
    expect(backdrop).toContain('color: var(--scroll-verse)');
    expect(stylesheet).toContain('--scroll-verse: var(--scroll-red)');
    expect(backdrop).not.toMatch(/\bopacity\s*:/);
    expect(stylesheet).not.toContain('timeline-verse-in');
    expect(backdrop).not.toContain('saturate(');
  });
  it('keeps an opaque paper surface behind translucent card fronts', () => {
    const shell = stylesheet.match(/\.timeline-rail__card-shell\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(shell).toContain('background: var(--scroll-paper)');
    expect(shell).toContain('border-radius: 12px');
    const front = stylesheet.match(/\.timeline-rail__face--front\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(front).toContain('opacity: var(--rail-opacity)');
    expect(shell).not.toMatch(/\bopacity\s*:/);
  });

  it('separates borderless full-bleed paper cards with soft elevation and strengthens reading text', () => {
    const face = stylesheet.match(/\.timeline-rail__face\s*\{([^}]+)\}/)?.[1] ?? '';
    const image = stylesheet.match(/\.timeline-rail__image-frame\s*\{([^}]+)\}/)?.[1] ?? '';
    const reading = stylesheet.match(/\.timeline-rail__history-reading\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(face).toContain('border: 0');
    expect(image).toContain('padding: 0');
    expect(stylesheet).not.toContain('.timeline-rail__face::after');
    expect(reading).toContain('font-weight: 600');
    expect(reading).toContain('color: var(--scroll-reading)');
    expect(stylesheet).toContain('stroke-width: 1.8');
  });

  it('removes verse shadows and 3D treatment while respecting reduced motion', () => {
    const ink = stylesheet.match(/\.timeline-rail__verse-backdrop span\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(ink).toContain('text-shadow: none');
    expect(ink).toContain('filter: none');
    expect(ink).not.toContain('perspective(');
    expect(ink).toContain("mask-image: url('../assets/timeline/verse-paper-grain.png')");
    expect(ink).toContain('mask-repeat: repeat');
    const reduced = stylesheet.split('@media (prefers-reduced-motion: reduce)')[1];
    expect(reduced).toMatch(/\.timeline-rail__verse-backdrop span\s*\{[^}]*animation: none/);
    expect(reduced).toMatch(/\.timeline-rail__verse-backdrop span\s*\{[^}]*transform: none/);
  });
});
