import manifest from '../../assets/imagery-motion-v2/manifest.json';
import { movePaintPoint, particlePose, type PaintLayer, type PaintSprite, type ScenePointer } from './sceneMotionGeometry';
export type { ScenePointer } from './sceneMotionGeometry';
export type SceneRegion = { name: string; x: number; top: number; bottom: number };
export type PaintScene = { plate?: PaintSprite; layers: PaintLayer[]; light?: PaintSprite; petals?: PaintSprite[] };
export type SceneRenderer = { draw(time: number, amount: number, point: ScenePointer): void; dispose(): void };

export function artworkPoint(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
  const scale = Math.min(rect.width / 1188, rect.height / 1324);
  if (!scale) return { x: 594, y: 662 };
  return {
    x: Math.max(0, Math.min(1188, (clientX - rect.left - (rect.width - 1188 * scale) / 2) / scale)),
    y: Math.max(0, Math.min(1324, (clientY - rect.top - (rect.height - 1324 * scale) / 2) / scale)),
  };
}

const names: Record<string, string> = { 山: 'mountain', 风: 'wind', 日: 'sun', 云: 'cloud', 天: 'sky', 花: 'flower', 水: 'water', 月: 'moon', 春: 'spring', 秋: 'autumn' };
const urls = import.meta.glob('../../assets/imagery-motion-v2/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const images = new Map<string, Promise<HTMLImageElement>>();
const scenes = manifest.scenes as unknown as Record<string, PaintScene>;

function loadSprite(file: string): Promise<HTMLImageElement> {
  const url = urls[`../../assets/imagery-motion-v2/${file}`];
  if (!url) return Promise.reject(new Error(`Missing painted subject: ${file}`));
  const cached = images.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { images.delete(url); reject(new Error(`Could not load painted subject: ${file}`)); };
    image.src = url;
  });
  images.set(url, promise);
  return promise;
}

/** One-pixel scanlines bend the isolated pigment without triangle alpha seams. */
function drawSubject(ctx: CanvasRenderingContext2D, image: HTMLImageElement, layer: PaintLayer, time: number, amount: number, pointer: ScenePointer) {
  if (layer.kind==='bend'||layer.kind==='water'||layer.kind==='reflection') {
    for(let row=0;row<layer.height;row++) {
      const p=movePaintPoint(layer,layer.x,layer.y+row,time,amount,pointer);
      ctx.drawImage(image,0,row,layer.width,1,p.x,layer.y+row,layer.width,1);
    }
    return;
  }
  const [cx,cy]=layer.pivot;
  const p=movePaintPoint(layer,cx,cy,time,amount,pointer);
  ctx.save();ctx.translate(p.x,p.y);
  if(layer.kind==='bloom') {
    const tip=movePaintPoint(layer,cx+layer.width/2,cy,time,amount,pointer);
    const scale=Math.max(1,(tip.x-p.x)/(layer.width/2));ctx.scale(scale,scale);
  }
  if(layer.kind==='bird')ctx.scale(1,1+Math.sin(time*7+layer.phase)*.3*amount);
  if(layer.kind==='boat')ctx.rotate(Math.sin(time*1.3)*.012*amount);
  ctx.drawImage(image,layer.x-cx,layer.y-cy,layer.width,layer.height);ctx.restore();
}

function makeBuffer(width: number, height: number) {
  const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
  return { canvas, ctx: canvas.getContext('2d') };
}

