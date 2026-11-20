/* Isolated proposals. Existing IDs, hit areas and business handlers are untouched. */
(()=>{
 const keys=['orbit','echo','ribbon'];const choice=new URLSearchParams(location.search).get('concept');const concept=keys.includes(choice)?choice:'orbit';document.querySelector('#phone').dataset.concept=concept;
 const ns='http://www.w3.org/2000/svg';
 const hero=document.createElement('div');hero.className='home-soundfield';hero.setAttribute('aria-hidden','true');
 const artwork={
 orbit:'<g class="field-orbit"><ellipse cx="180" cy="79" rx="100" ry="52"/><ellipse cx="180" cy="79" rx="83" ry="43"/><ellipse cx="180" cy="79" rx="65" ry="34"/><ellipse cx="180" cy="79" rx="46" ry="24"/><ellipse cx="180" cy="79" rx="23" ry="12"/></g><g class="field-drift"><path d="M52 96C77 46 261 25 308 69"/><circle cx="305" cy="66" r="3"/></g>',
 echo:'<g class="field-left"><circle cx="150" cy="79" r="55"/><circle cx="150" cy="79" r="43"/><circle cx="150" cy="79" r="30"/></g><g class="field-right"><circle cx="210" cy="79" r="55"/><circle cx="210" cy="79" r="43"/><circle cx="210" cy="79" r="30"/></g><path class="field-bridge" d="M127 79h106"/>',
 ribbon:Array.from({length:9},(_,i)=>{const rx=58+i*5,ry=27+i*3;return '<ellipse class="ribbon-line" cx="180" cy="79" rx="'+rx+'" ry="'+ry+'" transform="rotate('+(i*5-20)+' 180 79)"/>'}).join('')};
 hero.innerHTML='<svg viewBox="0 0 360 158" focusable="false">'+artwork[concept]+'</svg>';
 const status=document.querySelector('#open-status');status.nextElementSibling.insertAdjacentElement('afterend',hero);
 const play=document.querySelector('#play-toggle'), original=document.querySelector('#play-icon');
 const glyph=document.createElement('span');glyph.className='control-glyph';glyph.setAttribute('aria-hidden','true');play.append(glyph);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 function sync(){const playing=original.innerHTML.includes('M7.5');play.classList.toggle('visual-playing',playing);play.setAttribute('aria-label',playing?'暂停':'播放');glyph.innerHTML='<svg viewBox="0 0 24 24">'+(playing?'<path class="pause-stroke" d="M9 7v10M15 7v10"/>':'<path class="play-stroke" d="m9 6 9 6-9 6Z"/>')+'</svg>';if(!reduced.matches)glyph.animate([{opacity:.5,scale:'.83'},{opacity:1,scale:'1'}],{duration:260,easing:'ease-out'});}
 sync();new MutationObserver(sync).observe(original,{childList:true});
 if(concept==='echo')document.querySelector('#like-btn').classList.add('echo-heart');
 if(concept==='ribbon')document.querySelector('#like-btn').classList.add('ribbon-heart');
})();
