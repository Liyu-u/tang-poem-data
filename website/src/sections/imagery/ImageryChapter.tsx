import { useState, type CSSProperties } from 'react';
import imageryCalligraphy from '../../assets/chapter-titles/imagery-calligraphy.png';
import { imageryChapterContent, type ImageryChapterContent, type ImageryFeature } from './imageryContent';
import './imagery-chapter.css';
import { ImageryLandscapeRanking } from './ImageryLandscapeRanking';

type Props = { content?: ImageryChapterContent };

const activeAtlas = new URL('../../assets/imagery-favorites-atlas.png', import.meta.url).href;
// Rows are the eight subjects; columns are chronological poses authored together.
const sequenceAtlas = new URL('../../assets/imagery-favorites-sequence-v2.png', import.meta.url).href;
const sequenceFrames = Array.from({ length: 8 }, (_, index) => index);
const subjectAtlases: Record<string, string> = {
  animal: new URL('../../assets/horse-rearing-sequence.png', import.meta.url).href,
  building: new URL('../../assets/great-wall-sequence.png', import.meta.url).href,
};

function FavoriteImagery({ feature }: { feature: ImageryFeature }) {
  const [selected, setSelected] = useState(false);
  const [fallbackAvailable, setFallbackAvailable] = useState(true);
  const [frameReady, setFrameReady] = useState<boolean[]>(() => sequenceFrames.map(() => false));
  const sequenceReady = frameReady.every(Boolean);
  const markFrame = (index: number, ready: boolean) => setFrameReady((frames) => frames.map((value, i) => i === index ? ready : value));
  const position = { left: `${-feature.art[0] * 100}%`, top: `${-feature.art[1] * 100}%` };
  const subjectAtlas = subjectAtlases[feature.id];
  return (
    <article className="imagery-feature" aria-labelledby={`imagery-feature-${feature.id}`} title={feature.note}
      data-selected={selected} data-sequence-ready={sequenceReady} data-active-available={sequenceReady}
      style={{ '--frame-steps': sequenceFrames.length - 1 } as CSSProperties}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setSelected(false); }}>
      <div className="imagery-feature__art" aria-hidden="true">
        <img className="imagery-feature__frame imagery-feature__frame--active" src={subjectAtlas ?? activeAtlas} alt="" draggable={false}
          style={{ ...(subjectAtlas ? { left: '0%', top: '0%' } : position), visibility: fallbackAvailable ? 'visible' : 'hidden' }} onError={() => setFallbackAvailable(false)} />
        {sequenceFrames.map((index) => (
          <img key={index} className="imagery-feature__frame imagery-feature__frame--sequence" src={subjectAtlas ?? sequenceAtlas} alt="" draggable={false}
            data-frame={index} data-ready={frameReady[index]}
            style={{ left: `${-(subjectAtlas ? index % 4 : index) * 100}%`, top: `${-(subjectAtlas ? Math.floor(index / 4) : feature.art[1] * 4 + feature.art[0]) * 100}%`,
              width: subjectAtlas ? '400%' : '800%', height: subjectAtlas ? '200%' : '800%', zIndex: sequenceFrames.length - index,
              '--frame-end': (index + 1) / (sequenceFrames.length - 1) } as CSSProperties}
            onLoad={() => markFrame(index, true)} onError={() => markFrame(index, false)} />
        ))}
      </div>
      <div className="imagery-feature__copy">
        <p className="imagery-feature__category">{feature.category}</p>
        <h4 id={`imagery-feature-${feature.id}`}>{feature.name}</h4>
        <p className="imagery-feature__verse">{feature.verse}<br />{feature.description}</p>
      </div>
      <button type="button" className="imagery-feature__toggle" aria-label={`${feature.name}：切换意象画面`}
        aria-pressed={selected} onClick={() => setSelected((value) => !value)}
        onKeyDown={(event) => { if (event.key === 'Escape') setSelected(false); }}
        onBlur={() => setSelected(false)} />
    </article>
  );
}

export function ImageryChapter({ content = imageryChapterContent }: Props) {
  return (
    <>
      <header className="imagery-chapter__title">
        <h2 id="imagery-title"><img className="imagery-chapter__calligraphy" src={imageryCalligraphy} alt="诗有万象" width={1024} height={1536} /></h2>
        <span className="imagery-chapter__seal" aria-hidden="true">诗境</span>
      </header>

      <div className="imagery-ranking imagery-ranking--landscape">
        <ImageryLandscapeRanking content={content} />
      </div>

      <div className="imagery-favorites">
        <header className="imagery-favorites__heading">
          <h3>{content.featuresTitle}<span className="imagery-favorites__seal" aria-hidden="true">唐诗</span></h3>
          <p>{content.introduction}</p>
        </header>
        <div className="imagery-favorites__grid">
          {content.features.map((feature) => (
            <FavoriteImagery feature={feature} key={feature.id} />
          ))}
        </div>
      </div>
    </>
  );
}