/** Loading failure leaves the original img visible; no partially loaded scene plays. */
export async function createSceneRenderer(canvas: HTMLCanvasElement, source: HTMLImageElement, region: SceneRegion): Promise<SceneRenderer | null> {
  const scene=scenes[names[region.name]];
  if(!scene) return null;
  const sprites: PaintSprite[]=[...scene.layers,...(scene.petals??[])];
  if(scene.plate) sprites.push(scene.plate);
  if(scene.light) sprites.push(scene.light);
  const loaded=await Promise.all(sprites.map(async(sprite)=>[sprite.file,await loadSprite(sprite.file)] as const));
  const bitmaps=new Map(loaded);
  const context=canvas.getContext('2d',{alpha:true});
  if(!context) return null;
  const ctx: CanvasRenderingContext2D=context;
  let disposed=false;
  const light=scene.light;
  const lightBuffer=light ? makeBuffer(light.width,light.height) : null;
  const waterLayer=scene.layers.find(layer=>layer.kind==='water');
  const waterBuffer=waterLayer ? makeBuffer(waterLayer.width,waterLayer.height) : null;
  const waterBounds=waterLayer ?? {x:410,y:843,width:343,height:50};
  const drawSprite=(sprite:PaintSprite)=>ctx.drawImage(bitmaps.get(sprite.file)!,sprite.x,sprite.y,sprite.width,sprite.height);

  function shimmer(time:number,amount:number) {
    if(region.name!=='月'&&region.name!=='水') return;
    const {x,y,width,height}=waterBounds;
    const target=waterBuffer?.ctx??ctx;
    if(waterBuffer) { target.clearRect(0,0,width,height); target.save(); target.translate(-x,-y); }
    target.save(); target.lineCap='round'; target.lineWidth=region.name==='月'?1.3:1;
    for(let i=0;i<(region.name==='月'?70:24);i++) {
      const py=y+((i*17.23)%height), px=x+((i*49.37+Math.sin(time*.8+i)*8)%width);
      const phase=(Math.sin(time*(1.8+i%4*.18)+i*2.4)+1)/2;
      const focus=region.name==='月'?.25+.75*Math.exp(-(((px-367)/110)**2)):.6;
      target.strokeStyle=`rgba(${region.name==='月'?'255,239,187':'234,250,245'},${phase*amount*focus*.75})`;
      target.beginPath(); target.moveTo(px,py); target.lineTo(px+3+(i%7)*2,py); target.stroke();
    }
    target.restore();
    if(waterBuffer&&waterLayer) {
      target.restore(); target.globalCompositeOperation='destination-in';
      target.drawImage(bitmaps.get(waterLayer.file)!,0,0); target.globalCompositeOperation='source-over';
      ctx.drawImage(waterBuffer.canvas,x,y);
    }
  }

  function wake(layer:PaintLayer,time:number,amount:number,pointer:ScenePointer) {
    const p=movePaintPoint(layer,layer.pivot[0],layer.pivot[1],time,amount,pointer);
    ctx.save();ctx.lineCap='round';ctx.lineWidth=1.1;
    for(let i=0;i<5;i++) {
      ctx.strokeStyle=`rgba(226,242,230,${amount*(.38-i*.06)})`;
      ctx.beginPath();ctx.moveTo(p.x-21-i*5,p.y+3+i*3);ctx.quadraticCurveTo(p.x-37-i*6,p.y+1+i*3,p.x-51-i*7,p.y+4+i*3);ctx.stroke();
    }
    ctx.restore();
  }

  function petals(time:number,amount:number,pointer:ScenePointer) {
    if(!scene.petals?.length) return;
    const emitters=scene.layers.filter(layer=>layer.kind==='bloom');
    for(let i=0;i<28;i++) {
      const sprite=scene.petals[i%scene.petals.length];
      const pose=particlePose(i,time,amount,pointer,region.name);
      const emitter=emitters.length?emitters[(i*7)%emitters.length]:null;
      const x=(emitter?.pivot[0]??sprite.x+sprite.width/2)+pose.x;
      const y=(emitter?.pivot[1]??sprite.y+sprite.height/2)+pose.y;
      if(x<104||x>region.x-22||y>region.bottom+18) continue;
      ctx.save();ctx.globalAlpha=pose.alpha;ctx.translate(x,y);ctx.rotate(pose.rotation);
      ctx.scale(pose.scale*(.6+Math.abs(Math.cos(time+i))*.4),pose.scale);
      ctx.drawImage(bitmaps.get(sprite.file)!,-sprite.width/2,-sprite.height/2,sprite.width,sprite.height);ctx.restore();
    }
  }

  return {
    draw(time,amount,pointer) {
      if(disposed) return;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(source,0,0,1188,1324);
      if(amount<=.0001) return;
      if(scene.plate) drawSprite(scene.plate);
      for(const layer of scene.layers.filter(layer=>layer.kind==='water')) drawSubject(ctx,bitmaps.get(layer.file)!,layer,time,amount,pointer);
      shimmer(time,amount);
      for(const layer of scene.layers.filter(layer=>layer.kind!=='water')) {
        if(layer.kind==='boat') wake(layer,time,amount,pointer);
        drawSubject(ctx,bitmaps.get(layer.file)!,layer,time,amount,pointer);
      }
      petals(time,amount,pointer);
      if(light&&lightBuffer?.ctx) {
        const target=lightBuffer.ctx;
        target.clearRect(0,0,light.width,light.height);target.globalCompositeOperation='source-over';
        target.drawImage(bitmaps.get(light.file)!,0,0);
        target.globalCompositeOperation='source-in';
        const gradient=target.createRadialGradient(pointer.x-light.x,pointer.y-light.y,4,pointer.x-light.x,pointer.y-light.y,125);
        gradient.addColorStop(0,region.name==='月'?'rgba(222,239,255,.95)':'rgba(255,188,69,.95)');
        gradient.addColorStop(.45,region.name==='月'?'rgba(224,240,255,.45)':'rgba(255,133,42,.4)');
        gradient.addColorStop(1,'rgba(255,238,205,0)');target.fillStyle=gradient;target.fillRect(0,0,light.width,light.height);
        target.globalCompositeOperation='source-over';ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=amount*.9;
        ctx.drawImage(lightBuffer.canvas,light.x,light.y);ctx.restore();
      }
    },
    dispose() { disposed=true;lightBuffer?.ctx?.clearRect(0,0,lightBuffer.canvas.width,lightBuffer.canvas.height);waterBuffer?.ctx?.clearRect(0,0,waterBuffer.canvas.width,waterBuffer.canvas.height); },
  };
}
