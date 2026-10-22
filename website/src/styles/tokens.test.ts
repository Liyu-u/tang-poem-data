import { describe, expect, it } from 'vitest';
import './tokens.css';

describe('唐诗色卡主题 token', () => {
  it('exposes the five colors from the Tang palette as global CSS variables', () => {
    const styles = getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue('--palette-blue').trim()).toBe('#436C85');
    expect(styles.getPropertyValue('--palette-cinnabar').trim()).toBe('#B73F42');
    expect(styles.getPropertyValue('--palette-apricot').trim()).toBe('#DE9960');
    expect(styles.getPropertyValue('--palette-jade').trim()).toBe('#82B29B');
    expect(styles.getPropertyValue('--palette-paper').trim()).toBe('#EEECCB');
  });
});
