(() => {
  const box=document.querySelector('.touchbox'),pad=document.querySelector('.pad');
  function fit(){
    const size=Math.floor(Math.max(64,Math.min(box.clientWidth-44,box.clientHeight-42)));
    if(pad.style.getPropertyValue('--fit-pad')!==size+'px')pad.style.setProperty('--fit-pad',size+'px');
    const lift=Math.min(innerHeight<=520?8:28,Math.max(0,pad.offsetTop-28));
    pad.style.setProperty('--pad-lift',lift+'px');
    const top=pad.offsetTop-lift;
    box.querySelector('.high').style.top=(top-20)+'px';
    box.querySelector('.low').style.top=(top+size+7)+'px';
    for(const label of box.querySelectorAll('.soft,.bright'))label.style.top=(top+size/2)+'px';
  }
  new ResizeObserver(fit).observe(box);fit();
})();
