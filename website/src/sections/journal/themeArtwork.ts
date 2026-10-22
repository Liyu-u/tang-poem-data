import poster from '../../assets/journal/theme-motion-poster.png';

type ThemeArtwork = { src: string; x: number; y: number; width: number; height: number };

// Same normalized coordinates as ThemeMotion: no jump between still and video.
const frame: ThemeArtwork = { src: poster, x: -200, y: -200, width: 400, height: 400 };
export const themeArtwork: Record<string, ThemeArtwork> = {
  'landscape-pastoral': frame,
  farewell: frame,
  objects: frame,
  homesick: frame,
  war: frame,
  other: frame,
};
