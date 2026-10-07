export const TILE = 48;
export const WIDTH = 1248;
export const HEIGHT = 672;
export const enemyTypes = [
  { file:'mushroom_sprite.png', sw:80, sh:64, scale:1.5, w:40, h:46, patrol:55, chase:85, frames:[7,7,10,4] },
  { file:'Armadillo.png', sw:32, sh:32, scale:1.8, w:38, h:22, patrol:70, chase:125, frames:[8,4,8,3] },
  { file:'Froggy.png', sw:384, sh:128, scale:.5, w:42, h:32, patrol:55, chase:95, frames:[5,8,8,4] },
];

export function enemySprite(enemy) {
  const type=enemyTypes[enemy.type];
  const row=enemy.hurt>0?3:enemy.windup>0?2:Math.abs(enemy.vx)>5?1:0;
  const w=type.sw*type.scale,h=type.sh*type.scale;
  return { file:type.file, sw:type.sw, sh:type.sh, row, frame:Math.floor(enemy.animationTime*9)%type.frames[row], x:enemy.x+enemy.w/2-w/2, y:enemy.y+enemy.h-h, w, h, flip:enemy.facing>0 };
}
export const characters = [
  { name: 'Goblin', file: 'player1.png', sw: 64, sh: 64, frames: [4,10,10,2,12], anchor:29, foot:39, portrait:[19,22,20,17], speed:310, hp:100, damage:25, cooldown:.32, regen:8 },
  { name: 'Rez', file: 'aliah.png', sw: 49, sh: 49, frames: [8,10,6,6,9], anchor:24, foot:49, portrait:[14,20,20,29], speed:270, hp:115, damage:30, cooldown:.4, regen:12 },
  { name: 'Skull', file: 'player2.png', sw: 99, sh: 46, frames: [8,8,3,3,6], anchor:44, foot:46, portrait:[29,22,30,24], speed:230, hp:140, damage:40, cooldown:.5, regen:8 },
];

export function playerSprite(player,character,time) {
  const pc=characters[character],row=player.attack>0?4:!player.grounded?(player.vy<0?2:3):Math.abs(player.vx)>5?1:0;
  const flip=player.facing<0,scale=1.5;
  return {file:pc.file,sw:pc.sw,sh:pc.sh,row,frame:Math.floor(time*10)%pc.frames[row],x:player.x+player.w/2-(flip?pc.sw-pc.anchor:pc.anchor)*scale,y:player.y+player.h-pc.foot*scale,w:pc.sw*scale,h:pc.sh*scale,flip};
}

export function objectSprite(object,time) {
  const o=object;
  if(o.type<=1)return {file:'potions_sprites.png',sw:12,sh:16,row:o.type,frame:Math.floor(time*8)%7,x:o.x,y:o.y-3-Math.sin(time*3+o.x)*3,w:o.w,h:o.h,flip:false};
  if(o.type<=3)return {file:'objects_sprites.png',sw:40,sh:30,row:o.type===2?1:0,frame:o.used?Math.min(7,Math.floor((.4-o.breakTime)*20)):0,x:o.x,y:o.y,w:o.w,h:o.h,flip:false};
  if(o.type===4)return {file:'trap_atlas.png',sw:32,sh:32,row:0,frame:0,x:o.x,y:o.y+o.h-TILE,w:TILE,h:TILE,flip:false};
  if(o.type<=6)return {file:'Shooters.png',sw:64,sh:32,row:0,frame:o.timer<.35?1:0,x:o.x,y:o.y,w:o.w,h:o.h,flip:o.type===6};
  return null;
}

