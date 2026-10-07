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
  { name: 'Goblin', file: 'player1.png', sw: 64, sh: 64, frames: [4,10,10,2,12], ox:25, oy:10, speed:310, hp:100, damage:25, cooldown:.32, regen:8 },
  { name: 'Rez', file: 'aliah.png', sw: 49, sh: 49, frames: [8,10,6,6,9], ox:10, oy:18, speed:270, hp:115, damage:30, cooldown:.4, regen:12 },
  { name: 'Skull', file: 'player2.png', sw: 99, sh: 46, frames: [8,8,3,3,6], ox:40, oy:20, speed:230, hp:140, damage:40, cooldown:.5, regen:8 },
];

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
    this.player={...level.spawn,w:27,h:38,vy:0,facing:1,hp:this.stats.hp,maxHp:this.stats.hp,power:100,invulnerable:0,attack:0,cooldown:0,grounded:false,vx:0,knockback:0,coyote:0,jumpBuffer:0};
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
    this.objects=level.objects.map(o=>({...o,w:32,h:o.type===4?15:32,used:false,timer:1.5}));
    this.projectiles=[]; this.hit=new Set();
  }
  attack(power=false) {
    const p=this.player;
    if (this.status!=='playing'||p.cooldown>0||(power&&p.power<30)) return false;
    p.attack=power?.4:.26; p.cooldown=power?.65:this.stats.cooldown; this.powerAttack=power;
    if(power) p.power-=30;
    this.hit.clear(); this.emit('attack',p,{power}); return true;
  }
  emit(type,body,extra={}) { this.events.push({type,x:body.x+body.w/2,y:body.y+body.h/2,...extra}); }
  damage(amount,sourceX=this.player.x) {
    const p=this.player;
    if(p.invulnerable>0||this.status!=='playing') return;
    p.hp=Math.max(0,p.hp-amount);p.invulnerable=1;
    p.knockback=p.x>=sourceX?180:-180;
    this.emit('damage',p,{amount});
    if(!p.hp) this.status='dead';
  }
  update(dt,input={}) {
    if(this.status!=='playing') return;
    this.time+=dt;const p=this.player;
    p.invulnerable=Math.max(0,p.invulnerable-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.power=Math.min(100,p.power+dt*this.stats.regen);
    p.vx=(Number(!!input.right)-Number(!!input.left))*this.stats.speed;
    if(p.vx) p.facing=Math.sign(p.vx);
    p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
    p.jumpBuffer=input.jump&&!this.jumpHeld?.14:Math.max(0,p.jumpBuffer-dt);
    if(p.jumpBuffer>0&&p.coyote>0){p.vy=-620;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump',p);}
    if(!input.jump&&this.jumpHeld&&p.vy<-260)p.vy=-260;
    this.jumpHeld=!!input.jump;
    p.vy=Math.min(900,p.vy+1700*dt);
    const motion=move(p,((p.attack>0&&this.powerAttack?p.facing*550:p.vx)+p.knockback)*dt,p.vy*dt,this.level);p.grounded=motion.grounded;
    p.knockback*=Math.exp(-12*dt);
    const footY=Math.floor((p.y+p.h-1)/TILE),footX=Math.floor((p.x+p.w/2)/TILE);
    if(p.y>this.level.height*TILE||[48,49].includes(this.level.tiles[footY]?.[footX])){p.hp=0;this.status='dead';}
    const attackBox={x:p.facing>0?p.x+p.w:p.x-65,y:p.y-12,w:65,h:p.h+24};
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
      if(p.attack>0&&overlaps(attackBox,e)&&!this.hit.has(e)){
        const amount=this.powerAttack?this.stats.damage*2:this.stats.damage;
        this.hit.add(e);e.hp-=amount;e.hurt=.3;e.windup=0;e.recovery=.45;e.knockback=p.facing*(this.powerAttack?230:110);
        this.emit('hit',e,{amount});this.score+=10;
        if(e.hp<=0){this.kills++;this.score+=100;this.emit('kill',e);}
      }
      if(e.hp>0&&e.hurt<=0){
        const strike={x:e.facing>0?e.x:e.x-38,y:e.y-8,w:e.w+38,h:e.h+16};
        if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup===0){e.recovery=.8;this.emit('enemyAttack',e);if(overlaps(p,strike))this.damage([15,20,25][e.type],e.x);}}
        else if(e.recovery<=0&&chasing&&overlaps(p,strike)){e.windup=.42;this.emit('warning',e);}
      }
      if(e.hurt>0||e.windup>0||e.recovery>0)e.vx=0;
      const row=e.hurt>0?3:e.windup>0?2:Math.abs(e.vx)>5?1:0;
      e.animationTime=row===e.animationRow?e.animationTime+dt:0;e.animationRow=row;
    }
    for(const o of this.objects){
      if(o.used)continue;
      const box={...o,y:o.type===4?o.y+33:o.y};
      if(o.type===4&&overlaps(p,box))this.damage(35,o.x);
      if(o.type<=1&&overlaps(p,box)){o.used=true;if(o.type===0)p.hp=Math.min(p.maxHp,p.hp+25);else p.power=Math.min(100,p.power+35);this.emit('pickup',o,{text:o.type===0?'+25 HP':'+35 POWER'});}
      if((o.type===2||o.type===3)&&p.attack>0&&overlaps(attackBox,box)){o.used=true;p.hp=Math.min(p.maxHp,p.hp+15);this.score+=25;this.emit('break',o,{text:'+15 HP'});}
      if(o.type===5||o.type===6){
        o.timer-=dt;
        if(o.timer<=0){o.timer=2.5;this.projectiles.push({x:o.x+24,y:o.y+20,w:14,h:14,vx:o.type===5?-240:240});}
      }
    }
    this.projectiles=this.projectiles.filter(b=>{
      b.x+=b.vx*dt;
      if(overlaps(p,b)){this.damage(20,b.x);return false;}
      return !solid(this.level,b.x+b.w/2,b.y+b.h/2)&&b.x>=0&&b.x<this.level.width*TILE;
    });
    if(this.status==='playing'&&this.enemies.every(e=>e.hp<=0))this.status='complete';
  }
}
