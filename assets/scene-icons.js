/* Canonical 24-unit scene icons: identical optical size and thin outline strokes. */
(() => {
const icons={"commute": "<rect x=\"6\" y=\"3.5\" width=\"12\" height=\"15\" rx=\"4\"/><path d=\"M8 8h8v5H8zM9 18.5l-2 3m8-3 2 3M10 6h4\"/><circle cx=\"9\" cy=\"15.5\" r=\".55\"/><circle cx=\"15\" cy=\"15.5\" r=\".55\"/>", "focus": "<circle cx=\"12\" cy=\"12\" r=\"7.5\"/><circle cx=\"12\" cy=\"12\" r=\"3.5\"/><path d=\"M12 2v3m0 14v3M2 12h3m14 0h3\"/>", "reading": "<path d=\"M12 5.5C8.5 3.2 5.5 3.5 2.5 4.5v15c3-1 6-1.3 9.5 1 3.5-2.3 6.5-2 9.5-1v-15c-3-1-6-1.3-9.5 1Zm0 0v15M6 8l3 .4m-3 3.5 3 .4m6-3.9 3-.4m-3 4.3 3-.4\"/>", "office": "<rect x=\"4.5\" y=\"4\" width=\"15\" height=\"12\" rx=\"1.5\"/><path d=\"M4.5 16 2 20h20l-2.5-4M8 8h8m-8 3h4\"/>", "creative": "<path d=\"M12 3c-5 0-9 3.1-9 7.5 0 3.8 2.5 6.3 6.1 7.1L11 21h4l-1.7-3.7c-.7-1.8 5.8-.4 7-4.4C22 7.3 17.8 3 12 3Z\"/>"};
const colors={"commute": "#718a68", "focus": "#8c7253", "reading": "#5f8471", "office": "#5f8393", "creative": "#857da0"};
function apply(){
  document.querySelectorAll('#screen-main .rec-card,#screen-scenes .scene-tile').forEach(card=>{
    const key=card.dataset.scene||card.dataset.sceneTheme;if(!icons[key])return;
    const markup='<svg class="scene-symbol canonical-scene-icon" viewBox="0 0 24 24" aria-hidden="true" style="color:'+colors[key]+'">'+icons[key]+'</svg>';
    if(card.matches('.rec-card')){card.querySelectorAll('svg').forEach(n=>n.remove());card.insertAdjacentHTML('afterbegin',markup);}
    else {const container=card.querySelector('.ico');if(container)container.innerHTML=markup;}
  });
}
apply();document.addEventListener('DOMContentLoaded',apply,{once:true});
})();
