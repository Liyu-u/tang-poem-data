import { useEffect, useRef, useState } from 'react';
import logo from '../../assets/hero-calligraphy.png';

type SectionId = 'intro' | 'timeline' | 'imagery' | 'craft' | 'poets';
type GlobalNavProps = {
  activeSection: SectionId;
  onNavigate: (sectionId: SectionId) => void;
};
const sections: Array<{ id: SectionId; label: string }> = [
  { id: 'intro', label: '首页' },
  { id: 'timeline', label: '诗脉千年' },
  { id: 'imagery', label: '诗有万象' },
  { id: 'craft', label: '诗词日志' },
  { id: 'poets', label: '诗人江湖' },
];

export function GlobalNav({ activeSection, onNavigate }: GlobalNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    setMenuOpen(false);
  }, [activeSection]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setMenuOpen(false); }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('pointerdown', outside); };
  }, [menuOpen]);

  return (
    <header ref={header} className="global-nav" data-section={activeSection}>
      <a className="global-nav__brand" href={`${import.meta.env.BASE_URL}#intro`} aria-label="诗映大唐" onClick={(event) => { event.preventDefault(); window.history.replaceState(null, '', '#intro'); setMenuOpen(false); onNavigate('intro'); }}>
        {logoFailed ? <span className="global-nav__brand-fallback">诗映大唐</span> : <img src={logo} alt="诗映大唐" width="112" height="68" onError={() => setLogoFailed(true)} />}
      </a>
      <nav id="chapter-navigation" aria-label="章节导航" data-open={menuOpen}>
        <ul className="global-nav__links">
          {sections.map(section => (
            <li key={section.id}>
              <a className={activeSection === section.id ? 'is-active' : undefined} href={`#${section.id}`}
                aria-current={activeSection === section.id ? 'location' : undefined}
                onClick={(event) => { event.preventDefault(); window.history.replaceState(null, '', `#${section.id}`); setMenuOpen(false); onNavigate(section.id); }}>
                {section.label}
              </a>
            </li>
          ))}
          <li><a href={`${import.meta.env.BASE_URL}acknowledgements`}>鸣谢</a></li>
        </ul>
      </nav>
      <div className="global-nav__actions">
        <button ref={menuButton} className="global-nav__menu" type="button" aria-label={menuOpen ? '收起导航' : '展开导航'} aria-expanded={menuOpen} aria-controls="chapter-navigation" onClick={() => { setMenuOpen(value => !value); }}>
          {menuOpen ? '收起' : '目录'}
        </button>
      </div>
    </header>
  );
}


