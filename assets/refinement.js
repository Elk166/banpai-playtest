/* Visual feedback only: does not replace or delay any original event handler. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const quiet=['.player-hint','.scenes-body>p','.auth-alt','.login-foot','.group-head>span'];
 quiet.forEach(q=>document.querySelectorAll(q).forEach(el=>el.classList.add('copy-quiet')));
 document.querySelectorAll('#screen-main .main-body>p').forEach(el=>{if(el.textContent.includes('左滑进入'))el.classList.add('copy-quiet')});
 const set=(q,value)=>{const el=document.querySelector(q);if(el)el.textContent=value};
 set('.login-hero>p','选一个场景，开始收听。');
 set('#open-adjust','音乐偏好');
 const loginPhone=document.querySelector('#login-form input[type=tel]');if(loginPhone)loginPhone.placeholder='手机号';
 // Preserve prototype status disclosure, clearly distinguish from a live service.
 const note=[...document.body.children].find(el=>el.tagName==='DIV'&&el.textContent.trim()==='界面预览 · 音频与账户未连接');
 if(note)note.textContent='交互预览 · 未连接音频与账户';
 const selector='button,[role="button"],summary,select,input[type="checkbox"]';
 const pressed=new WeakMap();
 function feedback(el){
  if(reduced.matches||el.disabled||el.matches('.companion')||el.closest('.preview-nav'))return;
  pressed.get(el)?.cancel();
  // Individual scale preserves original translate/absolute centering on play/like.
  const anim=el.animate([{scale:'1'},{scale:el.matches('.scene-tile,.rec-card,.play-entry')?'.985':'.94',offset:.32},{scale:'1'}],{duration:290,easing:'cubic-bezier(.16,1,.3,1)'});
  pressed.set(el,anim);
 }
 document.addEventListener('pointerdown',e=>{const el=e.target.closest(selector);if(el)feedback(el)},true);
 document.addEventListener('click',e=>{
  const el=e.target.closest(selector);if(!el||reduced.matches||el.disabled||el.closest('.preview-nav'))return;
  if(e.detail===0)feedback(el);
  if(!e.clientX&&!e.clientY)return;
  const ring=document.createElement('span');ring.className='tap-feedback';ring.setAttribute('aria-hidden','true');ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';document.body.append(ring);
  ring.animate([{opacity:.23,scale:'.5'},{opacity:0,scale:'2.4'}],{duration:360,easing:'ease-out'}).finished.finally(()=>ring.remove());
 },true);
 // Details content receives a brief reveal; native toggling is untouched.
 document.addEventListener('toggle',e=>{if(e.target.matches('details')&&e.target.open&&!reduced.matches){const body=e.target.querySelector('.details-body');body?.animate([{opacity:.3,translate:'0 -3px'},{opacity:1,translate:'0 0'}],{duration:220,easing:'ease-out'})}},true);
})();
(()=>{
 const note=[...document.body.children].find(e=>e.tagName==='DIV'&&e.textContent.trim()==='交互预览 · 未连接音频与账户');if(note)note.classList.add('preview-status');
 const icons={'↗':'M6 18 18 6M6 6h12v12','→':'M4 12h16M14 6l6 6-6 6','›':'m9 6 6 6-6 6','⇄':'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4','≈':'M3 9c3-5 6 5 9 0s6 5 9 0M3 15c3-5 6 5 9 0s6 5 9 0','▤':'M4 5h16v14H4zM8 9h8M8 13h8','▥':'M12 6c-3-3-7-2-9-1v14c3-1 6-2 9 1 3-3 6-2 9-1V5c-3-1-6-2-9 1ZM12 6v14','☾':'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10Z','◎':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'};
 document.querySelectorAll('.arrow,.go,.scene-tile .ico,.states-entry>span').forEach(el=>{const d=icons[el.textContent.trim()];if(d){el.innerHTML='<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>'}});
 // Minimum text legibility, without changing control order or handlers.
 document.fonts.ready.then(()=>document.querySelectorAll('button,small,p,label,summary,span,.center-title,.player-meta,.summary-value').forEach(el=>{
  if(!el.children.length&&el.textContent.trim()&&parseFloat(getComputedStyle(el).fontSize)<11)el.classList.add('type-small');
 }));
})();
(()=>{
 const svg=(content,cls='scene-symbol')=>'<svg class="'+cls+'" viewBox="0 0 48 48" aria-hidden="true">'+content+'</svg>';
 const symbols={
 commute:'<g class="symbol-motion"><rect x="12" y="7" width="24" height="31" rx="8"/><path d="M13 24h22M18 12h12M19 39l-4 5m14-5 4 5"/><rect x="17" y="16" width="14" height="8" rx="2"/><circle cx="18" cy="31" r="1.3"/><circle cx="30" cy="31" r="1.3"/></g><path class="scene-detail" d="M6 15v17m36-17v17"/>',
 relax:'<g class="symbol-motion"><path d="M15 26V16a9 9 0 0 1 18 0v10M10 22a4 4 0 0 1 8 0v6h12v-6a4 4 0 0 1 8 0v10H10ZM14 32v6m20-6v6"/></g><path class="scene-detail" d="M19 41h10M39 10l2-2m-6-2V3"/>',
 office:'<g class="symbol-motion"><rect x="9" y="10" width="30" height="23" rx="3"/><path d="M5 38h38l-4-5H9ZM20 18h9m-9 5h5"/></g><path class="scene-detail" d="M6 7h6m27 34h4"/>',
 study:'<g class="symbol-motion"><path d="M24 12c-6-5-12-4-17-2v27c6-2 11-3 17 2 6-5 11-4 17-2V10c-5-2-11-3-17 2ZM24 12v27M12 16l7 1m-7 6 7 1m10-7 7-1m-7 8 7-1"/></g>',
 focus:'<g class="symbol-motion"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="7"/><path d="M24 5v5m0 28v5M5 24h5m28 0h5"/></g>',
 sleep:'<g class="symbol-motion"><path d="M34 29A16 16 0 0 1 19 9a16 16 0 1 0 15 20Z"/></g><path class="scene-detail" d="M32 8v6m-3-3h6m3 6v4m-2-2h4"/>'};
 // Shared scene tokens: recommendation and full state picker use identical assets/colors.
 const palettes={commute:['#e8f0e2','#dfebd6','#566d4e'],relax:['#f5e7e7','#efd8db','#9a5960'],office:['#e1edf4','#d8e9f0','#476876'],study:['#e3f0e7','#d9ebdf','#476b58'],focus:['#f4ebdd','#eddeca','#6d573d'],sleep:['#e7e8f1','#dcddea','#5d677f']};
 document.querySelectorAll('#screen-main .rec-card,.scene-tile').forEach(card=>{
  const key=card.dataset.scene||card.dataset.sceneTheme, palette=palettes[key];if(!palette||!symbols[key])return;
  card.dataset.visualScene=key;
  ['paper','soft','ink'].forEach((name,i)=>card.style.setProperty('--card-'+name,palette[i]));
  if(card.matches('.scene-tile'))card.querySelector('.ico').innerHTML=svg(symbols[key]);
  else card.insertAdjacentHTML('beforeend',svg(symbols[key]));
 });
 const heart=document.querySelector('#like-btn .icon');if(heart){heart.innerHTML='<path class="heart-body" d="M12 20S3.5 15 3.5 9.4C3.5 4.8 9.2 3.4 12 7c2.8-3.6 8.5-2.2 8.5 2.4C20.5 15 12 20 12 20Z"/><g class="heart-spark"><path d="M1 4 0 2m23 2 1-2M1 15l-2 1m24-1 2 1"/></g>'}
 document.querySelectorAll('.back[aria-label="返回"] .icon').forEach(icon=>{icon.innerHTML='<path d="m13.5 6-6 6 6 6"/><path class="return-tail" d="M8 12h12"/>'});
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 document.addEventListener('pointerdown',e=>{if(reduced.matches)return;const card=e.target.closest('.rec-card');const motion=card?.querySelector('.symbol-motion');if(motion)motion.animate([{translate:'0 0'},{translate:card.dataset.scene==='commute'?'0 -2px':'0 1px',offset:.4},{translate:'0 0'}],{duration:420,easing:'ease-out'});
 const back=e.target.closest('.back');if(back)back.querySelector('svg')?.animate([{translate:'0 0'},{translate:'-3px 0',offset:.45},{translate:'0 0'}],{duration:280,easing:'ease-out'});
 },true);
 const like=document.getElementById('like-btn');if(like){const sync=()=>{like.setAttribute('aria-pressed',String(like.classList.contains('liked')));like.setAttribute('aria-label',like.classList.contains('liked')?'取消喜欢':'喜欢')};sync();new MutationObserver(sync).observe(like,{attributes:true,attributeFilter:['class']});like.addEventListener('click',()=>{if(!reduced.matches)heart?.animate([{scale:'1',rotate:'0deg'},{scale:like.classList.contains('liked')?'1.18':'.9',rotate:'-7deg',offset:.45},{scale:'1',rotate:'0deg'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'})});}
})();
