import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, TILE } from '../web/engine.js';
import { prepareTrees, treeSprite, forestTiles, rainSegments, weatherPresets, drawWeather } from '../web/scenery.js';

function level(){return {width:30,height:14,tiles:Array.from({length:14},(_,y)=>Array(30).fill(y>=10?0:11)),objects:[]};}

test('tree sheets use individual frames with roots on the terrain surface',()=>{
  const map=level();map.objects=[{type:7,x:96,y:336},{type:8,x:192,y:576},{type:9,x:288,y:432}];
  const trees=prepareTrees(map);assert.equal(trees.length,3);
  for(const tree of trees)for(const t of [0,.3,4,100]){
    const visual=treeSprite(tree,t);
    assert.equal(visual.y+visual.h,480);
    assert.equal(visual.x+visual.w/2,tree.x);
    assert.ok(visual.frame>=0&&visual.frame<tree.frames);
    assert.ok((visual.frame+1)*visual.sw<=(tree.file==='Pine_tree.png'?848:1850));
  }
  assert.equal(trees[2].flip,true);assert.equal(treeSprite(trees[0],100,false).frame,0);
});
test('tree markers over water or without a platform do not create floating trees',()=>{
  const map=level();for(const row of map.tiles)row[2]=11;map.tiles[10][4]=48;
  map.objects=[{type:7,x:96,y:336},{type:8,x:192,y:336}];
  assert.deepEqual(prepareTrees(map),[]);
});
test('parallax forest covers the view even after scrolling far in either direction',()=>{
  for(const camera of [0,1000,4608,-500])for(const speed of [.18,.3]){
    const positions=forestTiles(camera,speed);
    assert.ok(positions[0]<=0);assert.ok(positions.at(-1)+1032>=WIDTH);
    for(let i=1;i<positions.length;i++)assert.equal(positions[i]-positions[i-1],1032);
  }
});
test('rain moves deterministically and ends above ground and platform roofs',()=>{
  const map=level();map.tiles[3][8]=0;
  const rain=rainSegments(map,0,2),later=rainSegments(map,0,2.1);
  assert.ok(rain.length>0&&rain.length<=140);assert.notDeepEqual(rain,later);
  assert.deepEqual(rain,rainSegments(map,0,2));
  for(const drop of rain){
    assert.ok(drop.x>=0&&drop.x<WIDTH&&drop.y>=0&&drop.length>0);
    const column=Math.floor(drop.x/TILE),floor=column===8?3*TILE:10*TILE;
    assert.ok(drop.y+drop.length<=floor);
  }
});
test('reduced motion keeps rainy atmosphere while disabling falling particles',()=>{
  const images={'rain_particle.png':{}},calls=[];
  const ctx={save(){},restore(){},fillRect(){},drawImage(...args){calls.push(args);},createLinearGradient(){return {addColorStop(){}};}};
  drawWeather(ctx,images,level(),0,3,weatherPresets[1],false);assert.equal(calls.length,0);
  drawWeather(ctx,images,level(),0,3,weatherPresets[1],true);assert.ok(calls.length>0);
  assert.ok(calls.every(([,x,y,w,h])=>x>=0&&y>=0&&y+h<=HEIGHT&&w===2));
});
