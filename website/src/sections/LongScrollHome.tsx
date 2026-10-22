import { useEffect, useRef, useState } from 'react';
import { getPoemById } from '../lib/explore/selectors';
import { useExplorer } from '../hooks/useExplorer';
import { usePageScroll } from '../hooks/usePageScroll';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { ExplorationTrail } from '../components/navigation/ExplorationTrail';
import { PoemDrawer } from '../components/poem/PoemDrawer';
import { IntroSection } from './intro/IntroSection';
import { TangTimelineRail } from '../visualizations/TangTimelineRail';
import { TimelineSceneBackground } from '../visualizations/TimelineSceneBackground';
import { ImageryChapter } from './imagery/ImageryChapter';
import { PoetryJournal } from './journal/PoetryJournal';
import { PoetJianghu } from './poets/PoetJianghu';
import timelineCalligraphy from '../assets/timeline/timeline-title-calligraphy.png';

const sectionIds = ['intro', 'timeline', 'imagery', 'craft', 'poets'] as const;
type SectionId = (typeof sectionIds)[number];

export function LongScrollHome() {
  const { state, dispatch, dataset } = useExplorer();
  const [activeSection, setActiveSection] = useState<SectionId>('intro');
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(-1);
  const scrollToChapter = usePageScroll(sectionIds);
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({ intro: null, timeline: null, imagery: null, craft: null, poets: null });
  const drawerPoem = getPoemById(dataset.poems, state.drawerPoemId ?? undefined);

  useEffect(() => {
    let frame: number | null = null;
    const updateSection = () => {
      frame = null;
      const boundary = (document.querySelector<HTMLElement>('.global-nav')?.offsetHeight ?? 84) + 1;
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;
        const bounds = element.getBoundingClientRect();
        if (bounds.top <= boundary && bounds.bottom > boundary) {
          setActiveSection(id);
          break;
        }
      }
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateSection);
    };
    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  const navigateTo = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    scrollToChapter(sectionId);
  };


  return (
    <div className="wenjing-app" data-testid="wenjing-shell" data-visual-language="oriental-editorial">
      <GlobalNav activeSection={activeSection} onNavigate={navigateTo} />
      <main aria-label="诗映大唐数字长卷">
        <IntroSection />
        <section id="timeline" ref={(node) => { sectionRefs.current.timeline = node; }} className="long-section data-section timeline-chapter" aria-labelledby="timeline-title" data-scene-kind={activeTimelineIndex < 0 ? 'prologue' : activeTimelineIndex > 10 ? 'epilogue' : 'work'}>
          <TimelineSceneBackground index={activeTimelineIndex} />
          <header className="timeline-chapter__title">
            <h2 id="timeline-title"><img className="timeline-chapter__calligraphy" src={timelineCalligraphy} alt="诗脉千年" width={1024} height={1536} /></h2>
            <span className="timeline-chapter__number">01</span>
            <span className="timeline-chapter__seal" aria-hidden="true">诗映大唐</span>
          </header>
          <div className="data-section__content data-section__content--timeline">
            <TangTimelineRail onActiveIndexChange={setActiveTimelineIndex} />
          </div>
        </section>
        <section id="imagery" ref={(node) => { sectionRefs.current.imagery = node; }} className="long-section imagery-chapter" aria-labelledby="imagery-title">
          <ImageryChapter />
        </section>
        <section id="craft" ref={(node) => { sectionRefs.current.craft = node; }} className="long-section journal-chapter" aria-labelledby="craft-title">
          <PoetryJournal />
        </section>
        <section id="poets" ref={(node) => { sectionRefs.current.poets = node; }} className="long-section poets-chapter" aria-labelledby="poets-title">
          <PoetJianghu dataset={dataset} onOpenPoem={poemId => dispatch({ type: 'openDrawer', poemId })} />
        </section>
      </main>
      <ExplorationTrail trail={state.trail} onRestore={(node) => dispatch({ type: 'restoreTrail', node })} />
      {drawerPoem && <PoemDrawer poem={drawerPoem} onClose={() => dispatch({ type: 'closeDrawer' })} />}
    </div>
  );
}
