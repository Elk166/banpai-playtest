/* Homepage-only composition proposals. Reparent original nodes, retain handlers. */
(()=>{
 const mode=new URLSearchParams(location.search).get('atmosphere');const choice=['lake','halo','horizon'].includes(mode)?mode:'lake';const phone=document.querySelector('#phone');phone.dataset.atmosphere=choice;phone.dataset.concept=choice==='lake'?'echo':choice==='halo'?'orbit':'ribbon';
 const main=document.querySelector('#screen-main .main-body');main.querySelector('.home-soundfield')?.remove();
 const hero=document.createElement('div');hero.className='atmosphere-hero';hero.setAttribute('aria-hidden','true');
 const graphic='<svg class="quiet-mark" viewBox="0 0 240 240"><circle class="mark-wash" cx="120" cy="120" r="57"/><g class="mark-rings"><circle cx="120" cy="120" r="68"/><circle cx="120" cy="120" r="83"/><circle cx="120" cy="120" r="98"/></g><path class="mark-arc" d="M51 159a79 79 0 0 1 138-78"/><circle class="mark-dot" cx="189" cy="81" r="2.3"/></svg>';
 if(choice==='lake')hero.innerHTML='<img class="lake-scene" src="assets/morning-lake.png" alt="">';
 if(choice==='halo')hero.innerHTML=graphic;
 if(choice==='horizon')hero.innerHTML='<img class="lake-scene" src="assets/morning-lake.png" alt="">'+graphic;
 const controls=document.createElement('div');controls.className='home-state-zone';while(main.firstChild)controls.append(main.firstChild);main.append(hero,controls);
 // Keep all prototype notes accessible but avoid overlong repeated device copy.

})();
/* Decorative speaker-like motion for proposal B. No audio or biometric input. */
(()=>{
 if(document.querySelector('#phone').dataset.atmosphere!=='halo')return;
 const hero=document.querySelector('.atmosphere-hero'),svg=hero.querySelector('.quiet-mark'),group=svg.querySelector('.mark-rings'),wash=svg.querySelector('.mark-wash');
 const ns='http://www.w3.org/2000/svg';group.replaceChildren();
 const rings=[68,83,98].map(radius=>{const p=document.createElementNS(ns,'path');p.classList.add('speaker-contour');group.append(p);return {p,radius}});
 const screen=document.querySelector('#screen-main'),reduce=matchMedia('(prefers-reduced-motion:reduce)');let frame=0,last=0;
 function draw(t,still=false){
  const phase=(t%2.65)/2.65;
  const beat=still?0:Math.exp(-Math.pow((phase-.16)/.055,2))+.52*Math.exp(-Math.pow((phase-.3)/.065,2));
  const swell=still?1:1+.008*Math.sin(t*.75)+.024*beat;
  group.style.transform='translate('+(still?0:(Math.sin(t*17)*beat*.28)).toFixed(3)+'px,'+(still?0:(Math.cos(t*13)*beat*.2)).toFixed(3)+'px) scale('+swell.toFixed(5)+')';
  wash.style.transform='scale('+(1+beat*.04).toFixed(5)+')';wash.style.opacity=String(.5+beat*.1);
  rings.forEach(({p,radius},i)=>{let d='';for(let n=0;n<96;n++){const a=n/96*Math.PI*2;const amount=still?0:(.5+beat*1.8);const r=radius+amount*(Math.sin(a*5-t*2.1+i*.8)*.7+Math.sin(a*9+t*1.7)*.3);d+=(n?'L':'M')+(120+Math.cos(a)*r).toFixed(2)+','+(120+Math.sin(a)*r).toFixed(2)}p.setAttribute('d',d+'Z')});
 }
 function tick(ms){frame=0;if(ms-last>32){last=ms;draw(ms/1000)}if(active())frame=requestAnimationFrame(tick)}
 function active(){return !reduce.matches&&!document.hidden&&screen.classList.contains('is-active')}
 function sync(){cancelAnimationFrame(frame);frame=0;hero.classList.toggle('halo-active',active());if(active())frame=requestAnimationFrame(tick);else draw(0,true)}
 new MutationObserver(sync).observe(screen,{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);sync();
})();
