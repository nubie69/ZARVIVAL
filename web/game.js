import { World, characters, decodeLevel, enemySprite, playerSprite, objectSprite, TILE, WIDTH, HEIGHT } from './engine.js';
import { prepareTrees, treeSprite, drawBackdrop, drawWeather, weatherPresets } from './scenery.js';
import { loadPreferences, savePreferences } from './preferences.js';
import { GameAudio } from './audio.js';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const images={},levels=[],keys=new Set();
const preferences=loadPreferences();
let world,selected=0,levelIndex=0,state='loading',muted=!preferences.sound,last=0,accumulator=0,announced=false;
let cameraX=0,shake=0,runScore=0,particles=[],labels=[];
let trees=[],weatherEnabled=preferences.weather;
let terrain,waterTiles=[];
const systemReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
let reducedMotion=systemReducedMotion||!preferences.effects;
const levelNames=['The Green Outskirts','Rainwood Crossing','Mistfall Heights','The Windward Wilds','Last Light'];
function readSave(){try{return JSON.parse(localStorage.getItem('zarvival-progress'));}catch{return null;}}
function writeSave(value){try{if(value)localStorage.setItem('zarvival-progress',JSON.stringify(value));else localStorage.removeItem('zarvival-progress');}catch{/* The game also works with storage disabled. */}}
function savedRun(){const s=readSave();return s&&Number.isInteger(s.level)&&s.level>=0&&s.level<levels.length&&Number.isInteger(s.character)&&s.character>=0&&s.character<characters.length&&Number.isFinite(s.score)&&s.score>=0?s:null;}
function bestScore(value){try{const old=Number(localStorage.getItem('zarvival-best'))||0;if(value>old)localStorage.setItem('zarvival-best',String(value));return Math.max(old,value||0);}catch{return value||0;}}
function selectCharacter(index){selected=index;document.querySelectorAll('[data-character]').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.setAttribute('aria-pressed',String(i===selected));});}
const audio=new GameAudio();audio.configure(!muted,preferences.volume);
function effect(name,rate=1){audio.effect(name,rate);}
function playMusic(){if(!muted&&state==='playing')audio.playMusic(levelIndex);}
function updateSettings(){preferences.sound=!muted;preferences.weather=weatherEnabled;audio.configure(!muted,preferences.volume);$('sound').textContent=`Sound: ${muted?'off':'on'}`;$('sound').setAttribute('aria-pressed',String(!muted));$('weather').textContent=`Weather: ${weatherEnabled?'on':'off'}`;$('weather').setAttribute('aria-pressed',String(weatherEnabled));$('effects').textContent=`Effects: ${reducedMotion?'reduced':'full'}`;$('effects').setAttribute('aria-pressed',String(!reducedMotion));$('volume').value=Math.round(preferences.volume*100);savePreferences(preferences);}
function cacheTerrain(level){
  terrain=document.createElement('canvas');terrain.width=Math.max(WIDTH,level.width*TILE);terrain.height=HEIGHT;
  const surface=terrain.getContext('2d');surface.imageSmoothingEnabled=false;waterTiles=[];
  for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
    const tile=level.tiles[y][x];if(tile===11)continue;
    if(tile===48||tile===49){waterTiles.push({x:x*TILE,y:y*TILE,tile});continue;}
    surface.drawImage(images['outside_sprites.png'],tile%12*32,Math.floor(tile/12)*32,32,32,x*TILE,y*TILE,TILE,TILE);
  }
}
function image(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[file]=im;resolve(im);};im.onerror=()=>reject(new Error(`Could not load ${file}`));im.src=`/assets/${file}`;});}
function overlay(tag,title,text,action,showCharacters=false){
  $('overlay').hidden=false;$('overlay-tag').textContent=tag;$('overlay-title').textContent=title;$('overlay-text').textContent=text;
  $('primary').textContent=action;$('characters').hidden=!showCharacters;$('menu').hidden=showCharacters;$('pause').hidden=true;audio.pause();$('restart').hidden=true;
  $('continue').hidden=true;$('best-label').textContent=`BEST SCORE ${bestScore(0)}`;
}
function menu(){state='menu';world=null;keys.clear();overlay('YOUR NEXT ADVENTURE','Choose your fighter','Three fighters. Five worlds. One way through.','New adventure →',true);$('health-wrap').hidden=true;$('level-label').textContent='THE ADVENTURE AWAITS';$('enemies-label').textContent='';$('score-label').textContent='';$('journey').hidden=true;const s=savedRun();if(s){$('continue').hidden=false;$('continue').textContent=`Continue level ${s.level+1} · ${characters[s.character].name}`;}}
function start(){world=new World(levels[levelIndex],selected);trees=prepareTrees(world.level);cacheTerrain(world.level);state='playing';announced=false;keys.clear();particles=[];labels=[];shake=0;cameraX=Math.max(0,Math.min(world.level.width*TILE-WIDTH,world.player.x-WIDTH*.4));writeSave({level:levelIndex,character:selected,score:runScore});$('overlay').hidden=true;$('pause').hidden=false;$('pause').textContent='Pause';$('health-wrap').hidden=false;$('journey').hidden=false;document.querySelectorAll('[data-stage]').forEach((el,i)=>{el.classList.toggle('current',i===levelIndex);el.classList.toggle('cleared',i<levelIndex);el.setAttribute('aria-current',i===levelIndex?'step':'false');});canvas.focus();playMusic();}
function pause(){if(state==='playing'){state='paused';keys.clear();overlay('TAKE A BREATHER','Game paused',`${levelNames[levelIndex]} · ${world.kills}/${world.enemies.length} enemies defeated`,'Resume →');$('restart').hidden=false;}else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').hidden=false;canvas.focus();playMusic();}}
$('primary').onclick=()=>{if(state==='paused'){pause();return;}if(state==='menu'||state==='won'){levelIndex=0;runScore=0;}else if(state==='complete'){levelIndex++;runScore+=world.score;}start();};
$('continue').onclick=()=>{const s=savedRun();if(!s)return;levelIndex=s.level;runScore=s.score;selectCharacter(s.character);start();};
$('menu').onclick=menu;$('pause').onclick=pause;
$('sound').onclick=()=>{muted=!muted;updateSettings();if(!muted)playMusic();};
$('weather').onclick=()=>{weatherEnabled=!weatherEnabled;updateSettings();};
$('effects').onclick=()=>{preferences.effects=!preferences.effects;reducedMotion=systemReducedMotion||!preferences.effects;particles=[];shake=0;updateSettings();};
$('volume').oninput=()=>{preferences.volume=Number($('volume').value)/100;updateSettings();};
$('restart').onclick=start;
$('fullscreen').hidden=!document.fullscreenEnabled;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('arena').requestFullscreen();}catch{$('status').textContent='Full screen is unavailable in this browser.';}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
updateSettings();
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>selectCharacter(Number(b.dataset.character)));
function keydown(code,repeat=false){
  if(code==='Escape'&&!repeat){pause();return;}
  if(state!=='playing')return;
  keys.add(code);
  if(code==='KeyJ'||code==='KeyK')world.attack(code==='KeyK');
  if((code==='ShiftLeft'||code==='ShiftRight')&&!repeat)world.dash();
}
window.addEventListener('keydown',e=>{if((e.target instanceof HTMLButtonElement||e.target.closest?.('input,summary,select'))&&e.code!=='Escape')return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyJ','KeyK','ShiftLeft','ShiftRight','Escape'].includes(e.code)){e.preventDefault();keydown(e.code,e.repeat);}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;e.preventDefault();canvas.focus();world.attack(e.button===2);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keydown(b.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
function sprite(file,sw,sh,row,frame,x,y,w,h,flip=false){const im=images[file];if(!im)return;ctx.save();ctx.translate(Math.round(x+(flip?w:0)),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(im,frame*sw,row*sh,sw,sh,0,0,w,h);ctx.restore();}
function feedback(){for(const e of world.events.splice(0)){
  if(e.type==='jump')effect('jump');if(e.type==='attack')effect(e.power?'attack2':'attack1');
  if(e.type==='hit'||e.type==='parry')effect('attack3');if(e.type==='pickup')effect('jump',1.5);
  if(e.type==='damage')shake=reducedMotion?0:9;if(e.type==='hit')shake=reducedMotion?0:4;
  if(e.type==='damage'||e.type==='hit'||e.text)labels.push({x:e.x,y:e.y-30,text:e.text||`−${e.amount}`,color:e.type==='damage'?'#ff9b84':e.type==='hit'?'#fff1ca':'#d6ef93',life:.85});
  if(['hit','kill','break','pickup','jump','dash','parry'].includes(e.type)&&!reducedMotion){const count=e.type==='kill'?20:8;for(let i=0;i<count;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*200,vy:-Math.random()*180,color:e.type==='pickup'?'#a5e4c5':e.type==='break'?'#b78f62':e.type==='dash'?'#8edce0':'#e4eaa2',life:.35+Math.random()*.3});}
}}
function draw(elapsed=0){
  ctx.clearRect(0,0,WIDTH,HEIGHT);if(images['BGnew.png'])ctx.drawImage(images['BGnew.png'],-(cameraX*.08%120),0,WIDTH+120,HEIGHT);
  if(!world)return;
  const p=world.player,l=world.level,target=Math.max(0,Math.min(l.width*TILE-WIDTH,p.x+p.w/2-WIDTH*.5+p.facing*WIDTH*.12)),t=world.time;
  if(state==='playing')cameraX+=(target-cameraX)*(1-Math.exp(-8*elapsed));
  const camera=cameraX;shake=Math.max(0,shake-elapsed*30);
  const preset=weatherEnabled?weatherPresets[levelIndex]:weatherPresets[0];
  drawBackdrop(ctx,images,camera,t,preset,!reducedMotion&&weatherEnabled);
  ctx.save();ctx.translate(-Math.round(camera)+(reducedMotion?0:Math.sin(t*95)*shake),reducedMotion?0:Math.cos(t*80)*shake*.5);
  for(const tree of trees){const visual=treeSprite(tree,t,!reducedMotion);if(visual.x+visual.w<camera||visual.x>camera+WIDTH)continue;sprite(visual.file,visual.sw,visual.sh,visual.row,visual.frame,visual.x,visual.y,visual.w,visual.h,visual.flip);}
  ctx.drawImage(terrain,0,0);
  for(const water of waterTiles){
    if(water.x+TILE<camera||water.x>camera+WIDTH)continue;
    if(water.tile===48)sprite('water_atlas_animation.png',32,32,0,Math.floor(t*6)%4,water.x,water.y,TILE,TILE);
    else ctx.drawImage(images['water.png'],water.x,water.y,TILE,TILE);
  }
  for(const o of world.objects){if(o.used&&o.breakTime<=0)continue;const v=objectSprite(o,t);if(v&&v.x+v.w>=camera&&v.x<=camera+WIDTH)sprite(v.file,v.sw,v.sh,v.row,v.frame,v.x,v.y,v.w,v.h,v.flip);}
  for(const e of world.enemies){if(e.hp<=0)continue;
    const visual=enemySprite(e);
    sprite(visual.file,visual.sw,visual.sh,visual.row,visual.frame,visual.x,visual.y,visual.w,visual.h,visual.flip);
    if(e.hp<e.maxHp||e.windup>0){ctx.fillStyle='#17241c';ctx.fillRect(e.x-4,e.y-14,e.w+8,5);ctx.fillStyle='#ef9480';ctx.fillRect(e.x-4,e.y-14,(e.w+8)*Math.max(0,e.hp)/e.maxHp,5);}
    if(e.windup>0){ctx.fillStyle='#ffc971';ctx.font='bold 28px system-ui';ctx.fillText('!',e.x+e.w/2-5,e.y-26);ctx.strokeStyle='#ffc971';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x+e.w/2,e.y+e.h,30,Math.PI,Math.PI*2);ctx.stroke();}
  }
  for(const b of world.projectiles)ctx.drawImage(images['Ball.png'],b.x,b.y,b.w,b.h);
  const v=playerSprite(p,selected,t);
  if(p.dash>0&&!reducedMotion){ctx.globalAlpha=.25;sprite(v.file,v.sw,v.sh,v.row,v.frame,v.x-p.dashFacing*25,v.y,v.w,v.h,v.flip);ctx.globalAlpha=1;}
  if(p.invulnerable<=0||p.dash>0||Math.floor(t*15)%2===0)sprite(v.file,v.sw,v.sh,v.row,v.frame,v.x,v.y,v.w,v.h,v.flip);
  if(p.attack>0){ctx.strokeStyle=p.attack>0&&world.powerAttack?'#d6ef93':'#ffffff90';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,56,p.facing>0?-.9:Math.PI-.9,p.facing>0?.9:Math.PI+.9);ctx.stroke();}
  for(const dot of particles){ctx.globalAlpha=Math.max(0,dot.life/.65);ctx.fillStyle=dot.color;ctx.fillRect(dot.x,dot.y,4,4);}ctx.globalAlpha=1;
  ctx.font='bold 17px system-ui';ctx.textAlign='center';for(const label of labels){ctx.globalAlpha=Math.min(1,label.life*3);ctx.fillStyle=label.color;ctx.fillText(label.text,label.x,label.y);}ctx.globalAlpha=1;ctx.textAlign='left';
  ctx.restore();
  if(weatherEnabled)drawWeather(ctx,images,l,camera,t,preset,!reducedMotion);
  if(p.invulnerable>0&&p.dash<=0){ctx.fillStyle=`rgba(170,40,25,${Math.min(.1,p.invulnerable*.1)})`;ctx.fillRect(0,0,WIDTH,HEIGHT);}
  if(world.combo>1){ctx.fillStyle='#e6efaf';ctx.font='bold 22px system-ui';ctx.fillText(`${world.combo} HIT COMBO`,20,98);}
  ctx.fillStyle='#15251c';ctx.fillRect(20,22,144,8);ctx.fillStyle=p.power>=30?'#8edce0':'#5b7778';ctx.fillRect(20,22,144*p.power/100,8);ctx.fillStyle='#eff4dc';ctx.font='12px system-ui';ctx.fillText(`POWER ${Math.floor(p.power)}${p.power<30?' · RECHARGING':''}`,20,46);
  ctx.fillStyle=p.dashCooldown<=0&&p.power>=20?'#8edce0':'#a1b49d';ctx.fillText(p.dashCooldown>0?'DASH RECHARGING':p.power<20?'DASH · LOW POWER':'DASH READY · SHIFT',20,66);
  // Whole-level radar helps locate enemies behind the player and on other platforms.
  const radar={x:WIDTH-225,y:20,w:205,h:65};ctx.fillStyle='#102018dc';ctx.fillRect(radar.x-8,radar.y-8,radar.w+16,radar.h+28);
  ctx.strokeStyle='#6c8266';ctx.lineWidth=1;ctx.strokeRect(radar.x+camera/(l.width*TILE)*radar.w,radar.y,WIDTH/(l.width*TILE)*radar.w,radar.h);
  for(const e of world.enemies){if(e.hp<=0)continue;ctx.fillStyle=e.windup>0?'#ffc971':'#f29882';ctx.fillRect(radar.x+e.x/(l.width*TILE)*radar.w,radar.y+e.y/HEIGHT*radar.h,4,4);}
  ctx.fillStyle='#d6ef93';ctx.fillRect(radar.x+p.x/(l.width*TILE)*radar.w-2,radar.y+p.y/HEIGHT*radar.h-2,6,6);ctx.fillStyle='#adbea6';ctx.fillText('YOU ●     ENEMIES ●',radar.x,radar.y+radar.h+14);
  $('health').max=p.maxHp;$('health').value=p.hp;$('health').textContent=String(p.hp);$('health-number').textContent=`${p.hp}/${p.maxHp}`;$('score-label').textContent=`${runScore+world.score} PTS · ${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;$('level-label').textContent=`LEVEL ${levelIndex+1} / ${levels.length} · ${characters[selected].name.toUpperCase()}`;$('enemies-label').textContent=`${world.enemies.filter(e=>e.hp>0).length} ENEMIES LEFT`;
  $('stage-name').textContent=levelNames[levelIndex];$('weather-name').textContent=weatherEnabled?preset.name:'Weather off';$('objective').max=world.enemies.length||1;$('objective').value=world.kills;$('objective-label').textContent=`Defeat every enemy · ${world.kills}/${world.enemies.length}`;
}
function tick(now){const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;accumulator+=elapsed;
  while(accumulator>=1/60){if(state==='playing'){
    world.update(1/60,{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),jump:keys.has('Space')||keys.has('ArrowUp'),attack:keys.has('KeyJ'),powerAttack:keys.has('KeyK')});
    feedback();
    if(world.status!=='playing'&&!announced){announced=true;keys.clear();
      if(world.status==='dead'){state='dead';effect('die');overlay('THE FOREST FOUGHT BACK','Try again',`${world.kills}/${world.enemies.length} enemies defeated · Best combo ${world.maxCombo}. Dodge with Shift and interrupt amber attacks.`,'Retry level →');}
      else{effect('lvlcompleted');state=levelIndex===levels.length-1?'won':'complete';const total=runScore+world.score;bestScore(total);writeSave(state==='won'?null:{level:levelIndex+1,character:selected,score:total});overlay(world.damageTaken===0?'FLAWLESS VICTORY':'ALL ENEMIES DEFEATED',state==='won'?'You survived ZARVIVAL!':'Level cleared',`${world.kills} defeated · ${Math.floor(world.time)}s · ${total} points · Best combo ${world.maxCombo}`,state==='won'?'Play again →':'Next level →');}
    }
  }accumulator-=1/60;}
  if(state==='playing'){for(const dot of particles){dot.life-=elapsed;dot.x+=dot.vx*elapsed;dot.y+=dot.vy*elapsed;dot.vy+=500*elapsed;}particles=particles.filter(dot=>dot.life>0);for(const label of labels){label.life-=elapsed;label.y-=35*elapsed;}labels=labels.filter(label=>label.life>0);}
  draw(elapsed);requestAnimationFrame(tick);
}
async function load(){try{
  const files=['BGnew.png','outside_sprites.png','water.png','water_atlas_animation.png','Pine_tree.png','Large_Tree.png','pine1.png','pine2.png','mini_cloud.png','rain_particle.png','mushroom_sprite.png','Armadillo.png','Froggy.png','potions_sprites.png','objects_sprites.png','trap_atlas.png','Shooters.png','Ball.png',...characters.map(c=>c.file),...Array.from({length:5},(_,i)=>`lvls/${i+1}.png`)];
  let loaded=0;
  await Promise.all(files.map(async file=>{await image(file);$('overlay-text').textContent=`Preparing your adventure… ${Math.round(++loaded/files.length*100)}%`;}));
  for(let i=1;i<=5;i++){const im=images[`lvls/${i}.png`],scratch=document.createElement('canvas');scratch.width=im.width;scratch.height=im.height;const s=scratch.getContext('2d',{willReadFrequently:true});s.drawImage(im,0,0);levels.push(decodeLevel(im.width,im.height,s.getImageData(0,0,im.width,im.height).data));}
  document.querySelectorAll('[data-character] canvas').forEach((c,i)=>{const pc=characters[i],s=c.getContext('2d'),[x,y,w,h]=pc.portrait;s.imageSmoothingEnabled=false;const scale=78/Math.max(w,h);s.drawImage(images[pc.file],x,y,w,h,(100-w*scale)/2,(100-h*scale)/2,w*scale,h*scale);});
  $('primary').disabled=false;menu();requestAnimationFrame(tick);
}catch(error){state='error';$('overlay-title').textContent='The forest could not load';$('overlay-text').textContent=error.message;$('characters').hidden=true;$('primary').disabled=false;$('primary').textContent='Try loading again';$('primary').onclick=()=>location.reload();console.error(error);}}
load();
