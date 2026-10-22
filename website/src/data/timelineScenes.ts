import prologue from '../assets/timeline/backgrounds/prologue.jpg';
import work01 from '../assets/timeline/backgrounds/work-01.jpg';
import work02 from '../assets/timeline/backgrounds/work-02.jpg';
import work03 from '../assets/timeline/backgrounds/work-03.jpg';
import work04 from '../assets/timeline/backgrounds/work-04.jpg';
import work05 from '../assets/timeline/backgrounds/work-05.jpg';
import work06 from '../assets/timeline/backgrounds/work-06.jpg';
import work07 from '../assets/timeline/backgrounds/work-07.jpg';
import work08 from '../assets/timeline/backgrounds/work-08.jpg';
import work09 from '../assets/timeline/backgrounds/work-09.jpg';
import work10 from '../assets/timeline/backgrounds/work-10.jpg';
import work11 from '../assets/timeline/backgrounds/work-11.jpg';
import epilogue from '../assets/timeline/backgrounds/epilogue.jpg';

// Ordered by reading position, not the attachment order (which begins with the epilogue).
export const timelineScenes = [
  { id: 'prologue', image: prologue, position: '62% center', verseColor: '#62694b', readingWidth: '100%', readingShift: '0%' },
  { id: 'work-01', image: work01, position: 'center', verseColor: '#52694f', readingWidth: 'min(94%, 62rem)', readingShift: '0%' },
  { id: 'work-02', image: work02, position: 'center', verseColor: '#465e73', readingWidth: 'min(94%, 62rem)', readingShift: '-0.5%' },
  { id: 'work-03', image: work03, position: 'center', verseColor: '#626b5d', readingWidth: 'min(90%, 60rem)', readingShift: '1%' },
  { id: 'work-04', image: work04, position: 'center', verseColor: '#87643b', readingWidth: 'min(90%, 60rem)', readingShift: '1%' },
  { id: 'work-05', image: work05, position: 'center', verseColor: '#8d4e3a', readingWidth: 'min(92%, 61rem)', readingShift: '0.5%' },
  { id: 'work-06', image: work06, position: 'center', verseColor: '#536574', readingWidth: 'min(94%, 62rem)', readingShift: '0%' },
  { id: 'work-07', image: work07, position: 'center', verseColor: '#466b69', readingWidth: 'min(90%, 60rem)', readingShift: '-1%' },
  { id: 'work-08', image: work08, position: 'center', verseColor: '#716046', readingWidth: 'min(88%, 58rem)', readingShift: '0%' },
  { id: 'work-09', image: work09, position: 'center', verseColor: '#825747', readingWidth: 'min(90%, 60rem)', readingShift: '0%' },
  { id: 'work-10', image: work10, position: 'center', verseColor: '#815447', readingWidth: 'min(90%, 60rem)', readingShift: '0.5%' },
  { id: 'work-11', image: work11, position: 'center', verseColor: '#7e503a', readingWidth: 'min(88%, 58rem)', readingShift: '-2%' },
  { id: 'epilogue', image: epilogue, position: '62% center', verseColor: '#79604d', readingWidth: '100%', readingShift: '0%' },
] as const;
