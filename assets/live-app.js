/* Approved UI connected to the existing product API; no synthetic playback. */
(() => {
  const api=BanpaiAPI, $=s=>document.querySelector(s);
  const staticBeta = window.BanpaiStaticBeta === true;
  const container = new URLSearchParams(location.search).get('container');
  const wechatHost = /MicroMessenger|miniProgram|wechatdevtools/i.test(navigator.userAgent);
  if (container === 'wechat-dev' && location.origin === 'http://127.0.0.1:8000' && !wechatHost) {
    location.replace('http://127.0.0.1:8128/');
    return;
  }
  const embedded = !staticBeta && ((container === 'wechat' && location.protocol === 'https:')
    || (container === 'wechat-dev' && location.origin === 'http://127.0.0.1:8000'));

  const localPreview = !staticBeta && !embedded && location.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(location.hostname) && !/^\/ui(?:\/|$)/.test(location.pathname);
  if (embedded) document.documentElement.dataset.banpaiContainer = 'wechat';
  let loginTicket = embedded ? new URLSearchParams(location.hash.slice(1)).get('banpai-ticket') : null;
  if (loginTicket) history.replaceState(null, '', location.pathname + location.search);
  let wechatSDK;
  function openWeChatLogin() {
    if (!wechatSDK) {
      wechatSDK = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('微信登录组件加载失败，请重试'));
        document.head.append(script);
      }).catch(error => { wechatSDK = null; throw error; });
    }
    return wechatSDK.then(() => new Promise((resolve, reject) => {
      if (!window.wx?.miniProgram) return reject(new Error('请在半拍微信小程序内登录'));
      window.wx.miniProgram.navigateTo({url:'/pages/login/login', success:resolve,
        fail:() => reject(new Error('微信登录页打开失败，请重试'))});
    }));
  }
  async function allowAccountAction() {
    if (!embedded) return true;
    if (!api.token || !user) await connectPreview();
    if (user?.identity === 'wechat') return true;
    await openWeChatLogin();
    return false;
  }
  const webKey = part => 'banpai.web.' + part;
  function readWeb(part, fallback) {
    try { return JSON.parse(localStorage.getItem(webKey(part))) ?? fallback; }
    catch { return fallback; }
  }
  function writeWeb(part, value) {
    try { localStorage.setItem(webKey(part), JSON.stringify(value));return true; }
    catch { toast('浏览器无法保存本机数据');return false; }
  }
  const webDefaults={state_mode:'manual',energy:46,brightness:50,styles:[],transition:true,fade_minutes:0,personalized:true};
  const trackRecord = track => ({id:track.id,title:track.title,themes:track.themes});
  const names={commute:'通勤',focus:'刷题',reading:'阅读',office:'办公',creative:'创作'};
  const scenePositions = new Map();
  const positionKey = () => !embedded ? webKey('positions') : user?.id ? JSON.stringify(['banpai.positions', api.base, user.id]) : null;
  function restorePositions() {
    scenePositions.clear();
    try {
      for (const [scene, entry] of Object.entries(JSON.parse(localStorage.getItem(positionKey())) || {})) {
        if (Object.hasOwn(names, scene) && typeof entry?.id === 'string' &&
          Number.isFinite(entry.seconds) && entry.seconds >= 0) scenePositions.set(scene, entry);
      }
    } catch {}
  }
  function savePosition() {
    const key = positionKey(), track = playback.current;
    if (!key || !track || !audio.getAttribute('src') || audio.getAttribute('src') !== track.stream_url) return;
    scenePositions.set(activeScene, {id: track.id, seconds: audio.ended ? 0 : audio.currentTime || 0});
    try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(scenePositions))); } catch {}
  }
  let queue=[], library=[], queueVersion=0, recommendationVersion=0, activeScene='commute', prefs=embedded?null:{...webDefaults,...readWeb('preferences',{}),state_mode:'manual'}, preferenceWrites=Promise.resolve();
  let sessionId='', elapsed=0, lastMedia=0, running=false, historyWritten=false, user=null;
  let fadeStart=0, fadeExpired=false, trackHeard=0, audioContext, analyser; const deckGains=new WeakMap();
  let scrubbing=false, switching=false, switchFeedback=false;
  let lastStateDecision=null;
  function reportState(response){lastStateDecision=response.state_decision; if(lastStateDecision)$("#xy-preview").contentWindow.postMessage({type:"banpai-state-decision",decision:lastStateDecision},location.origin);}
  let audio=new Audio();audio.crossOrigin='anonymous';audio.preload='metadata';
  const status=$('.preview-status');
  const fail=error=>{toast(error.message||'音乐连接暂时中断，请重试');if(error.status===401){playback.stop();api.clear();connectPreview().catch(()=>{});}};
  const safely=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(fail);
  function intercept(selector, fn, event='click') {
    document.addEventListener(event,e=>{if(e.target.closest(selector)){e.preventDefault();e.stopImmediatePropagation();safely(fn)(e);}},true);
  }
  const playback=BanpaiPlayback(audio,api,onPlayback,{
    createAudio:()=>new Audio(),
    setVolume:(element,value)=>{ensureAnalyser();if(!audioContext){element.volume=value;return;}let pair=deckGains.get(element);if(!pair){const node=audioContext.createGain(),source=audioContext.createMediaElementSource(element);source.connect(node);node.connect(analyser);pair={node,source};deckGains.set(element,pair);}pair.node.gain.setTargetAtTime(value,audioContext.currentTime,.025);},
    releaseAudio:element=>{const pair=deckGains.get(element);if(pair){pair.source.disconnect();pair.node.disconnect();deckGains.delete(element);}},
    next: async current => {
      await preferenceWrites;
      if (!queue.length) return null;
      const index = queue.findIndex(track => track.id === current?.id);
      return queue[(index + 1) % queue.length];
    },
    onSkip:(track,position)=>{if(embedded&&position<(track.duration||0)-5)api.request('/events','POST',{events:[{event:'skip',track_id:track.id,scene:activeScene,position_s:position}]}).catch(fail);}
  });
  window.BanpaiLive={api,playback,ensureVoiceSession:async()=>{if(!api.token)await connectPreview();},get scene(){return activeScene},get elapsed(){return elapsed}};
  function icon(playing) {
    if($('#screen-player').dataset.audioState===(playing?'playing':'paused'))return;
    $('#play-icon').innerHTML=playing?'<path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"/>':'<path d="M8 5.2v13.6L19 12z"/>';
    $('#screen-player').dataset.audioState=playing?'playing':'paused';
  }
  async function persist() {
    savePosition();
    if(!embedded||!sessionId||!api.token)return;
    sessionStorage.setItem('banpai.listening',JSON.stringify({id:sessionId,scene:activeScene,seconds:elapsed,user:user?.id,base:api.base}));
    await api.request('/listening-sessions/'+sessionId,'PUT',{scene:activeScene,seconds:elapsed});
  }
  const mediaSession = navigator.mediaSession;
  if (mediaSession) {
    const actions = {
      play: () => playback.resume(),
      pause: () => playback.pause(),
      seekto: event => playback.seek(event.seekTime),
      previoustrack: () => playback.previous(),
      nexttrack: () => playback.next(),
    };
    for (const [action, handler] of Object.entries(actions)) {
      try { mediaSession.setActionHandler(action, safely(handler)); } catch {}
    }
  }
  function onPlayback(event) {
    if(event.audio)audio=event.audio;
    if(event.type==='message'){fail(event.error);return;}
    if(['pause','waiting','seeking','loading','ended','error','stop'].includes(event.type))running=false;
    if(event.type==='playing'){running=true;lastMedia=audio.currentTime;}
    if(event.type==='seeked'){lastMedia=audio.currentTime;running=!audio.paused;}
    if(event.type==='playing'&&switchFeedback){
      switchFeedback=false;
      const visual=$('.orbital-canvas');
      if(visual&&!matchMedia('(prefers-reduced-motion: reduce)').matches)visual.animate([{transform:'scale(.92) rotate(-8deg)',opacity:.45},{transform:'scale(1.045) rotate(3deg)',opacity:1,offset:.55},{transform:'scale(1) rotate(0deg)',opacity:1}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
      toast('已切换：'+event.current.title);
    }
    if (mediaSession) {
      if (event.type==='stop') mediaSession.metadata=null;
      mediaSession.playbackState=event.current?(audio.paused?'paused':'playing'):'none';
    }
    if(event.type==='track') {
      lastMedia=0;historyWritten=false;trackHeard=0;
      const t=event.current;if(mediaSession&&window.MediaMetadata)mediaSession.metadata=new MediaMetadata({title:t.title,artist:'半拍 BANPAI'});$('.player-title').textContent=t.title;
      $('.player-meta').textContent=t.styles.join(' · ')+' · '+t.duration_label;
      $('.player-tags').replaceChildren(...t.styles.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
      $('#like-btn').classList.toggle('liked',embedded?t.liked:readWeb('favorites',[]).some(entry=>entry.id===t.id));
    }
    if(event.type==='timeupdate') {
      if(!scrubbing)updateSeek(audio.currentTime);
      $('.progress').lastElementChild.textContent=BanpaiListening.format(audio.duration);
      const delta=audio.currentTime-lastMedia;
      // Count media progress only. Seeking/buffering never adds wall time.
      if(running&&delta>0){elapsed+=delta;trackHeard+=delta;}
      lastMedia=audio.currentTime;
      if(running&&trackHeard>=1&&!historyWritten&&event.current){
        historyWritten=true;
        if (!embedded) {
          const history=readWeb('history',[]);
          history.unshift({track:trackRecord(event.current),scene:{id:activeScene},played_at:Date.now()});
          writeWeb('history',history);
        } else if(user?.identity==='wechat') {
          api.request('/history','POST',{track_id:event.current.id,scene:activeScene}).catch(fail);
        }
      }
      const remaining=prefs?.fade_minutes&&!fadeExpired?prefs.fade_minutes*60-(elapsed-fadeStart):Infinity;
      playback.setMaster(Math.max(0,Math.min(1,remaining/15)));
      if(remaining<=0){fadeExpired=true;playback.pause();playback.setMaster(1);toast('定时收听已结束');}
    }
    icon(running);

    if(['pause','ended'].includes(event.type))persist().catch(fail);
  }
  function restoreListening(){try{const saved=JSON.parse(sessionStorage.getItem('banpai.listening'));if(saved?.user===user?.id&&saved.base===api.base&&names[saved.scene]){sessionId=saved.id;activeScene=saved.scene;elapsed=Math.max(0,Number(saved.seconds)||0);}}catch{}}
  function ensureAnalyser() {
    if(!audioContext){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audioContext=new Context();analyser=audioContext.createAnalyser();analyser.fftSize=512;analyser.connect(audioContext.destination);}
    audioContext.resume().catch(fail);
  }
  async function enter(scene, id) {
    if(!staticBeta && (connecting||!api.token))await connectPreview();
    ensureAnalyser();
    if(!id&&activeScene===scene&&playback.current&&queue.length){
      setTheme(scene);show('screen-player');return;
    }
    const version=++queueVersion;
    persist().catch(() => {});
    playback.stop();
    if(activeScene!==scene||!sessionId){activeScene=scene;sessionId=crypto.randomUUID();fadeStart-=elapsed;elapsed=0;}
    setTheme(scene);show('screen-player');
    $('.player-title').textContent='正在获取曲目';$('.player-meta').textContent='';
    let response, tracks;
    try {
      await preferenceWrites.catch(()=>{});
      [response, tracks] = await Promise.all([
        api.request('/recommendations?scene=' + encodeURIComponent(scene) + '&limit=30'),
        api.request('/tracks?scene=' + encodeURIComponent(scene)),
      ]);
    } catch (error) {
      if (version === queueVersion) {
        queue = [];
        $('.player-title').textContent = '曲目加载失败';
        $('.player-meta').textContent = '点击播放重试';
      }
      throw error;
    }
    if (version !== queueVersion) return;
    reportState(response);
    library=tracks.filter(track => track.themes.includes(scene));
    queue=rankedQueue(response);
    if(!queue.length){$('.player-title').textContent='此场景暂无可播放音乐';$('.player-meta').textContent='等待曲目完成审核与授权';return;}
    const saved = id ? null : scenePositions.get(scene);
    const requested=queue.find(track=>track.id===(id || saved?.id));
    if(id&&!requested){$('.player-title').textContent='这首曲目暂不可播放';return;}
    const track=requested || queue[0];
    const position = track.id === saved?.id && saved.seconds < track.duration ? saved.seconds : 0;
    await playback.play(track, position);
  }
  // Replace the prototype's global entry points, preserving all established gestures.
  enterSelectedPlayer=()=>safely(enter)(selectedScene);
  document.addEventListener('banpai-home-swipe',e=>{e.stopImmediatePropagation();enterSelectedPlayer();},true);
  selectedTracks=()=>queue;
  renderTrack=()=>{};
  changeTrack=delta=>safely(async()=>{
    if(switching)return;switching=true;switchFeedback=true;
    try{await preferenceWrites;if(delta<0)await playback.previous();else await playback.next();}
    finally{switching=false;}
  })();
  intercept('#play-toggle',async()=>{if(!playback.current)return enter(selectedScene);if(playback.wanted)playback.pause();else{ensureAnalyser();await playback.resume();}});
  intercept('#like-btn',async()=>{
    const t=playback.current;if(!t || !await allowAccountAction())return;
    const button=$('#like-btn');
    if (!embedded) {
      const favorites=readWeb('favorites',[]);
      const liked=!favorites.some(entry=>entry.id===t.id);
      const next=liked?[trackRecord(t),...favorites]:favorites.filter(entry=>entry.id!==t.id);
      if(writeWeb('favorites',next)){
        button.classList.toggle('liked',liked);await refreshFavorites();
        toast(liked?'已加入收藏':'已取消收藏');
      }
      return;
    }
    button.disabled=true;
    try{const result=await api.request('/favorites/'+t.id,'PUT',{liked:!t.liked});t.liked=result.liked;button.classList.toggle('liked',t.liked);refreshFavorites().catch(fail);toast(t.liked?'已加入收藏':'已取消收藏');}finally{button.disabled=false;}
  });
  let connecting=null;
  async function connectPreview(){
    if(connecting)return connecting;
    if(status)status.textContent=localPreview?'正在连接本机曲库':'正在连接音乐服务';
    connecting=(async()=>{
      if (staticBeta) {
        const {tracks}=await api.loadCatalog();
        await api.request('/preferences','PUT',prefs);
        syncPreferences();
        if(status)status.textContent=tracks.length+' 首音乐 · 公测';
        return;
      }
      if (!localPreview) {
        if (api.base !== location.origin) api.setBase(location.origin);
        let session;
        if (loginTicket) {
          const ticket = loginTicket;
          loginTicket = null;
          api.clear();
          try { session = await api.request('/auth/web-exchange', 'POST', {ticket}); }
          catch (error) { if (error.status !== 401) throw error; }
        } else if (api.token) {
          try {
            user = (await api.request('/auth/me')).user;
            if (!embedded && user.identity !== 'guest') api.clear();
          }
          catch (error) { if (error.status !== 401) throw error; }
        }
        if (!session && !api.token) session = await api.request('/auth/guest', 'POST');
        if (session) { if (user?.id !== session.user?.id) scenePositions.clear(); api.authenticate(session); user = session.user; }
      } else {
        const response=await fetch('/__preview/session',{method:'POST',signal:AbortSignal.timeout(15000)});
        const result=await response.json();
        if(!response.ok)throw new Error(result.detail||'本机曲库连接失败');
        if(api.base!==result.base)api.setBase(result.base);
        api.authenticate(result.session);user=result.session.user;
      }
      restorePositions();
      if (embedded) {prefs=await api.request('/preferences');restoreListening();await refreshDevice();}
      else await api.request('/preferences','PUT',prefs);
      syncPreferences();
      if (status && localPreview) {
        status.textContent = '本机试听';
        api.request('/scenes').then(scenes => {
          const count = scenes.reduce((sum, scene) => sum + scene.track_count, 0);
          status.textContent = count + '首音乐 · 本机试听';
        }).catch(() => {});
      } else if (status) status.textContent = '半拍音乐';
    })().catch(error=>{if(status)status.textContent='音乐服务未连接 · 点击重试';throw error;}).finally(()=>{connecting=null;});
    return connecting;
  }
  const originalShow=show;
  show = id => {
    if (embedded && id === 'screen-profile' && user?.identity !== 'wechat') {
      return safely(async () => { if (await allowAccountAction()) originalShow(id); })();
    }
    if (!embedded && id === 'screen-status') return;
    return originalShow(id === 'screen-login' ? 'screen-main' : id);
  };
  document.querySelectorAll('[data-preview="login"], #screen-login, #logout').forEach(el=>el.remove());
  if (!embedded) {
    document.querySelectorAll('#open-device, #open-status, #screen-status, #screen-profile .sub-card').forEach(el=>el.remove());
  }
  if(status){status.style.cursor='pointer';status.onclick=()=>connectPreview().catch(fail);}
  intercept('#onboard-skip',async()=>{await api.request('/onboarding','POST');show('screen-main');});
  intercept('#onboard-next',async()=>{if(onboardIndex<2){onboardIndex++;renderOnboard();}else{await api.request('/onboarding','POST');show('screen-main');}});
  onboardData[0].desc='通勤、刷题、阅读、办公、创作。先选择场景，再横滑开始收听。';
  onboardData[1].title='上滑，<br>看见全部场景。';onboardData[1].desc='选择场景不会自动播放；播放页横滑切换同场景曲目。';
  if (!embedded) {onboardData[2].title='找到此刻的声音';onboardData[2].desc='长按小半输入你正在做什么，或直接选择场景。';}
  else {onboardData[2].title='身体数据，<br>由你决定。';onboardData[2].desc='不连接设备也可以收听。设备、手动录入和演示数据会分别标注，不用于医疗判断。';}
  function rankedQueue(response) {
    const byId=new Map(library.map(track=>[track.id,track]));
    const order=new Set([...response.items.map(track=>track.id),...byId.keys()]);
    return Array.from(order,id=>byId.get(id)).filter(Boolean);
  }
  async function savePreferences(patch) {
    if (!prefs || (!staticBeta && !api.token)) await connectPreview();
    if (!embedded) patch={...patch,state_mode:'manual'};
    if(Object.hasOwn(patch,'fade_minutes')){
      fadeStart=elapsed;fadeExpired=false;playback.setMaster(1);
    }
    prefs={...prefs,...patch};playback.configure(prefs);
    if (!embedded) writeWeb('preferences',prefs);
    const snapshot={...prefs}, version=++recommendationVersion, sceneVersion=queueVersion, scene=activeScene;
    const work=preferenceWrites.catch(()=>{}).then(async()=>{
      await api.request('/preferences','PUT',snapshot);
      if(version!==recommendationVersion || sceneVersion!==queueVersion)return;
      const result=await api.request('/recommendations?scene='+scene+'&limit=30&current_id='+encodeURIComponent(playback.current?.id||''));
      if(version!==recommendationVersion || sceneVersion!==queueVersion)return;
      reportState(result);
      const currentId=playback.current?.id;
      const ranked=rankedQueue(result);
      if(ranked.length){
        const current=ranked.find(track=>track.id===currentId);
        queue=current?[current,...ranked.filter(track=>track.id!==currentId)]:ranked;
        playback.configure(prefs,{resetForward:true});
      }
    });
    preferenceWrites=work.catch(()=>{});
    await work;
  }
  async function refreshFavorites(){
    if(embedded && (!api.token || user?.identity!=='wechat'))return;
    const entries=embedded?await api.request('/favorites'):readWeb('favorites',[]);
    $('#xy-preview').contentWindow.postMessage({type:'banpai-favorites',entries,scene:activeScene,local:!embedded},location.origin);
  }
  function syncPreferences() {
    if(!prefs)return;
    playback.configure(prefs);
    $('#screen-profile input[aria-label="自然衔接"]').checked=prefs.transition;
    $('#screen-profile input[aria-label="个性化推荐"]').checked=prefs.personalized;
    $('#xy-preview').contentWindow.postMessage({type:'banpai-preferences',preferences:prefs,local:!embedded},location.origin);refreshFavorites().catch(fail);
  }
  $('#screen-profile input[aria-label="自然衔接"]').addEventListener('change',e=>savePreferences({transition:e.target.checked}).catch(fail));
  $('#screen-profile input[aria-label="个性化推荐"]').addEventListener('change',e=>savePreferences({personalized:e.target.checked}).catch(fail));
  window.addEventListener('message',e=>{if(e.source!==$('#xy-preview').contentWindow||e.origin!==location.origin)return;if(e.data?.type==='banpai-preferences-change')savePreferences(e.data.patch).catch(fail);if(e.data?.type==='banpai-preferences-ready')syncPreferences();if(e.data?.type==='banpai-preferences-ready'&&lastStateDecision)$('#xy-preview').contentWindow.postMessage({type:'banpai-state-decision',decision:lastStateDecision},location.origin);if(e.data?.type==='banpai-favorite-play'){
    const favorite=!embedded&&readWeb('favorites',[]).find(track=>track.id===e.data.id);
    if (!embedded&&!favorite)return;
    const scene=favorite&&!favorite.themes.includes(activeScene)?favorite.themes.find(name=>names[name]):activeScene;
    if(scene)safely(enter)(scene,e.data.id);
  }});
  ['history-expand','likes-expand'].forEach(id=>{const old=$('#'+id);old.replaceWith(old.cloneNode(true));});
  let profileSection=null;
  const expandedLists={history:false,likes:false};
  function renderList(container, entries, kind) {
    container.replaceChildren();container.classList.toggle('expanded-records',expandedLists[kind]);
    const toggle=$('#'+(kind==='history'?'history':'likes')+'-expand');
    toggle.hidden=entries.length<=3;toggle.textContent=expandedLists[kind]?'收起':(kind==='history'?'展开最近记录（':'查看全部（')+entries.length+'）';
    toggle.setAttribute('aria-expanded',String(expandedLists[kind]));
    toggle.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();expandedLists[kind]=!expandedLists[kind];renderList(container,entries,kind);};
    if(!entries.length){container.textContent=kind==='history'?'还没有收听记录':'还没有喜欢的曲目';return;}
    for(const entry of (expandedLists[kind]?entries:entries.slice(0,3))){
      const t=entry.track||entry, scene=entry.scene?.id||t.themes?.[0]||activeScene;
      const row=document.createElement('button');row.className='p-item';row.type='button';row.style.width='100%';
      const label=document.createElement('span');label.className='txt';const title=document.createElement('b');title.textContent=t.title;
      const detail=document.createElement('span');detail.textContent=(names[scene]||'音乐')+' · 点击播放';
      label.append(title,detail);row.append(label);row.setAttribute('aria-label','播放 '+t.title);row.onclick=()=>safely(enter)(scene,t.id);container.append(row);
    }
  }
  intercept('[data-profile-section]',e=>{
    profileSection=e.target.closest('[data-profile-section]').dataset.profileSection;
    document.querySelector('.home-dimmer')?.remove();show('screen-profile');
  });
  async function profile() {
    let result;
    if (embedded) {
      if(!api.token)await connectPreview();
      result=await api.request('/profile');user=result.user;
      $('.profile-head b').textContent=user.nickname;$('.profile-head span').textContent=user.client_id+' · '+user.joined_label;
      $('.profile-avatar').textContent=user.nickname.slice(0,1);
    } else {
      const history=readWeb('history',[]), favorites=readWeb('favorites',[]);
      result={history,favorites,stats:{played:history.length,history:history.length,likes:favorites.length}};
      $('.profile-head b').textContent='本机收听';
      $('.profile-head span').textContent='记录保存在当前浏览器';
      $('.profile-avatar').textContent='半';
    }
    const values=[result.stats.played,result.stats.likes,result.stats.history];document.querySelectorAll('.stat b').forEach((el,i)=>el.textContent=values[i]);
    const lists=document.querySelectorAll('#screen-profile .p-list');renderList(lists[0],result.history,'history');renderList(lists[1],result.favorites,'likes');
    if(profileSection){const target=lists[profileSection==='history'?0:1].closest('.p-block');target.scrollIntoView({block:'start',behavior:'instant'});profileSection=null;}
    syncPreferences();
    if (!embedded)return;
    const rows=document.querySelectorAll('#screen-profile .setting-row');rows[2].querySelector('span').textContent='查看设备与数据来源 ›';rows[3].querySelector('span').textContent='音乐偏好 ›';
  }
  new MutationObserver(()=>{if($('#screen-profile').classList.contains('is-active'))safely(profile)();}).observe($('#screen-profile'),{attributes:true,attributeFilter:['class']});
  intercept('.sub-card button',async()=>toast((await api.request('/subscription')).message));
  document.querySelectorAll('#screen-profile .setting-row').forEach((row,i)=>{
    if(i<2)return;
    if(!embedded&&i===3)row.querySelector('span').textContent='在此浏览器保存 ›';
    if(!embedded && (i===2 || i===4)){row.remove();return;}
    row.tabIndex=0;row.setAttribute('role','button');
    row.onclick=safely(async()=>{
      if(i===2){const device=await api.request('/device');toast(device.demo?'尚未连接真实设备；演示数据不用于诊断':device.device_name+' · '+device.mode);}
      if(i===3)show('screen-adjust');
      if(i===4)toast((await api.request('/subscription')).message);
      if(i===5&&!embedded){$('#web-privacy').showModal();return;}
      if(i===5&&confirm('清除收藏、历史、偏好、搜索、设备读数、推荐行为和收听会话？此操作不可撤销，账号与正式审核审计保留。')){playback.stop();await api.request('/privacy/data','DELETE');localStorage.removeItem(positionKey());scenePositions.clear();sessionId='';elapsed=0;sessionStorage.removeItem('banpai.listening');prefs=await api.request('/preferences');await profile();toast('使用数据已清除');}
    });row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}};
  });
  if (!embedded) {
    const privacy=document.createElement('dialog');
    privacy.id='web-privacy';
    privacy.innerHTML='<h2>隐私与数据</h2><p>收藏、最近听过、播放位置和偏好保存在当前浏览器。网站使用临时游客凭证提供播放和推荐，推荐设置会发给服务端。</p><p>长按小半并允许麦克风后，录音会发送到半拍服务识别。语音服务在内存处理音频。你也可以用文字或直接选场景。</p><form method="dialog"><button type="button" class="btn-ghost">清除本机数据</button><button class="btn-ghost">关闭</button></form>';
    if (staticBeta) {
      privacy.querySelector('p').textContent='收藏、最近听过、播放位置和偏好保存在当前浏览器。音乐由公测网站提供。';
      privacy.querySelector('p + p').textContent='公测版支持文字输入和手动选择场景。';
    }
    privacy.querySelector('[type=button]').onclick=safely(async()=>{
      if(!confirm('清除当前浏览器的收藏、历史、播放进度和偏好？'))return;
      ++queueVersion;queue=[];library=[];playback.stop();
      await preferenceWrites;
      for(const part of ['favorites','history','positions','preferences'])localStorage.removeItem(webKey(part));
      scenePositions.clear();elapsed=0;fadeStart=0;fadeExpired=false;
      prefs={...webDefaults};playback.setMaster(1);
      await profile();privacy.close();
      if(staticBeta||api.token)await api.request('/preferences','PUT',prefs);
    });
    document.body.append(privacy);
  }
  const oldSeek=$('.progress .track'), seek=document.createElement('input');
  seek.type='range';seek.className='music-seek';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.setAttribute('aria-label','曲目进度');oldSeek.replaceWith(seek);
  const duration=()=>Number.isFinite(audio.duration)?audio.duration:(playback.current?.duration||0);
  function updateSeek(seconds){
    const total=duration(), ratio=total?Math.min(1,Math.max(0,seconds/total)):0;
    seek.value=String(Math.round(ratio*1000));seek.style.setProperty('--played',ratio*100+'%');
    seek.setAttribute('aria-valuetext',BanpaiListening.format(seconds)+' / '+BanpaiListening.format(total));
    $('.progress').firstElementChild.textContent=BanpaiListening.format(seconds);
  }
  seek.addEventListener('pointerdown',e=>{scrubbing=true;e.stopPropagation();});
  seek.addEventListener('input',()=>{scrubbing=true;updateSeek(Number(seek.value)/1000*duration());});
  seek.addEventListener('change',()=>{const position=Number(seek.value)/1000*duration();scrubbing=false;safely(playback.seek)(position);});
  seek.addEventListener('pointerup',e=>{scrubbing=false;e.stopPropagation();});
  seek.addEventListener('pointercancel',()=>{scrubbing=false;updateSeek(audio.currentTime);});
  seek.addEventListener('keydown',e=>e.stopPropagation());
  $('.progress').firstElementChild.textContent='00:00';$('.progress').lastElementChild.textContent='00:00';
  async function refreshDevice(){
    let d={};if(api.token)d=await api.request('/device');const real=!d.demo;
    $('#hr-value').textContent=real?(d.heart_rate??'—'):'—';$('#resp-value').textContent=real?(d.respiration??'—'):'—';$('#open-status .tag').textContent=d.demo?'未连接':d.status||'未连接';
    const cap=$('.status-hero .cap');cap.firstElementChild.textContent=d.demo?'演示数据':'设备数据';cap.lastElementChild.textContent=d.demo?'未连接真实设备':d.device_name||'尚未连接';
    const vals=[d.heart_rate,d.respiration];document.querySelectorAll('.status-num b').forEach((el,i)=>el.textContent=vals[i]??'—');
    const metrics=[d.spo2?d.spo2+'%':'—',d.hrv?d.hrv+' ms':'—',d.status||'未连接',d.battery?d.battery+'%':'—'];document.querySelectorAll('.metric b').forEach((el,i)=>el.textContent=metrics[i]);
    $('.status-chart').replaceChildren(...(d.series||[]).map(v=>{const i=document.createElement('i');i.style.height=Math.max(5,Math.min(100,v/1.5))+'%';return i;}));
    $('.device-card b').textContent=d.demo?'演示数据':d.device_name||'尚未连接设备';$('.device-card .txt span').textContent=d.note||'网页支持手动录入；蓝牙请使用小程序';
    $('.status-note').textContent=(d.demo?'当前展示为演示数据。':'')+'身体数据不构成医疗诊断或建议。网页支持手动录入，蓝牙连接请使用小程序。';
  }
  if (embedded) {
    const manual=document.createElement('button');manual.className='btn-ghost';manual.textContent='手动记录心率';manual.onclick=safely(async()=>{const value=prompt('输入心率（bpm），此记录将标注为手动录入');if(value===null)return;await api.request('/device/readings','POST',{heart_rate:Number(value),source:'manual'});await refreshDevice();});$('.status-body').append(manual);
    const unbind=document.createElement('button');unbind.className='btn-ghost';unbind.textContent='解除设备绑定';unbind.onclick=safely(async()=>{await api.request('/device/unbind','POST');await refreshDevice();});$('.status-body').append(unbind);
    intercept('#open-status',async()=>{show('screen-status');await refreshDevice();});
    new MutationObserver(()=>{if($('#screen-status').classList.contains('is-active'))safely(refreshDevice)();}).observe($('#screen-status'),{attributes:true,attributeFilter:['class']});
    refreshDevice().catch(fail);
  }
  // Replace demo readings with truthful placeholders until a device is connected.
  document.querySelectorAll('.summary-value').forEach(el=>{if(!el.closest('#screen-adjust'))el.textContent='—';});
  const artwork=$('.player-orb'),canvas=document.createElement('canvas');canvas.className='orbital-canvas';canvas.setAttribute('aria-hidden','true');artwork.append(canvas);
  const clock=document.createElement('div');clock.className='listening-clock';clock.innerHTML='<span class="listening-time">00:00</span><span class="listening-caption">通勤 · 已聆听</span>';artwork.append(clock);
  const ctx=canvas.getContext('2d'),samples=new Uint8Array(512);let motion={phase:0,energy:0,speed:.65},stamp=0;
  function draw(now) {
    requestAnimationFrame(draw);if(document.hidden||!$('#screen-player').classList.contains('is-active')){stamp=0;return;}
    const rect=artwork.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    let power=0;if(analyser&&running){analyser.getByteTimeDomainData(samples);for(const v of samples)power+=((v-128)/128)**2;}
    const energy=Math.min(1,Math.sqrt(power/samples.length)*5);
    motion=BanpaiOrbit.advance(motion,stamp?(now-stamp)/1000:1/60,energy,running);stamp=now;
    BanpaiOrbit.draw(ctx,rect.width,rect.height,{color:getComputedStyle($('#phone')).getPropertyValue('--accent-deep').trim(),energy:motion.energy,phase:motion.phase,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});
    clock.querySelector('.listening-time').textContent=BanpaiListening.format(elapsed);clock.querySelector('.listening-caption').textContent=names[activeScene]+' · 已聆听';
    $('#screen-player').dataset.audioLevel=String(energy);
  }
  requestAnimationFrame(draw);setInterval(()=>persist().catch(()=>{}),10000);
  window.addEventListener('pagehide',savePosition);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persist().catch(()=>{});});

  const submitIntent=window.BanpaiSceneInput.submit;
  window.BanpaiSceneInput.submit=text=>{if(embedded&&api.token&&String(text).trim())api.request('/searches','POST',{q:String(text).trim().slice(0,200)}).catch(fail);return submitIntent(text);};
  $('#scene-search').addEventListener('keydown',e=>{if(embedded&&e.key==='Enter'&&api.token&&e.target.value.trim())api.request('/searches','POST',{q:e.target.value.trim()}).catch(fail);});
  icon(false);$('.player-title').textContent='选择场景，开始收听';$('.player-meta').textContent='';$('.player-tags').replaceChildren();
  show('screen-main');
  if (!embedded) {restorePositions();syncPreferences();}
  connectPreview().catch(fail);
})();
