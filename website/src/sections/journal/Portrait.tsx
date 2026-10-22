import type { JournalPoet } from './journalData';
import bai from '../../assets/journal/poet-portraits/白居易.png';
import du from '../../assets/journal/poet-portraits/杜甫.png';
import li from '../../assets/journal/poet-portraits/李白.png';
import yuan from '../../assets/journal/poet-portraits/元稹.png';
import liu from '../../assets/journal/poet-portraits/刘禹锡.png';

const monochromePortraits: Record<string, string> = { 'bai-juyi': bai, 'du-fu': du, 'li-bai': li, 'yuan-zhen': yuan, 'liu-yuxi': liu };

export function Portrait({ poet, large = false, monochrome = false }: { poet: JournalPoet; large?: boolean; monochrome?: boolean }) {
  const source = monochrome ? monochromePortraits[poet.id] ?? poet.portrait : poet.portrait;
  return <span className={`pj-portrait${large ? ' pj-portrait--large' : ''}${monochrome ? ' pj-portrait--monochrome' : ''}`} data-poet={poet.id}>
    {source ? <img src={source} alt={`${poet.name}画像（艺术示意）`} loading="lazy" /> : <span aria-label={`${poet.name}画像待补充`}>{poet.name.slice(-1)}</span>}
  </span>;
}
