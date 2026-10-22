export function getThemeShares<T extends { value: number }>(themes: T[]): Array<T & { share: number }> {
  const sum = themes.reduce((total, theme) => total + Math.max(0, theme.value), 0);
  return themes.map(theme => ({ ...theme, share: sum ? Math.max(0, theme.value) / sum * 100 : 0 }));
}
