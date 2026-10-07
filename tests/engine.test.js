import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, characters, decodeLevel, enemySprite, move, solid, TILE } from '../web/engine.js';

function level() {
  return { width:10,height:14,spawn:{x:96,y:442},tiles:Array.from({length:14},(_,y)=>Array(10).fill(y>=10?0:11)),enemies:[{type:0,x:320,y:448}],objects:[] };
}
test('decodes the original RGB tile, entity and object format',()=>{
  const map=decodeLevel(2,2,new Uint8ClampedArray([11,100,255,255,0,255,4,255,48,0,0,255,49,2,6,255]));
  assert.deepEqual(map.tiles,[[11,0],[48,49]]);
  assert.deepEqual(map.spawn,{x:0,y:0});
  assert.equal(map.enemies.length,2);assert.equal(map.objects.length,3);
  assert.equal(solid(map,0,TILE),false);assert.equal(solid(map,TILE,0),true);
});

test('coyote time allows jumping just after leaving a platform',()=>{
  const world=new World(level());world.player.y=350;world.player.coyote=.08;
  world.update(1/60,{jump:true});assert.ok(world.player.vy<0);
  assert.ok(world.events.some(e=>e.type==='jump'));
});
test('jump press before landing is buffered, holding does not auto-jump again',()=>{
  const world=new World(level());world.player.y=436;world.player.vy=180;
  world.update(1/60,{jump:true});assert.equal(world.player.grounded,false);
  for(let i=0;i<6;i++)world.update(1/60,{jump:true});
  assert.ok(world.player.vy<0);
  for(let i=0;i<100;i++)world.update(1/60,{jump:true});
  assert.equal(world.events.filter(e=>e.type==='jump').length,1);
});
test('releasing jump produces a shorter hop',()=>{
  const held=new World(level()),tap=new World(level());held.player.grounded=true;tap.player.grounded=true;
  held.update(1/60,{jump:true});tap.update(1/60,{jump:true});
  for(let i=0;i<12;i++){held.update(1/60,{jump:true});tap.update(1/60,{jump:false});}
  assert.ok(held.player.y<tap.player.y-25);
});
test('enemies warn before striking and attacks can interrupt the warning',()=>{
  const map=level();map.enemies=[{type:0,x:135,y:442}];const world=new World(map);
  world.update(1/60);assert.ok(world.enemies[0].windup>0);assert.equal(world.player.hp,100);
  world.attack();world.update(1/60);assert.equal(world.enemies[0].windup,0);assert.equal(world.player.hp,100);
  assert.ok(world.enemies[0].recovery>0);
});
test('enemy strike hits after its windup but can be dodged',()=>{
  const map=level();map.enemies=[{type:0,x:135,y:442}];const hit=new World(map),dodge=new World(map);
  hit.update(1/60);dodge.update(1/60);dodge.player.x=300;
  for(let i=0;i<28;i++){hit.update(1/60);dodge.update(1/60);}
  assert.equal(hit.player.hp,85);assert.equal(dodge.player.hp,100);
});
test('fighters have distinct movement, health and power regeneration',()=>{
  const fighters=characters.map((_,i)=>new World(level(),i));
  for(const w of fighters){w.player.power=50;w.update(1/60,{right:true});}
  assert.ok(fighters[0].player.vx>fighters[2].player.vx);
  assert.ok(fighters[2].player.maxHp>fighters[0].player.maxHp);
  assert.ok(fighters[1].player.power>fighters[0].player.power);
});
test('kill feedback awards score and potions respect fighter maximum health',()=>{
  const map=level();map.enemies=[{type:1,x:135,y:442}];map.objects=[{type:0,x:96,y:442}];
  const world=new World(map,2);world.player.hp=135;world.attack();world.update(1/60);
  assert.equal(world.player.hp,140);assert.equal(world.score,110);assert.equal(world.kills,1);
  assert.ok(world.events.some(e=>e.type==='kill'));
});
test('floor collision stops a fast fall without tunnelling',()=>{
  const body={x:100,y:400,w:27,h:38,vy:900};
  const result=move(body,0,200,level());
  assert.equal(result.grounded,true);assert.ok(body.y+body.h<=480);assert.equal(body.vy,0);
});
test('player lands, jumps, and moves with the input',()=>{
  const world=new World(level());
  for(let i=0;i<30;i++)world.update(1/60);
  assert.equal(world.player.grounded,true);
  const {x,y}=world.player;world.update(1/60,{jump:true,right:true});
  assert.ok(world.player.y<y);assert.ok(world.player.x>x);assert.ok(world.player.vy<0);
});
test('one attack hits each enemy once and defeating all enemies clears the level',()=>{
  const map=level();map.enemies=[{type:0,x:135,y:442}];const world=new World(map);
  assert.equal(world.attack(),true);
  for(let i=0;i<10;i++)world.update(1/60);
  assert.equal(world.enemies[0].hp,25);
  for(let i=0;i<20;i++)world.update(1/60);
  world.player.x=world.enemies[0].x-40;world.player.facing=1;
  assert.equal(world.attack(),true);world.update(1/60);
  assert.equal(world.status,'complete');
});
test('power attacks consume energy and respect cooldown',()=>{
  const world=new World(level());assert.equal(world.attack(true),true);assert.equal(world.player.power,70);assert.equal(world.attack(true),false);
  world.player.cooldown=0;world.player.power=20;assert.equal(world.attack(true),false);
});
test('damage has invulnerability and death prevents updates',()=>{
  const world=new World(level());world.damage(25);world.damage(25);assert.equal(world.player.hp,75);
  world.player.invulnerable=0;world.damage(100);assert.equal(world.status,'dead');
  const x=world.player.x;world.update(1,{right:true});assert.equal(world.player.x,x);
});
test('water kills and health potions are consumed only once',()=>{
  const map=level();map.objects=[{type:0,x:96,y:442}];const world=new World(map);world.player.hp=50;
  world.update(1/60);assert.equal(world.player.hp,75);world.update(1/60);assert.equal(world.player.hp,75);
  world.level.tiles[9][2]=48;world.update(1/60);assert.equal(world.status,'dead');
});