// Level PNGs use red for tiles, green for entities, and blue for objects,
// matching the original Java Level loader.
export function decodeLevel(width, height, rgba) {
  const level = { width, height, tiles: [], enemies: [], objects: [], spawn: null };
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r,g,b] = rgba.slice(i, i + 3);
      row.push(r >= 50 ? 0 : r);
      if (g === 100) level.spawn = { x:x*TILE, y:y*TILE };
      if (g <= 2) level.enemies.push({ type:g, x:x*TILE, y:y*TILE });
      if (b <= 9) level.objects.push({ type:b, x:x*TILE, y:y*TILE });
    }
    level.tiles.push(row);
  }
  if (!level.spawn) throw new Error('Level has no player spawn.');
  return level;
}
export function solid(level, x, y) {
  if (x < 0 || x >= level.width*TILE || y < 0) return true;
  if (y >= level.height*TILE) return false;
  return ![11,48,49].includes(level.tiles[Math.floor(y/TILE)][Math.floor(x/TILE)]);
}
export function overlaps(a,b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function floorAt(level,x,y) {
  // Map boundaries are walls, not ground to stand on.
  return x>=0&&x<level.width*TILE&&y<level.height*TILE&&solid(level,x,y);
}
function canChase(level,enemy,player) {
  if(Math.abs(player.x-enemy.x)>320||Math.abs(player.y+player.h-enemy.y-enemy.h)>40)return false;
  const from=enemy.x+enemy.w/2,to=player.x+player.w/2;
  const count=Math.max(1,Math.ceil(Math.abs(to-from)/12));
  for(let i=1;i<=count;i++){
    const x=from+(to-from)*i/count;
    if(solid(level,x,enemy.y+enemy.h/2)||!floorAt(level,x,enemy.y+enemy.h+2))return false;
  }
  return true;
}
export function clearSight(level,a,b) {
  const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;
  const steps=Math.ceil(Math.hypot(bx-ax,by-ay)/8);
  for(let i=1;i<steps;i++)if(solid(level,ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps))return false;
  return true;
}
export function move(body, dx, dy, level) {
  // Small steps prevent tunnelling through walls during power attacks.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
  let grounded = false, blockedX = false;
  const blocked = () => solid(level,body.x,body.y) || solid(level,body.x+body.w-.01,body.y) || solid(level,body.x,body.y+body.h-.01) || solid(level,body.x+body.w-.01,body.y+body.h-.01);
  for (let i=0;i<steps;i++) {
    body.x += dx/steps;
    if (blocked()) { body.x-=dx/steps; blockedX=true; }
    body.y += dy/steps;
    if (blocked()) { body.y-=dy/steps; if (dy>0) grounded=true; body.vy=0; }
  }
  grounded ||= dy>=0 && (solid(level,body.x+.1,body.y+body.h+1) || solid(level,body.x+body.w-.1,body.y+body.h+1));
  return { grounded, blockedX };
}
export class World {
  constructor(level, character=0) {
    this.level=level; this.character=character; this.stats=characters[character]; this.time=0; this.status='playing'; this.kills=0; this.score=0; this.events=[];
    this.player={...level.spawn,w:27,h:38,vy:0,facing:1,hp:this.stats.hp,maxHp:this.stats.hp,power:100,invulnerable:0,attack:0,cooldown:0,grounded:false,vx:0,knockback:0,coyote:0,jumpBuffer:0,dash:0,dashCooldown:0,dashFacing:1};
    this.combo=0;this.maxCombo=0;this.comboTime=0;this.damageTaken=0;
    this.jumpHeld=false;
    this.enemies=level.enemies.map((spawn,i)=>{
      const type=enemyTypes[spawn.type];
      const e={...spawn,w:type.w,h:type.h,x:spawn.x+(TILE-type.w)/2,vy:0,vx:0,hp:spawn.type===0?50:25,maxHp:spawn.type===0?50:25,facing:i%2?1:-1,hurt:0,windup:0,recovery:0,knockback:0,grounded:false,turnLock:0,animationTime:0,animationRow:0};
      // Level markers identify a tile, not the top of differently sized bodies.
      // Align enemies to the floor immediately below that marker before rendering.
      const floorY=(Math.floor(spawn.y/TILE)+1)*TILE;
      if(floorAt(level,e.x+e.w/2,floorY)){
        e.y=floorY-e.h;
        e.grounded=true;
      }
      return e;
    });
    this.objects=level.objects.map(o=>{
      const w=o.type<=1?18:o.type<=3?48:o.type===4?32:64;
      const h=o.type<=1?24:o.type<=3?36:o.type===4?15:32;
      const floorY=(Math.floor(o.y/TILE)+1)*TILE;
      return {...o,x:o.x+(TILE-w)/2,y:o.type<=6&&floorAt(level,o.x+TILE/2,floorY)?floorY-h:o.y,w,h,used:false,timer:1.5,breakTime:0};
    });
    this.projectiles=[]; this.hit=new Set();
  }
  attack(power=false) {
    const p=this.player;
    if (this.status!=='playing'||p.cooldown>0||(power&&p.power<30)) return false;
    p.attack=power?.4:.26; p.cooldown=power?.65:this.stats.cooldown; this.powerAttack=power;
    if(power) p.power-=30;
    this.attackFacing=p.facing;
    this.hit.clear(); this.emit('attack',p,{power}); return true;
  }
  dash() {
    const p=this.player;
    if(this.status!=='playing'||p.dashCooldown>0||p.power<20)return false;
    p.power-=20;p.dash=.16;p.dashCooldown=.8;p.dashFacing=p.facing;
    p.invulnerable=Math.max(p.invulnerable,.18);this.emit('dash',p);return true;
  }
  emit(type,body,extra={}) { this.events.push({type,x:body.x+body.w/2,y:body.y+body.h/2,...extra}); }
  damage(amount,sourceX=this.player.x) {
    const p=this.player;
    if(p.invulnerable>0||this.status!=='playing') return;
    p.hp=Math.max(0,p.hp-amount);p.invulnerable=1;
    this.damageTaken+=amount;this.combo=0;this.comboTime=0;
    p.knockback=p.x>=sourceX?180:-180;
    this.emit('damage',p,{amount});
    if(!p.hp) this.status='dead';
  }
  update(dt,input={}) {
    if(this.status!=='playing') return;
    this.time+=dt;const p=this.player;
    this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;
    p.dash=Math.max(0,p.dash-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    p.invulnerable=Math.max(0,p.invulnerable-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.power=Math.min(100,p.power+dt*this.stats.regen);
    const targetVx=(Number(!!input.right)-Number(!!input.left))*this.stats.speed;
    const acceleration=this.stats.speed*(targetVx?10:16);
    p.vx+=Math.max(-acceleration*dt,Math.min(acceleration*dt,targetVx-p.vx));
    if(targetVx&&p.attack<=0&&p.dash<=0)p.facing=Math.sign(targetVx);
    if(input.attack)this.attack(false);else if(input.powerAttack)this.attack(true);
    p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
    p.jumpBuffer=input.jump&&!this.jumpHeld?.14:Math.max(0,p.jumpBuffer-dt);
    if(p.jumpBuffer>0&&p.coyote>0){p.vy=-620;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump',p);}
    if(!input.jump&&this.jumpHeld&&p.vy<-260)p.vy=-260;
    this.jumpHeld=!!input.jump;
    p.vy=Math.min(900,p.vy+1700*dt);
    const speed=p.dash>0?p.dashFacing*650:p.attack>0&&this.powerAttack?this.attackFacing*550:p.vx;
    const motion=move(p,(speed+p.knockback)*dt,p.vy*dt,this.level);p.grounded=motion.grounded;
    if(motion.blockedX){p.vx=0;p.knockback=0;p.dash=0;}
    p.knockback*=Math.exp(-12*dt);
    const footY=Math.floor((p.y+p.h-1)/TILE),footX=Math.floor((p.x+p.w/2)/TILE);
    if(p.y>this.level.height*TILE||[48,49].includes(this.level.tiles[footY]?.[footX])){p.hp=0;this.status='dead';return;}
    const facing=this.attackFacing??p.facing;
    const attackBox={x:facing>0?p.x+p.w:p.x-65,y:p.y-12,w:65,h:p.h+24};
    for(const e of this.enemies){
      if(e.hp<=0)continue;
      e.hurt=Math.max(0,e.hurt-dt);
      e.recovery=Math.max(0,e.recovery-dt);
      e.turnLock=Math.max(0,e.turnLock-dt);
      const type=enemyTypes[e.type];
      const chasing=e.grounded&&canChase(this.level,e,p);
      const resting=e.hurt>0||e.windup>0||e.recovery>0;
      if(chasing&&!resting&&e.turnLock<=0)e.facing=p.x+p.w/2>e.x+e.w/2?1:-1;
      e.vy=Math.min(900,e.vy+1700*dt);
      const ahead=e.facing>0?e.x+e.w+8:e.x-8;
      const obstacle=solid(this.level,ahead,e.y+e.h/2);
      const ledge=e.grounded&&!floorAt(this.level,ahead,e.y+e.h+2);
      if(!resting&&(obstacle||ledge)){
        e.facing*=-1;e.turnLock=.5;e.vx=0;
      }
      const target=resting||!e.grounded?0:e.facing*(chasing&&e.turnLock<=0?type.chase:type.patrol);
      e.vx+=Math.max(-420*dt,Math.min(420*dt,target-e.vx));
      const result=move(e,(e.vx+e.knockback)*dt,e.vy*dt,this.level);
      e.grounded=result.grounded;
      e.knockback*=Math.exp(-12*dt);
      if(result.blockedX){e.vx=0;e.knockback=0;if(!resting&&e.turnLock<=0){e.facing*=-1;e.turnLock=.5;}}
      if(e.y>this.level.height*TILE){e.hp=0;this.kills++;this.score+=100;continue;}
      if(p.attack>0&&overlaps(attackBox,e)&&!this.hit.has(e)&&clearSight(this.level,p,e)){
        const amount=this.powerAttack?this.stats.damage*2:this.stats.damage;
        this.hit.add(e);e.hp-=amount;e.hurt=.3;e.windup=0;e.recovery=.45;e.knockback=p.facing*(this.powerAttack?230:110);
        this.emit('hit',e,{amount});this.score+=10;
        this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.comboTime=2;
        if(e.hp<=0){this.kills++;this.score+=100;this.emit('kill',e);}
      }
      if(e.hp>0&&e.hurt<=0){
        const strike={x:e.facing>0?e.x:e.x-38,y:e.y-8,w:e.w+38,h:e.h+16};
        if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup===0){e.recovery=.8;this.emit('enemyAttack',e);if(overlaps(p,strike)&&clearSight(this.level,e,p))this.damage([15,20,25][e.type],e.x);}}
        else if(e.recovery<=0&&chasing&&overlaps(p,strike)){e.windup=.42;this.emit('warning',e);}
      }
      if(e.hurt>0||e.windup>0||e.recovery>0)e.vx=0;
      const row=e.hurt>0?3:e.windup>0?2:Math.abs(e.vx)>5?1:0;
      e.animationTime=row===e.animationRow?e.animationTime+dt:0;e.animationRow=row;
    }
    if(this.status!=='playing')return;
    for(const o of this.objects){
      o.breakTime=Math.max(0,o.breakTime-dt);
      if(o.used)continue;
      const box=o;
      if(o.type===4&&overlaps(p,box))this.damage(35,o.x);
      if(this.status!=='playing')return;
      if(o.type<=1&&overlaps(p,box)){o.used=true;if(o.type===0)p.hp=Math.min(p.maxHp,p.hp+25);else p.power=Math.min(100,p.power+35);this.emit('pickup',o,{text:o.type===0?'+25 HP':'+35 POWER'});}
      if((o.type===2||o.type===3)&&p.attack>0&&overlaps(attackBox,box)&&clearSight(this.level,p,o)){o.used=true;o.breakTime=.4;p.hp=Math.min(p.maxHp,p.hp+15);this.score+=25;this.emit('break',o,{text:'+15 HP'});}
      if(o.type===5||o.type===6){
        o.timer-=dt;
        if(o.timer<=0){o.timer=2.5;this.projectiles.push({x:o.type===5?o.x-14:o.x+o.w,y:o.y+12,w:14,h:14,vx:o.type===5?-240:240});this.emit('cannon',o);}
      }
    }
    this.projectiles=this.projectiles.filter(b=>{
      const steps=Math.max(1,Math.ceil(Math.abs(b.vx*dt)/4));
      for(let i=0;i<steps;i++){
        b.x+=b.vx*dt/steps;
        if(solid(this.level,b.x+b.w/2,b.y+b.h/2)||b.x<0||b.x>=this.level.width*TILE)return false;
        if(p.attack>0&&overlaps(attackBox,b)&&clearSight(this.level,p,b)){p.power=Math.min(100,p.power+5);this.emit('parry',b,{text:'BLOCKED'});return false;}
        if(overlaps(p,b)){this.damage(20,b.x);return false;}
      }
      return true;
    });
    if(this.status==='playing'&&this.enemies.every(e=>e.hp<=0))this.status='complete';
  }
}
