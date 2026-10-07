import { TILE, WIDTH, HEIGHT } from './engine.js';

export const weatherPresets = [
  { name:'Clear skies', rain:false, mist:false, cloudAlpha:.4, tint:0, wind:12 },
  { name:'Forest rain', rain:true, mist:false, cloudAlpha:.7, tint:.12, wind:36 },
  { name:'Morning mist', rain:false, mist:true, cloudAlpha:.5, tint:.04, wind:8 },
  { name:'Windy rain', rain:true, mist:true, cloudAlpha:.75, tint:.14, wind:65 },
  { name:'Clearing skies', rain:false, mist:false, cloudAlpha:.3, tint:0, wind:18 },
];
const wrap = (value, size) => ((value % size) + size) % size;
const seed = i => wrap(Math.sin(i*127.1+311.7)*43758.5453,1);

export function prepareTrees(level) {
  return level.objects.filter(o=>o.type>=7&&o.type<=9).flatMap(o=>{
    const column=Math.floor(o.x/TILE);
    // Markers may be in the air or embedded in terrain. Find the actual
    // platform surface rather than using a fixed vertical draw offset.
    let row=Math.max(0,Math.floor(o.y/TILE));
    while(row<level.height&&level.tiles[row][column]===11)row++;
    if(row>=level.height||[48,49].includes(level.tiles[row][column]))return [];
    while(row>0&&![11,48,49].includes(level.tiles[row-1][column]))row--;
    const pine=o.type===7;
    return [{ file:pine?'Pine_tree.png':'Large_Tree.png', sw:pine?53:74, sh:pine?96:128, frames:pine?16:23, scale:1.5, x:o.x+TILE/2, groundY:row*TILE, flip:o.type===9, phase:Math.floor(seed(o.x+o.y)*23) }];
  });
}

export function treeSprite(tree,time,animate=true) {
  const w=tree.sw*tree.scale,h=tree.sh*tree.scale;
  return { ...tree, row:0, frame:animate?Math.floor(time*6+tree.phase)%tree.frames:0, x:tree.x-w/2, y:tree.groundY-h, w, h };
}

export function forestTiles(camera,speed,width=1032) {
  const start=-wrap(camera*speed,width);
  return Array.from({length:Math.ceil(WIDTH/width)+1},(_,i)=>start+i*width);
}

export function rainSegments(level,camera,time,wind=36,count=140) {
  const segments=[];
  for(let i=0;i<count;i++){
    const x=wrap(seed(i+1)*WIDTH-time*wind-camera*.25,WIDTH);
    const y=wrap(seed(i+101)*HEIGHT+time*(420+seed(i+301)*180),HEIGHT+24)-24;
    const column=Math.floor((x+camera)/TILE);
    if(column<0||column>=level.width)continue;
    let surface=HEIGHT;
    for(let row=0;row<level.height;row++)if(level.tiles[row][column]!==11){surface=row*TILE;break;}
    const length=Math.min(14,surface-y);
    if(y>=0&&length>0)segments.push({x,y,length});
  }
  return segments;
}

export function drawBackdrop(ctx,images,camera,time,preset,animate=true) {
  ctx.save();
  ctx.globalAlpha=preset.cloudAlpha;
  for(let i=0;i<5;i++){
    const width=150+seed(i+20)*100;
    const x=wrap(seed(i+40)*(WIDTH+300)-camera*.12+(animate?time*preset.wind*.2:0),WIDTH+300)-250;
    ctx.drawImage(images['mini_cloud.png'],x,50+seed(i+60)*150,width,width/3);
  }
  ctx.globalAlpha=.55;
  for(const x of forestTiles(camera,.18))ctx.drawImage(images['pine1.png'],x,HEIGHT-222+70,1032,222);
  ctx.globalAlpha=.8;
  for(const x of forestTiles(camera,.3))ctx.drawImage(images['pine2.png'],x,HEIGHT-298.5+100,1032,298.5);
  ctx.restore();
}

export function drawWeather(ctx,images,level,camera,time,preset,animate=true) {
  ctx.save();
  if(preset.tint){ctx.fillStyle=`rgba(16,31,48,${preset.tint})`;ctx.fillRect(0,0,WIDTH,HEIGHT);}
  if(preset.mist){
    // A soft wash keeps the floor visible and drifts slowly with the wind.
    const drift=animate?Math.sin(time*.2)*20:0;
    const mist=ctx.createLinearGradient(0,HEIGHT*.3+drift,0,HEIGHT+drift);
    mist.addColorStop(0,'rgba(180,203,199,0)');mist.addColorStop(.75,'rgba(180,203,199,.12)');mist.addColorStop(1,'rgba(180,203,199,.04)');
    ctx.fillStyle=mist;ctx.fillRect(0,0,WIDTH,HEIGHT);
  }
  if(preset.rain&&animate){
    ctx.globalAlpha=.4;
    for(const drop of rainSegments(level,camera,time,preset.wind))ctx.drawImage(images['rain_particle.png'],drop.x,drop.y,2,drop.length);
  }
  ctx.restore();
}
