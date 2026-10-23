import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ImageryLandscapeRanking} from './ImageryLandscapeRanking';
import {imageryChapterContent} from './imageryContent';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
describe('scene video replacement',()=>{
 for(const name of ['山','天','花','水','春']) it(`uses video for ${name}`,()=>{vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});const {container}=render(<ImageryLandscapeRanking content={imageryChapterContent}/>);fireEvent.pointerEnter(screen.getByRole('button',{name:new RegExp('^'+name+'：')}));expect(container.querySelector('[data-animated-scene]')).toHaveAttribute('data-paint-renderer','sequence-video');expect(container.querySelector('video')).toHaveAttribute('playsinline');expect(container.querySelector('video')).toHaveAttribute('loop');});
 it('preserves the wind renderer',()=>{const {container}=render(<ImageryLandscapeRanking content={imageryChapterContent}/>);fireEvent.pointerEnter(screen.getByRole('button',{name:/^风：/}));expect(container.querySelector('[data-animated-scene]')).toHaveAttribute('data-paint-renderer','layered-canvas')});
});
it.each([['花',665,770,781,'flower'],['水',770,875,793,'water']])('protects adjacent painted rows for %s',(name,top,bottom,right,id)=>{
 const images: {src:string;onload:null|(()=>void)}[]=[];
 class LoadedImage {src='';onload:null|(()=>void)=null;constructor(){images.push(this)}}
 vi.stubGlobal('Image',LoadedImage);
 const ctx={clearRect:vi.fn(),save:vi.fn(),beginPath:vi.fn(),rect:vi.fn(),clip:vi.fn(),drawImage:vi.fn(),restore:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLMediaElement.prototype,'readyState','get').mockReturnValue(2);
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 const {container}=render(<ImageryLandscapeRanking content={imageryChapterContent}/>);
 fireEvent.pointerEnter(screen.getByRole('button',{name:new RegExp('^'+name+'：')}));
 for(const image of images)image.onload?.();
 expect(ctx.rect).not.toHaveBeenCalled();
 expect(ctx.clip).not.toHaveBeenCalled();
 expect(images.some(image=>image.src.includes(id+'-motion-mask.png'))).toBe(true);
 expect(images.some(image=>image.src.includes('-plate.png')||image.src.includes('-foreground.png'))).toBe(false);
 expect(container.querySelector('canvas')).toHaveAttribute('data-ready','true');
 vi.restoreAllMocks();
});

