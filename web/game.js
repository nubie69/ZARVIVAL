import { World, characters, decodeLevel, TILE, WIDTH, HEIGHT } from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const images={},levels=[],keys=new Set();
let world,selected=0,levelIndex=0,state='loading',muted=true,last=0,accumulator=0,announced=false;
const effects={};let music;
function effect(name){if(muted)return;const sound=effects[name]??=new Audio(`/assets/audio/${name}.wav`);sound.currentTime=0;sound.volume=.35;sound.play().catch(()=>{});}
function playMusic(){music?.pause();if(muted||state!=='playing')return;music=new Audio(`/assets/audio/level${levelIndex%2+1}.wav`);music.loop=true;music.volume=.18;music.play().catch(()=>{});}
function image(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[file]=im;resolve(im);};im.onerror=()=>reject(new Error(`Could not load ${file}`));im.src=`/assets/${file}`;});}
function overlay(tag,title,text,action,showCharacters=false){
  $('overlay').hidden=false;$('overlay-tag').textContent=tag;$('overlay-title').textContent=title;$('overlay-text').textContent=text;
  $('primary').textContent=action;$('characters').hidden=!showCharacters;$('menu').hidden=showCharacters;$('pause').hidden=true;music?.pause();
}
function menu(){state='menu';keys.clear();overlay('YOUR NEXT ADVENTURE','Choose your fighter','Three fighters. Five worlds. One way through.','Enter the forest →',true);$('health-wrap').hidden=true;$('level-label').textContent='THE ADVENTURE AWAITS';$('enemies-label').textContent='';}
function start(){world=new World(levels[levelIndex],selected);state='playing';announced=false;keys.clear();$('overlay').hidden=true;$('pause').hidden=false;$('pause').textContent='Pause';$('health-wrap').hidden=false;canvas.focus();playMusic();}
function pause(){if(state==='playing'){state='paused';keys.clear();overlay('TAKE A BREATHER','Game paused','The forest can wait.','Resume →');}else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').hidden=false;canvas.focus();playMusic();}}
$('primary').onclick=()=>{if(state==='paused'){pause();return;}if(state==='menu'||state==='won')levelIndex=0;else if(state==='complete')levelIndex++;start();};
$('menu').onclick=menu;$('pause').onclick=pause;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=`Sound: ${muted?'off':'on'}`;$('sound').setAttribute('aria-pressed',String(!muted));if(muted)music?.pause();else playMusic();};
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.character);document.querySelectorAll('[data-character]').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));});});
function keydown(code,repeat=false){
  if(code==='Escape'&&!repeat){pause();return;}
  if(state!=='playing')return;
  keys.add(code);
  if((code==='KeyJ'||code==='KeyK')&&world.attack(code==='KeyK'))effect('attack1');
}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.code!=='Escape')return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyJ','KeyK','Escape'].includes(e.code)){e.preventDefault();keydown(e.code,e.repeat);}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;e.preventDefault();canvas.focus();if(world.attack(e.button===2))effect('attack1');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keydown(b.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
function sprite(file,sw,sh,row,frame,x,y,w,h,flip=false){const im=images[file];if(!im)return;ctx.save();ctx.translate(Math.round(x+(flip?w:0)),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(im,frame*sw,row*sh,sw,sh,0,0,w,h);ctx.restore();}
function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);if(images['BGnew.png'])ctx.drawImage(images['BGnew.png'],0,0,WIDTH,HEIGHT);
  if(!world)return;
  const p=world.player,l=world.level,camera=Math.max(0,Math.min(l.width*TILE-WIDTH,p.x-WIDTH*.4)),t=world.time;
  ctx.save();ctx.translate(-Math.round(camera),0);
  for(const o of world.objects){if(o.type>=7){const file=o.type===7?'Pine_tree.png':'Large_Tree.png';const im=images[file];ctx.drawImage(im,o.x-40,o.y-145,120,240);}}
  for(let y=0;y<l.height;y++)for(let x=Math.max(0,Math.floor(camera/TILE));x<Math.min(l.width,Math.ceil((camera+WIDTH)/TILE));x++){
    const tile=l.tiles[y][x];if(tile===11)continue;
    if(tile===48)sprite('water_atlas_animation.png',32,32,0,Math.floor(t*6)%4,x*TILE,y*TILE,TILE,TILE);
    else if(tile===49)ctx.drawImage(images['water.png'],x*TILE,y*TILE,TILE,TILE);
    else sprite('outside_sprites.png',32,32,Math.floor(tile/12),tile%12,x*TILE,y*TILE,TILE,TILE);
  }
  for(const o of world.objects){if(o.used)continue;const x=o.x,y=o.y;
    if(o.type<=1)sprite('potions_sprites.png',12,16,o.type,Math.floor(t*8)%7,x+10,y+12,18,24);
    else if(o.type<=3)sprite('objects_sprites.png',40,30,o.type===2?1:0,0,x-5,y,60,45);
    else if(o.type===4)sprite('trap_atlas.png',32,32,0,0,x,y,TILE,TILE);
    else if(o.type<=6)sprite('Shooters.png',64,32,0,0,x,y,64,32,o.type===6);
  }
  for(const e of world.enemies){if(e.hp<=0)continue;
    const row=e.hurt>0?3:1,frame=Math.floor(t*9)%(e.hurt>0?3:(e.type===1?4:7));
    if(e.type===0)sprite('mushroom_sprite.png',80,64,row,frame,e.x-39,e.y-48,120,96,e.facing>0);
    if(e.type===1)sprite('Armadillo.png',32,32,row,frame,e.x-12,e.y-18,58,58,e.facing>0);
    if(e.type===2)sprite('Froggy.png',384,128,row,frame,e.x-75,e.y-28,192,64,e.facing>0);
    if(e.hurt>0){ctx.fillStyle='#ef9480';ctx.fillRect(e.x,e.y-8,e.w*(Math.max(0,e.hp)/(e.type===0?50:25)),3);}
  }
  for(const b of world.projectiles)ctx.drawImage(images['Ball.png'],b.x,b.y,b.w,b.h);
  const pc=characters[selected],row=p.attack>0?4:!p.grounded?(p.vy<0?2:3):p.vx?1:0,frame=Math.floor(t*10)%pc.frames[row];
  if(p.invulnerable<=0||Math.floor(t*15)%2===0)sprite(pc.file,pc.sw,pc.sh,row,frame,p.x-pc.ox*1.5,p.y-pc.oy*1.5,pc.sw*1.5,pc.sh*1.5,p.facing<0);
  if(p.attack>0){ctx.strokeStyle=p.attack>0&&world.powerAttack?'#d6ef93':'#ffffff90';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,56,p.facing>0?-.9:Math.PI-.9,p.facing>0?.9:Math.PI+.9);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#15251c';ctx.fillRect(20,22,144,8);ctx.fillStyle='#8edce0';ctx.fillRect(20,22,144*p.power/100,8);ctx.fillStyle='#eff4dc';ctx.font='12px system-ui';ctx.fillText('POWER',20,46);
  $('health').value=p.hp;$('health').textContent=String(p.hp);$('level-label').textContent=`LEVEL ${levelIndex+1} / ${levels.length} · ${characters[selected].name.toUpperCase()}`;$('enemies-label').textContent=`${world.enemies.filter(e=>e.hp>0).length} ENEMIES LEFT`;
}
function tick(now){const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;accumulator+=elapsed;
  while(accumulator>=1/60){if(state==='playing'){
    const before=world.player.vy;
    world.update(1/60,{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),jump:keys.has('Space')||keys.has('ArrowUp')});
    if(world.player.vy<0&&before>=0)effect('jump');
    if(world.status!=='playing'&&!announced){announced=true;keys.clear();
      if(world.status==='dead'){state='dead';effect('die');overlay('THE FOREST FOUGHT BACK','Try again','Your fighter has fallen. Take another run at this level.','Retry level →');}
      else{effect('lvlcompleted');state=levelIndex===levels.length-1?'won':'complete';overlay('ALL ENEMIES DEFEATED',state==='won'?'You survived ZARVIVAL!':'Level cleared',state==='won'?'Five worlds conquered. Ready for another adventure?':'Catch your breath. The next world is waiting.',state==='won'?'Play again →':'Next level →');}
    }
  }accumulator-=1/60;}draw();requestAnimationFrame(tick);
}
async function load(){try{
  await Promise.all(['BGnew.png','outside_sprites.png','water.png','water_atlas_animation.png','Pine_tree.png','Large_Tree.png','mushroom_sprite.png','Armadillo.png','Froggy.png','potions_sprites.png','objects_sprites.png','trap_atlas.png','Shooters.png','Ball.png',...characters.map(c=>c.file),...Array.from({length:5},(_,i)=>`lvls/${i+1}.png`)].map(image));
  for(let i=1;i<=5;i++){const im=images[`lvls/${i}.png`],scratch=document.createElement('canvas');scratch.width=im.width;scratch.height=im.height;const s=scratch.getContext('2d',{willReadFrequently:true});s.drawImage(im,0,0);levels.push(decodeLevel(im.width,im.height,s.getImageData(0,0,im.width,im.height).data));}
  document.querySelectorAll('[data-character] canvas').forEach((c,i)=>{const pc=characters[i],s=c.getContext('2d');s.imageSmoothingEnabled=false;const scale=90/Math.max(pc.sw,pc.sh);s.drawImage(images[pc.file],0,0,pc.sw,pc.sh,(100-pc.sw*scale)/2,(100-pc.sh*scale)/2,pc.sw*scale,pc.sh*scale);});
  $('primary').disabled=false;menu();requestAnimationFrame(tick);
}catch(error){$('overlay-title').textContent='The forest could not load';$('overlay-text').textContent=`${error.message}. Reload the page to try again.`;console.error(error);}}
load();