test('every enemy starts on its platform and its sprite ends at its feet',()=>{
  for(let type=0;type<3;type++){
    const map=level();map.enemies=[{type,x:240,y:432}];const world=new World(map),e=world.enemies[0];
    assert.equal(e.y+e.h,480);assert.equal(e.grounded,true);
    for(const facing of [-1,1])for(const phase of ['idle','run','attack','hurt']){
      e.facing=facing;e.vx=phase==='run'?60:0;e.windup=phase==='attack'?.3:0;e.hurt=phase==='hurt'?.2:0;e.animationTime=.3;
      const visual=enemySprite(e);
      assert.ok(Math.abs(visual.y+visual.h-(e.y+e.h))<.001);
      assert.equal(visual.x+visual.w/2,e.x+e.w/2);
      assert.equal(visual.row,{idle:0,run:1,attack:2,hurt:3}[phase]);
    }
  }
});

test('enemies patrol safely at cliffs without flipping direction every frame',()=>{
  for(let type=0;type<3;type++){
    const map=level();map.width=20;map.spawn={x:700,y:442};
    map.tiles=Array.from({length:14},(_,y)=>Array.from({length:20},(_,x)=>y>=10&&(x<6||x>=10)?0:11));
    map.enemies=[{type,x:240,y:432}];const world=new World(map),e=world.enemies[0];e.facing=1;
    let turns=0;
    for(let i=0;i<1800;i++){
      const facing=e.facing;world.update(1/60);if(facing!==e.facing)turns++;
      assert.equal(world.status,'playing');assert.ok(e.hp>0);
      assert.ok(e.x>=0&&e.x+e.w<=288);assert.ok(e.y+e.h<=480.01);
    }
    assert.ok(turns<30,`Enemy ${type} turned ${turns} times in 30 seconds`);
  }
});

test('chase accelerates smoothly and walls prevent chasing through terrain',()=>{
  const open=level();open.spawn={x:390,y:442};open.enemies=[{type:0,x:240,y:432}];
  const chaser=new World(open),e=chaser.enemies[0];e.facing=1;
  chaser.update(1/60);assert.ok(e.vx>0&&e.vx<20);
  for(let i=0;i<16;i++)chaser.update(1/60);
  assert.ok(e.vx>55);
  const closed=level();closed.spawn={x:390,y:442};closed.enemies=[{type:0,x:240,y:432}];closed.tiles[9][7]=0;
  const patrol=new World(closed),guard=patrol.enemies[0];guard.facing=1;
  for(let i=0;i<30;i++)patrol.update(1/60);
  assert.ok(guard.vx<=55);assert.ok(guard.x+guard.w<=7*TILE);
});
