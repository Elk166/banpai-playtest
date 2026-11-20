/* Two-deck playback: prefetched next track, bounded equal-gain overlap, real history. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.BanpaiPlayback=factory;})(globalThis,function(initial,api,notify,options={}){
 let generation=0,prepareVersion=0,active=null,retiring=null,prepared=null,preparing=null;
 let current=null,wanted=false,pending=false,retry=0,transition=true,master=1,muted=false;
 let history=[],historyIndex=-1,historyIntent=null,overlap=0,crossStarting=false,prepareRetryAt=0,suppressOverlap=false; 
 const create=options.createAudio||(()=>new Audio());
 const emit=(type,error)=>notify({type,current,wanted,pending,audio:active.audio,error});
 const volume=(deck,value)=>{if(!deck)return;deck.level=Math.max(0,Math.min(1,value));const v=deck.level*master*(muted?0:1);if(options.setVolume)options.setVolume(deck.audio,v);else deck.audio.volume=v;};
 const clear=deck=>{if(deck){deck.audio.pause();deck.audio.removeAttribute('src');deck.audio.load();if(deck!==active)options.releaseAudio?.(deck.audio);}};
 function remember(){
  if(!current||active.recorded)return;
  active.recorded=true;
  if(historyIntent!==null){historyIndex=historyIntent;historyIntent=null;}
  else if(history[historyIndex]?.id!==current.id){history=history.slice(0,historyIndex+1);history.push(current);if(history.length>100)history.shift();historyIndex=history.length-1;}
 }
 function deck(audio){
  const d={audio,track:null,ready:false,recorded:false,level:1};
  audio.preload='auto';audio.crossOrigin='anonymous';
  for(const type of ['playing','pause','waiting','seeking','seeked','timeupdate','ended'])audio.addEventListener(type,()=>{
   if(d!==active)return;
   if(type==='playing')remember();
   if(type==='timeupdate')tick();
   emit(type);
   if(type==='ended'&&wanted&&options.next){if(retiring)commitOverlap();else next(false);}
  });
  audio.addEventListener('canplay',()=>{d.ready=true;});
  audio.addEventListener('error',()=>{
   if(d!==active){d.ready=false;return;}
   if(pending||active.track!==current)return;
   if(active.track===current&&current&&retry++<1)load(current,audio.currentTime||0,true);
   else {wanted=false;clear(retiring);retiring=null;emit('error');emit('message',new Error('音乐加载失败，请重试'));}
  });
  return d;
 }
 active=deck(initial);
 function invalidate(){prepareVersion++;prepareRetryAt=0;clear(prepared);prepared=null;preparing=null;}
 async function prepare(){
  if(!options.next||prepared||preparing||!current||Date.now()<prepareRetryAt)return;
  const version=prepareVersion,id=current.id;
  const work=(async()=>{
   try{
    const track=await options.next(current);
    if(!track)return;
    const fresh=await api.request('/tracks/'+encodeURIComponent(track.id));
    if(version!==prepareVersion||current?.id!==id)return;
    const d=deck(create());d.track=fresh;volume(d,0);d.audio.src=fresh.stream_url;d.audio.load();prepared=d;
   }catch(error){prepareRetryAt=Date.now()+10000;if(version===prepareVersion)emit('message',new Error('下一首预加载失败，将在切歌时重试'));}
   finally{if(preparing===work)preparing=null;}
  })();preparing=work;return work;
 }
 async function load(track,position=0,renew=false){
  suppressOverlap=position>0&&position>=((track.duration||active.audio.duration||Infinity)-15);
  const ticket=++generation;invalidate();clear(retiring);retiring=null;crossStarting=false;
  pending=true;active.audio.pause();emit('loading');
  try{
   const fresh=await api.request('/tracks/'+encodeURIComponent(track.id));
   if(ticket!==generation)return false;
   current=fresh;active.track=fresh;active.ready=false;active.recorded=renew;
   active.audio.src=fresh.stream_url;active.audio.load();active.audio.currentTime=position;
   volume(active,1);pending=false;emit(renew?'renewed':'track');
   if(wanted)await active.audio.play();return true;
  }catch(error){if(ticket===generation){pending=false;wanted=false;active.audio.pause();emit('error');emit('message',error);}return false;}
 }
 async function crossfade(seconds){
  if(!prepared||crossStarting||!wanted)return;
  const nextDeck=prepared,old=active,version=generation;crossStarting=true;volume(nextDeck,0);
  try{
   await nextDeck.audio.play();
   if(version!==generation||!wanted||prepared!==nextDeck){nextDeck.audio.pause();return;}
   prepared=null;retiring=nextDeck;overlap=Math.max(.1,seconds);nextDeck.overlapStart=nextDeck.audio.currentTime;
   prepareVersion++;
  }catch(error){nextDeck.audio.pause();emit('message',new Error('下一首尚未准备好，继续播放当前音乐'));}
  finally{crossStarting=false;}
 }
 function commitOverlap(){
  if(!retiring)return;
  const old=active;active=retiring;retiring=null;current=active.track;
  clear(old);volume(active,1);historyIntent=null;suppressOverlap=false;
  remember();emit('track');emit('playing');
 }
 function tick(){
  const a=active.audio,remaining=a.duration-a.currentTime;
  if(retiring){
   // Measure only audio actually played by the incoming deck, never absolute song time.
   const progress=Math.max(0,Math.min(1,(retiring.audio.currentTime-retiring.overlapStart)/overlap));
   volume(active,Math.cos(progress*Math.PI/2));volume(retiring,Math.sin(progress*Math.PI/2));
   if(a.ended||progress>=1)commitOverlap();
   return;
  }
  volume(active,1);
  if(wanted&&!pending&&Number.isFinite(remaining)){
   if(remaining<=45&&!prepared&&!preparing)prepare();
   if(!suppressOverlap&&transition&&remaining>0&&remaining<=15&&prepared&&(prepared.ready||prepared.audio.readyState>=3)&&master>=.999)crossfade(Math.min(15,remaining));
  }
 }
 async function next(user=true){
  if(pending||crossStarting)return;
  if(user&&current)options.onSkip?.(current,active.audio.currentTime);
  if(historyIndex<history.length-1){historyIntent=historyIndex+1;wanted=true;return load(history[historyIntent]);}
  if(preparing)await preparing;
  if(!user&&prepared&&(prepared.ready||prepared.audio.readyState>=3)){
   const incoming=prepared,version=generation;
   try{volume(incoming,1);await incoming.audio.play();
    if(version!==generation||!wanted||prepared!==incoming){incoming.audio.pause();return;}
    prepared=null;retiring=incoming;commitOverlap();return;
   }catch(error){volume(incoming,0);}
  }
  const track=prepared?.track||await options.next?.(current);
  if(track){historyIntent=null;wanted=true;return load(track);}
 }
 const timer=options.next?setInterval(()=>{if(wanted)tick();},50):null;
 return {get audio(){return active.audio},get current(){return current},get wanted(){return wanted},
  play(track,position=0){historyIntent=null;current=track;wanted=true;retry=0;return load(track,position);},
  next,
  previous(){if(historyIndex<=0){emit('message',new Error('已经是本次收听的第一首'));return;}options.onSkip?.(current,active.audio.currentTime);historyIntent=historyIndex-1;wanted=true;return load(history[historyIntent]);},
  pause(){
   wanted=false;
   active.audio.pause();
   clear(retiring);retiring=null;
   prepared?.audio.pause();
   volume(active,1);
   emit('pause');
  },
  async resume(){
   if(!current)return;
   wanted=true;retry=0;
   if(pending)return;
   const position=active.audio.currentTime||0;
   if(active.track!==current||!active.audio.src||active.audio.error)return load(current,position,true);
   const version=generation;
   try { await active.audio.play();return true; }
   catch(error) {
    if(version!==generation||!wanted)return false;
    if(error.name==='NotAllowedError'){
     wanted=false;emit('pause');emit('message',error);return false;
    }
    return load(current,position,true);
   }
  },
  stop(){++generation;invalidate();wanted=false;pending=false;current=null;clear(retiring);retiring=null;clear(active);history=[];historyIndex=-1;emit('stop');},
  seek(value){
   if(!current)return;
   const duration=active.track===current&&Number.isFinite(active.audio.duration)
    ?active.audio.duration:current.duration||0;
   const position=Math.max(0,Math.min(Number(value)||0,duration));
   retry=0;
   if(pending||active.track!==current||!active.audio.src||active.audio.error)return load(current,position,true);
   suppressOverlap=position>=duration-15;
   if(crossStarting)invalidate();
   clear(retiring);retiring=null;volume(active,1);
   try { active.audio.currentTime=position;return true; }
   catch { return load(current,position,true); }
  },
  configure(prefs,{resetForward=false}={}){
   transition=prefs.transition!==false;
   if(resetForward)history=history.slice(0,historyIndex+1);
   invalidate();
  },
  setMaster(value){master=Math.max(0,Math.min(1,value));volume(active,active.level);volume(retiring,retiring?.level||0);},
  setMuted(value){muted=!!value;volume(active,active.level);volume(retiring,retiring?.level||0);},
  destroy(){this.stop();if(timer)clearInterval(timer);}
 };
});
