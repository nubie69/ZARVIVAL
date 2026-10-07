import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, decodeLevel, move, solid, TILE } from '../web/engine.js';

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
