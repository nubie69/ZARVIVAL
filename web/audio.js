export class GameAudio {
  constructor(){this.enabled=false;this.volume=.5;this.music=null;this.track=null;}
  configure(enabled,volume){this.enabled=enabled;this.volume=volume;if(this.music){this.music.volume=volume*.36;if(!enabled)this.music.pause();}}
  effect(file,rate=1){
    if(!this.enabled)return;
    // Short sounds get their own voice so simultaneous hits do not cut off one another.
    const sound=new Audio(`/assets/audio/${file}.wav`);sound.volume=this.volume*.7;sound.playbackRate=rate;
    sound.play().catch(()=>{});
  }
  playMusic(level){
    const file=`/assets/audio/level${level%2+1}.wav`;
    if(this.track!==file){this.music?.pause();this.music=new Audio(file);this.track=file;this.music.loop=true;}
    this.music.volume=this.volume*.36;
    if(this.enabled)this.music.play().catch(()=>{});
  }
  pause(){this.music?.pause();}
}
