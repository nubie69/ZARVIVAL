import { World, characters, decodeLevel, enemySprite, TILE, WIDTH, HEIGHT } from './engine.js';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const images={},levels=[],keys=new Set();
let world,selected=0,levelIndex=0,state='loading',muted=true,last=0,accumulator=0,announced=false;
let cameraX=0,shake=0,runScore=0,particles=[],labels=[];
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
function readSave(){try{return JSON.parse(localStorage.getItem('zarvival-progress'));}catch{return null;}}
function writeSave(value){try{if(value)localStorage.setItem('zarvival-progress',JSON.stringify(value));else localStorage.removeItem('zarvival-progress');}catch{/* The game also works with storage disabled. */}}
function savedRun(){const s=readSave();return s&&Number.isInteger(s.level)&&s.level>=0&&s.level<levels.length&&Number.isInteger(s.character)&&s.character>=0&&s.character<characters.length&&Number.isFinite(s.score)&&s.score>=0?s:null;}
function bestScore(value){try{const old=Number(localStorage.getItem('zarvival-best'))||0;if(value>old)localStorage.setItem('zarvival-best',String(value));return Math.max(old,value||0);}catch{return value||0;}}
function selectCharacter(index){selected=index;document.querySelectorAll('[data-character]').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));});}
const effects={};let music;
function effect(name){if(muted)return;const sound=effects[name]??=new Audio(`/assets/audio/${name}.wav`);sound.currentTime=0;sound.volume=.35;sound.play().catch(()=>{});}
function playMusic(){music?.pause();if(muted||state!=='playing')return;const track=`/assets/audio/level${levelIndex%2+1}.wav`;if(!music||music.dataset.track!==track){music=new Audio(track);music.dataset.track=track;music.loop=true;music.volume=.18;}music.play().catch(()=>{});}
function image(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[file]=im;resolve(im);};im.onerror=()=>reject(new Error(`Could not load ${file}`));im.src=`/assets/${file}`;});}
function overlay(tag,title,text,action,showCharacters=false){
  $('overlay').hidden=false;$('overlay-tag').textContent=tag;$('overlay-title').textContent=title;$('overlay-text').textContent=text;
  $('primary').textContent=action;$('characters').hidden=!showCharacters;$('menu').hidden=showCharacters;$('pause').hidden=true;music?.pause();
  $('continue').hidden=true;$('best-label').textContent=`BEST SCORE ${bestScore(0)}`;
}
function menu(){state='menu';world=null;keys.clear();overlay('YOUR NEXT ADVENTURE','Choose your fighter','Three fighters. Five worlds. One way through.','New adventure →',true);$('health-wrap').hidden=true;$('level-label').textContent='THE ADVENTURE AWAITS';$('enemies-label').textContent='';$('score-label').textContent='';const s=savedRun();if(s){$('continue').hidden=false;$('continue').textContent=`Continue level ${s.level+1} · ${characters[s.character].name}`;}}
function start(){world=new World(levels[levelIndex],selected);state='playing';announced=false;keys.clear();particles=[];labels=[];shake=0;cameraX=Math.max(0,Math.min(world.level.width*TILE-WIDTH,world.player.x-WIDTH*.4));writeSave({level:levelIndex,character:selected,score:runScore});$('overlay').hidden=true;$('pause').hidden=false;$('pause').textContent='Pause';$('health-wrap').hidden=false;canvas.focus();playMusic();}
function pause(){if(state==='playing'){state='paused';keys.clear();overlay('TAKE A BREATHER','Game paused','The forest can wait.','Resume →');}else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').hidden=false;canvas.focus();playMusic();}}
$('primary').onclick=()=>{if(state==='paused'){pause();return;}if(state==='menu'||state==='won'){levelIndex=0;runScore=0;}else if(state==='complete'){levelIndex++;runScore+=world.score;}start();};
$('continue').onclick=()=>{const s=savedRun();if(!s)return;levelIndex=s.level;runScore=s.score;selectCharacter(s.character);start();};
$('menu').onclick=menu;$('pause').onclick=pause;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=`Sound: ${muted?'off':'on'}`;$('sound').setAttribute('aria-pressed',String(!muted));if(muted)music?.pause();else playMusic();};
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>selectCharacter(Number(b.dataset.character)));
function keydown(code,repeat=false){
  if(code==='Escape'&&!repeat){pause();return;}
  if(state!=='playing')return;
  keys.add(code);
  if(code==='KeyJ'||code==='KeyK')world.attack(code==='KeyK');
}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.code!=='Escape')return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyJ','KeyK','Escape'].includes(e.code)){e.preventDefault();keydown(e.code,e.repeat);}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;e.preventDefault();canvas.focus();world.attack(e.button===2);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keydown(b.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
function sprite(file,sw,sh,row,frame,x,y,w,h,flip=false){const im=images[file];if(!im)return;ctx.save();ctx.translate(Math.round(x+(flip?w:0)),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(im,frame*sw,row*sh,sw,sh,0,0,w,h);ctx.restore();}
function feedback(){for(const e of world.events.splice(0)){
  if(e.type==='jump')effect('jump');if(e.type==='attack')effect('attack1');
  if(e.type==='damage')shake=reducedMotion?0:9;if(e.type==='hit')shake=reducedMotion?0:4;
  if(e.type==='damage'||e.type==='hit'||e.text)labels.push({x:e.x,y:e.y-30,text:e.text||`−${e.amount}`,color:e.type==='damage'?'#ff9b84':e.type==='hit'?'#fff1ca':'#d6ef93',life:.85});
  if(['hit','kill','break','pickup','jump'].includes(e.type)&&!reducedMotion){const count=e.type==='kill'?20:8;for(let i=0;i<count;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*200,vy:-Math.random()*180,color:e.type==='pickup'?'#a5e4c5':e.type==='break'?'#b78f62':'#e4eaa2',life:.35+Math.random()*.3});}
}}
function draw(elapsed=0){
  ctx.clearRect(0,0,WIDTH,HEIGHT);if(images['BGnew.png'])ctx.drawImage(images['BGnew.png'],-(cameraX*.08%120),0,WIDTH+120,HEIGHT);
  if(!world)return;
  const p=world.player,l=world.level,target=Math.max(0,Math.min(l.width*TILE-WIDTH,p.x-WIDTH*.4)),t=world.time;
  if(state==='playing')cameraX+=(target-cameraX)*(1-Math.exp(-8*elapsed));
  const camera=cameraX;shake=Math.max(0,shake-elapsed*30);
  ctx.save();ctx.translate(-Math.round(camera)+(reducedMotion?0:Math.sin(t*95)*shake),reducedMotion?0:Math.cos(t*80)*shake*.5);
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
    const visual=enemySprite(e);
    sprite(visual.file,visual.sw,visual.sh,visual.row,visual.frame,visual.x,visual.y,visual.w,visual.h,visual.flip);
    if(e.hp<e.maxHp||e.windup>0){ctx.fillStyle='#17241c';ctx.fillRect(e.x-4,e.y-14,e.w+8,5);ctx.fillStyle='#ef9480';ctx.fillRect(e.x-4,e.y-14,(e.w+8)*Math.max(0,e.hp)/e.maxHp,5);}
    if(e.windup>0){ctx.fillStyle='#ffc971';ctx.font='bold 28px system-ui';ctx.fillText('!',e.x+e.w/2-5,e.y-26);ctx.strokeStyle='#ffc971';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x+e.w/2,e.y+e.h,30,Math.PI,Math.PI*2);ctx.stroke();}
  }
  for(const b of world.projectiles)ctx.drawImage(images['Ball.png'],b.x,b.y,b.w,b.h);
  const pc=characters[selected],row=p.attack>0?4:!p.grounded?(p.vy<0?2:3):p.vx?1:0,frame=Math.floor(t*10)%pc.frames[row];
  if(p.invulnerable<=0||Math.floor(t*15)%2===0)sprite(pc.file,pc.sw,pc.sh,row,frame,p.x-pc.ox*1.5,p.y-pc.oy*1.5,pc.sw*1.5,pc.sh*1.5,p.facing<0);
  if(p.attack>0){ctx.strokeStyle=p.attack>0&&world.powerAttack?'#d6ef93':'#ffffff90';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,56,p.facing>0?-.9:Math.PI-.9,p.facing>0?.9:Math.PI+.9);ctx.stroke();}
  for(const dot of particles){ctx.globalAlpha=Math.max(0,dot.life/.65);ctx.fillStyle=dot.color;ctx.fillRect(dot.x,dot.y,4,4);}ctx.globalAlpha=1;
  ctx.font='bold 17px system-ui';ctx.textAlign='center';for(const label of labels){ctx.globalAlpha=Math.min(1,label.life*3);ctx.fillStyle=label.color;ctx.fillText(label.text,label.x,label.y);}ctx.globalAlpha=1;ctx.textAlign='left';
  ctx.restore();
  ctx.fillStyle='#15251c';ctx.fillRect(20,22,144,8);ctx.fillStyle=p.power>=30?'#8edce0':'#5b7778';ctx.fillRect(20,22,144*p.power/100,8);ctx.fillStyle='#eff4dc';ctx.font='12px system-ui';ctx.fillText(`POWER ${Math.floor(p.power)}${p.power<30?' · RECHARGING':''}`,20,46);
  // Whole-level radar helps locate enemies behind the player and on other platforms.
  const radar={x:WIDTH-225,y:20,w:205,h:65};ctx.fillStyle='#102018dc';ctx.fillRect(radar.x-8,radar.y-8,radar.w+16,radar.h+28);
  ctx.strokeStyle='#6c8266';ctx.lineWidth=1;ctx.strokeRect(radar.x+camera/(l.width*TILE)*radar.w,radar.y,WIDTH/(l.width*TILE)*radar.w,radar.h);
  for(const e of world.enemies){if(e.hp<=0)continue;ctx.fillStyle=e.windup>0?'#ffc971':'#f29882';ctx.fillRect(radar.x+e.x/(l.width*TILE)*radar.w,radar.y+e.y/HEIGHT*radar.h,4,4);}
  ctx.fillStyle='#d6ef93';ctx.fillRect(radar.x+p.x/(l.width*TILE)*radar.w-2,radar.y+p.y/HEIGHT*radar.h-2,6,6);ctx.fillStyle='#adbea6';ctx.fillText('YOU ●     ENEMIES ●',radar.x,radar.y+radar.h+14);
  $('health').max=p.maxHp;$('health').value=p.hp;$('health').textContent=String(p.hp);$('health-number').textContent=`${p.hp}/${p.maxHp}`;$('score-label').textContent=`${runScore+world.score} PTS · ${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;$('level-label').textContent=`LEVEL ${levelIndex+1} / ${levels.length} · ${characters[selected].name.toUpperCase()}`;$('enemies-label').textContent=`${world.enemies.filter(e=>e.hp>0).length} ENEMIES LEFT`;
}
function tick(now){const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;accumulator+=elapsed;
  while(accumulator>=1/60){if(state==='playing'){
    world.update(1/60,{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),jump:keys.has('Space')||keys.has('ArrowUp')});
    feedback();
    if(world.status!=='playing'&&!announced){announced=true;keys.clear();
      if(world.status==='dead'){state='dead';effect('die');overlay('THE FOREST FOUGHT BACK','Try again','Your fighter has fallen. Take another run at this level.','Retry level →');}
      else{effect('lvlcompleted');state=levelIndex===levels.length-1?'won':'complete';const total=runScore+world.score;bestScore(total);writeSave(state==='won'?null:{level:levelIndex+1,character:selected,score:total});overlay('ALL ENEMIES DEFEATED',state==='won'?'You survived ZARVIVAL!':'Level cleared',`${world.kills} enemies defeated · ${Math.floor(world.time)} seconds · ${total} points`,state==='won'?'Play again →':'Next level →');}
    }
  }accumulator-=1/60;}
  if(state==='playing'){for(const dot of particles){dot.life-=elapsed;dot.x+=dot.vx*elapsed;dot.y+=dot.vy*elapsed;dot.vy+=500*elapsed;}particles=particles.filter(dot=>dot.life>0);for(const label of labels){label.life-=elapsed;label.y-=35*elapsed;}labels=labels.filter(label=>label.life>0);}
  draw(elapsed);requestAnimationFrame(tick);
}
async function load(){try{
  await Promise.all(['BGnew.png','outside_sprites.png','water.png','water_atlas_animation.png','Pine_tree.png','Large_Tree.png','mushroom_sprite.png','Armadillo.png','Froggy.png','potions_sprites.png','objects_sprites.png','trap_atlas.png','Shooters.png','Ball.png',...characters.map(c=>c.file),...Array.from({length:5},(_,i)=>`lvls/${i+1}.png`)].map(image));
  for(let i=1;i<=5;i++){const im=images[`lvls/${i}.png`],scratch=document.createElement('canvas');scratch.width=im.width;scratch.height=im.height;const s=scratch.getContext('2d',{willReadFrequently:true});s.drawImage(im,0,0);levels.push(decodeLevel(im.width,im.height,s.getImageData(0,0,im.width,im.height).data));}
  document.querySelectorAll('[data-character] canvas').forEach((c,i)=>{const pc=characters[i],s=c.getContext('2d');s.imageSmoothingEnabled=false;const scale=90/Math.max(pc.sw,pc.sh);s.drawImage(images[pc.file],0,0,pc.sw,pc.sh,(100-pc.sw*scale)/2,(100-pc.sh*scale)/2,pc.sw*scale,pc.sh*scale);});
  $('primary').disabled=false;menu();requestAnimationFrame(tick);
}catch(error){$('overlay-title').textContent='The forest could not load';$('overlay-text').textContent=`${error.message}. Reload the page to try again.`;console.error(error);}}
load();
