import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences, savePreferences } from '../web/preferences.js';
import { GameAudio } from '../web/audio.js';

test('settings persist and reject invalid stored types',()=>{
  let stored=null;const storage={getItem:()=>stored,setItem:(_,value)=>stored=value};
  const desired={sound:true,weather:false,effects:false,volume:.7};savePreferences(desired,storage);
  assert.deepEqual(loadPreferences(storage),desired);
  stored='{"sound":"true","weather":0,"effects":null,"volume":15}';
  assert.deepEqual(loadPreferences(storage),{sound:false,weather:true,effects:true,volume:1});
  stored='broken';assert.equal(loadPreferences(storage).sound,false);
});
test('unavailable storage leaves the game usable',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(loadPreferences(storage).weather,true);assert.doesNotThrow(()=>savePreferences({},storage));
});
test('audio respects mute and volume, and resumes music without resetting the track',()=>{
  const previous=globalThis.Audio;const voices=[];
  globalThis.Audio=class{constructor(src){this.src=src;this.plays=0;this.pauses=0;voices.push(this);}play(){this.plays++;return Promise.resolve();}pause(){this.pauses++;}};
  try{
    const audio=new GameAudio();audio.effect('jump');assert.equal(voices.length,0);
    audio.configure(true,.5);audio.playMusic(0);const music=audio.music;
    audio.pause();audio.playMusic(0);assert.equal(audio.music,music);assert.equal(music.plays,2);
    audio.effect('attack1');audio.effect('attack1');assert.equal(voices.length,3);
    assert.equal(voices[1].volume,.35);audio.configure(false,.2);assert.ok(music.pauses>=2);
    audio.effect('jump');assert.equal(voices.length,3);audio.configure(true,.2);audio.playMusic(1);
    assert.notEqual(audio.music,music);assert.equal(audio.music.volume,.2*.36);
  }finally{if(previous===undefined)delete globalThis.Audio;else globalThis.Audio=previous;}
});
