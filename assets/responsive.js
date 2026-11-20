(() => {
  const input=document.querySelector('#scene-search'),wrap=document.querySelector('.scene-search');
  const result=document.createElement('div');result.className='scene-input-result';result.hidden=true;result.setAttribute('role','status');
  const label=document.createElement('span'),apply=document.createElement('button');apply.type='button';apply.textContent='选用状态';result.append(label,apply);wrap.after(result);
  let match=null;
  function inspect(){match=BanpaiSceneIntent.resolve(input.value);result.hidden=!input.value.trim();label.textContent=match?'此刻适合 · '+match.name:'还没确定，选一个下方状态';apply.hidden=!match;}
  function submit(text){input.value=String(text||'').slice(0,200);inspect();if(!match){show('screen-scenes');input.focus();return false;}chooseScene(match.scene);input.blur();show('screen-main');toast('已选择'+match.name+'，横滑开始听');return true;}
  function speech(text){const resolved=BanpaiSceneIntent.resolve(text);if(!resolved){toast('小半听到“'+String(text).slice(0,24)+'”，暂未匹配场景，请补充活动或手动选择');return false;}return submit(text);}
  window.BanpaiSceneInput={submit,speech,inspect,open(text=''){input.value=text;inspect();show('screen-scenes');setTimeout(()=>input.focus(),100);}};
  input.addEventListener('input',inspect);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit(input.value);}});
  apply.onclick=()=>submit(input.value);document.querySelector('#scene-search-clear').onclick=()=>{input.value='';inspect();input.focus();};
  document.addEventListener('banpai-speech-transcript',e=>{if(typeof e.detail?.text==='string')window.BanpaiSceneInput.speech(e.detail.text);});
  // Clear stale messages and keep the independently selected scene on every return.
  const frame=document.querySelector('#xy-preview');
  function syncAdjust(){if(frame.contentWindow)frame.contentWindow.postMessage({type:'banpai-scene',scene:document.querySelector('#phone').dataset.theme},location.origin);}
  frame.addEventListener('load',syncAdjust);
  new MutationObserver(syncAdjust).observe(document.querySelector('#phone'),{attributes:true,attributeFilter:['data-theme']});
  syncAdjust();
})();
(() => {
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||!['Enter',' '].includes(event.key))return;
  const control=event.target.closest('[role="button"]');
  if(control&&!control.matches('button')&&control.getAttribute('aria-disabled')!=='true'){
   event.preventDefault();control.click();
  }
 });
})();
