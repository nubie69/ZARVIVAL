import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('browser controller loads sprites, resumes progress, advances levels and restarts', async () => {
  const previous = new Map(['document','window','localStorage','Image','HTMLButtonElement','requestAnimationFrame'].map(key=>[key,globalThis[key]]));
  let nextFrame;
  const context = {
    drawImage(image,...args) {
      this.lastImage=image;
      if(args.length===8){const [x,y,w,h]=args;assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height,`Sprite exceeds ${image.file}`);}
    },
    getImageData() {
      const {width,height}=this.lastImage;
      const data=new Uint8ClampedArray(width*height*4);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([y>=11?0:11,255,255,255],(y*width+x)*4);
      data[(10*width+2)*4+1]=100;
      data[(10*width+3)*4+1]=0;
      data[(10*width+8)*4+2]=7;
      data[(11*width+12)*4+2]=9;
      return {data};
    },
    clearRect(){},save(){},restore(){},translate(){},scale(){},fillRect(){},fillText(){},beginPath(){},arc(){},stroke(){},strokeRect(){},createLinearGradient(){return {addColorStop(){}};},
  };
  class Element {
    constructor(){this.hidden=false;this.disabled=false;this.dataset={};this.listeners={};this.classList={toggle(){}};}
    getContext(){return {...context};}setAttribute(){}focus(){}setPointerCapture(){}
    addEventListener(name,fn){this.listeners[name]=fn;}
  }
  const elements=new Map(),keyboard={};
  const buttons=Array.from({length:3},(_,i)=>{const b=new Element();b.dataset.character=String(i);return b;});
  const portraits=buttons.map(()=>new Element());
  const storage=new Map([['zarvival-progress',JSON.stringify({level:3,character:2,score:220})]]);
  try {
    globalThis.document={
      getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
      querySelectorAll(selector){return selector==='[data-character]'?buttons:selector==='[data-character] canvas'?portraits:[];},
      createElement(){return new Element();},addEventListener(){},
    };
    globalThis.window={addEventListener(name,fn){keyboard[name]=fn;},matchMedia(){return {matches:true};}};
    globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
    globalThis.HTMLButtonElement=Element;
    globalThis.requestAnimationFrame=callback=>{nextFrame=callback;};
    globalThis.Image=class {
      set src(url){this.file=url;const file=new URL(`../ZARVIVAL_FINAL/ZAR Studio(Final)/res/${url.replace('/assets/','')}`,import.meta.url);const data=readFileSync(file);this.width=data.readUInt32BE(16);this.height=data.readUInt32BE(20);queueMicrotask(()=>this.onload());}
    };
    await import('../web/game.js');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(elements.get('primary').disabled,false);
    assert.equal(elements.get('overlay-title').textContent,'Choose your fighter');
    assert.equal(elements.get('continue').hidden,false);
    assert.match(elements.get('continue').textContent,/level 4.*Skull/);
    elements.get('continue').onclick();
    nextFrame(1000);nextFrame(1017);
    assert.match(elements.get('level-label').textContent,/LEVEL 4.*SKULL/);
    assert.equal(elements.get('health').max,140);
    assert.match(elements.get('score-label').textContent,/220 PTS/);
    elements.get('weather').onclick();assert.equal(elements.get('weather').textContent,'Weather: off');
    nextFrame(1034);elements.get('weather').onclick();assert.equal(elements.get('weather').textContent,'Weather: on');
    elements.get('pause').onclick();assert.equal(elements.get('overlay-title').textContent,'Game paused');
    elements.get('primary').onclick();assert.equal(elements.get('overlay').hidden,true);
    keyboard.keydown({code:'KeyK',target:elements.get('game'),repeat:false,preventDefault(){}});
    // A real canvas is not necessary to verify menu transitions and sprite bounds.
    elements.get('game').listeners.pointerdown({button:2,preventDefault(){}});
    nextFrame(1117);
    assert.equal(elements.get('overlay-title').textContent,'Level cleared');
    assert.deepEqual(JSON.parse(storage.get('zarvival-progress')),{level:4,character:2,score:330});
    elements.get('primary').onclick();nextFrame(1134);
    assert.match(elements.get('level-label').textContent,/LEVEL 5/);
    elements.get('game').listeners.pointerdown({button:2,preventDefault(){}});nextFrame(1234);
    assert.equal(elements.get('overlay-title').textContent,'You survived ZARVIVAL!');
    assert.equal(storage.has('zarvival-progress'),false);
    assert.equal(storage.get('zarvival-best'),'440');
    elements.get('primary').onclick();nextFrame(1251);
    assert.match(elements.get('level-label').textContent,/LEVEL 1/);
    assert.match(elements.get('score-label').textContent,/0 PTS/);
    elements.get('pause').onclick();elements.get('menu').onclick();
    for(let i=0;i<3;i++){
      buttons[i].onclick();elements.get('primary').onclick();nextFrame(1268+i*17);
      assert.match(elements.get('level-label').textContent,new RegExp(['GOBLIN','REZ','SKULL'][i]));
      elements.get('pause').onclick();elements.get('menu').onclick();
    }
    // Corrupt or unavailable local storage must never prevent starting a game.
    storage.set('zarvival-progress','{"level":999}');elements.get('menu').onclick();assert.equal(elements.get('continue').hidden,true);
    globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
    elements.get('menu').onclick();elements.get('primary').onclick();assert.equal(elements.get('overlay').hidden,true);
  } finally {
    for(const [key,value] of previous){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});
