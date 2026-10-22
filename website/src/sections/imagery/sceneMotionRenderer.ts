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

/** Affine texture triangles bend only a matted subject, with its roots pinned. */
function triangle(ctx: CanvasRenderingContext2D, image: HTMLImageElement, src: number[], dst: number[]) {
  const [x0,y0,x1,y1,x2,y2] = src;
  const den = x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
  if (Math.abs(den)<.0001) return;
  const affine = (v0: number,v1: number,v2: number) => [
    (v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/den,
    (v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/den,
    (v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/den,
  ];
  const [a,c,e]=affine(dst[0],dst[2],dst[4]), [b,d,f]=affine(dst[1],dst[3],dst[5]);
  const cx=(dst[0]+dst[2]+dst[4])/3, cy=(dst[1]+dst[3]+dst[5])/3;
  ctx.save(); ctx.beginPath();
  // Subpixel overlap avoids antialiased seams between neighboring triangles.
  for(let i=0;i<3;i++) {
    const dx=dst[i*2]-cx, dy=dst[i*2+1]-cy, distance=Math.hypot(dx,dy)||1;
    const px=dst[i*2]+dx/distance*.28, py=dst[i*2+1]+dy/distance*.28;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.clip(); ctx.transform(a,b,c,d,e,f); ctx.drawImage(image,0,0); ctx.restore();
}

function drawSubject(ctx: CanvasRenderingContext2D, image: HTMLImageElement, layer: PaintLayer, time: number, amount: number, pointer: ScenePointer) {
  const mesh = layer.mesh ?? (layer.kind==='bend' ? [7,8] : layer.kind==='bird' ? [6,4] : layer.kind==='bloom' ? [3,3] : [5,3]);
  // Bend displacement depends on height only: one column is exact and avoids
  // redundant texture seams across fine leaves.
  const columns=layer.kind==='bend'?1:Math.min(10,mesh[0]), rows=Math.min(18,mesh[1]);
  const verts: Array<{sx:number;sy:number;x:number;y:number}> = [];
  for(let row=0;row<=rows;row++) for(let col=0;col<=columns;col++) {
    const sx=col/columns*layer.width, sy=row/rows*layer.height;
    const moved=movePaintPoint(layer,layer.x+sx,layer.y+sy,time,amount,pointer);
    verts.push({sx,sy,...moved});
  }
  const draw=(a: typeof verts[number],b:typeof a,c:typeof a)=>triangle(ctx,image,[a.sx,a.sy,b.sx,b.sy,c.sx,c.sy],[a.x,a.y,b.x,b.y,c.x,c.y]);
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const a=verts[row*(columns+1)+col], b=verts[row*(columns+1)+col+1], c=verts[(row+1)*(columns+1)+col], d=verts[(row+1)*(columns+1)+col+1];
    draw(a,b,c); draw(b,d,c);
  }
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
  const canvasContext=canvas.getContext('2d',{alpha:true});
  if(!canvasContext) return null;
  const ctx: CanvasRenderingContext2D = canvasContext;
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
    const target: CanvasRenderingContext2D=waterBuffer?.ctx??ctx;
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


