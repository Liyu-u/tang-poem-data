import { Link, useParams } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import { demoDataset } from '../data/adapters/demo';
import { tangPoemDataset } from '../data/adapters/tangPoem';
import { getPoemById } from '../lib/explore/selectors';
import { LongScrollHome } from '../sections/LongScrollHome';
import { AcknowledgementsScroll } from '../sections/acknowledgements/AcknowledgementsScroll';

const dataset = import.meta.env.VITE_DATA_MODE === 'demo' ? demoDataset : tangPoemDataset;

function PoemDetailRoute() {
  const { poemId } = useParams();
  const poem = getPoemById(dataset.poems, poemId);
  if (!poem) {
    return (
      <main className="route-page">
        
        <h1>未找到这首诗作</h1>
        <Link className="button button--text" to="/">回到数字长卷</Link>
      </main>
    );
  }
  return (
    <main className="route-page route-page--reading">
      <p className="route-page__eyebrow">{poem.poetName} · {poem.poeticForm}</p>
      <h1>{poem.title}</h1>
      <p className="route-page__poem">{poem.fullText}</p>
      <Link className="button button--text" to="/">回到数字长卷</Link>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LongScrollHome /> },
  { path: '/acknowledgements', element: <AcknowledgementsScroll /> },
  { path: '/poems/:poemId', element: <PoemDetailRoute /> },
]);

