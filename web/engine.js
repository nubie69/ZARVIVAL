export const TILE = 48;
export const WIDTH = 1248;
export const HEIGHT = 672;
export const characters = [
  { name: 'Goblin', file: 'player1.png', sw: 64, sh: 64, frames: [4,10,10,2,12], ox:25, oy:10 },
  { name: 'Rez', file: 'aliah.png', sw: 49, sh: 49, frames: [8,10,6,6,9], ox:10, oy:18 },
  { name: 'Skull', file: 'player2.png', sw: 99, sh: 46, frames: [8,8,3,3,6], ox:40, oy:20 },
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
  return { grounded, blockedX };
}
export class World {
  constructor(level, character=0) {
    this.level=level; this.character=character; this.time=0; this.status='playing'; this.kills=0;
    this.player={...level.spawn,w:27,h:38,vy:0,facing:1,hp:100,power:100,invulnerable:0,attack:0,cooldown:0,grounded:false,vx:0};
    this.enemies=level.enemies.map((e,i)=>({...e,w:e.type===2?42:30,h:32,vy:0,hp:e.type===0?50:25,facing:i%2?1:-1,hurt:0}));
    this.objects=level.objects.map(o=>({...o,w:32,h:o.type===4?15:32,used:false,timer:1.5}));
    this.projectiles=[]; this.hit=new Set();
  }
  attack(power=false) {
    const p=this.player;
    if (this.status!=='playing'||p.cooldown>0||(power&&p.power<30)) return false;
    p.attack=power?.4:.3; p.cooldown=power?.65:.4; this.powerAttack=power;
    if(power) p.power-=30;
    this.hit.clear(); return true;
  }
  damage(amount) {
    const p=this.player;
    if(p.invulnerable>0) return;
    p.hp=Math.max(0,p.hp-amount);p.invulnerable=1;
    if(!p.hp) this.status='dead';
  }
  update(dt,input={}) {
    if(this.status!=='playing') return;
    this.time+=dt;const p=this.player;
    p.invulnerable=Math.max(0,p.invulnerable-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.power=Math.min(100,p.power+dt*8);
    p.vx=(Number(!!input.right)-Number(!!input.left))*270;
    if(p.vx) p.facing=Math.sign(p.vx);
    if(input.jump&&p.grounded){p.vy=-620;p.grounded=false;}
    p.vy=Math.min(900,p.vy+1700*dt);
    const motion=move(p,(p.attack>0&&this.powerAttack?p.facing*550:p.vx)*dt,p.vy*dt,this.level);p.grounded=motion.grounded;
    const footY=Math.floor((p.y+p.h-1)/TILE),footX=Math.floor((p.x+p.w/2)/TILE);
    if(p.y>this.level.height*TILE||[48,49].includes(this.level.tiles[footY]?.[footX])){p.hp=0;this.status='dead';}
    const attackBox={x:p.facing>0?p.x+p.w:p.x-65,y:p.y-12,w:65,h:p.h+24};
    for(const e of this.enemies){
      if(e.hp<=0)continue;
      e.hurt=Math.max(0,e.hurt-dt);
      const near=Math.abs(p.x-e.x)<320&&Math.abs(p.y-e.y)<65;
      if(near)e.facing=p.x>e.x?1:-1;
      e.vy=Math.min(900,e.vy+1700*dt);
      const speed=(e.type===1?100:65)*e.facing;
      const ahead=e.facing>0?e.x+e.w+6:e.x-6;
      if(!solid(this.level,ahead,e.y+e.h+5)&&solid(this.level,e.x+e.w/2,e.y+e.h+5))e.facing*=-1;
      const result=move(e,e.hurt>0?0:speed*dt,e.vy*dt,this.level);
      if(result.blockedX)e.facing*=-1;
      if(e.y>this.level.height*TILE){e.hp=0;this.kills++;continue;}
      if(p.attack>0&&overlaps(attackBox,e)&&!this.hit.has(e)){
        this.hit.add(e);e.hp-=this.powerAttack?50:25;e.hurt=.3;
        if(e.hp<=0)this.kills++;
      }
      if(e.hp>0&&overlaps(p,e))this.damage([15,20,25][e.type]);
    }
    for(const o of this.objects){
      if(o.used)continue;
      const box={...o,y:o.type===4?o.y+33:o.y};
      if(o.type===4&&overlaps(p,box))this.damage(35);
      if(o.type<=1&&overlaps(p,box)){o.used=true;if(o.type===0)p.hp=Math.min(100,p.hp+25);else p.power=Math.min(100,p.power+35);}
      if((o.type===2||o.type===3)&&p.attack>0&&overlaps(attackBox,box)){o.used=true;p.hp=Math.min(100,p.hp+15);}
      if(o.type===5||o.type===6){
        o.timer-=dt;
        if(o.timer<=0){o.timer=2.5;this.projectiles.push({x:o.x+24,y:o.y+20,w:14,h:14,vx:o.type===5?-240:240});}
      }
    }
    this.projectiles=this.projectiles.filter(b=>{
      b.x+=b.vx*dt;
      if(overlaps(p,b)){this.damage(20);return false;}
      return !solid(this.level,b.x+b.w/2,b.y+b.h/2)&&b.x>=0&&b.x<this.level.width*TILE;
    });
    if(this.status==='playing'&&this.enemies.every(e=>e.hp<=0))this.status='complete';
  }
}
