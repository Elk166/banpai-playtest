(() => {
 const option = new URLSearchParams(location.search).get('finish');
 document.querySelector('#phone').dataset.transparency = ['air','balanced','water'].includes(option) ? option : 'balanced';
 document.querySelectorAll('.etched-tracks').forEach(svg => {
   svg.querySelectorAll('.track-lines circle').forEach((circle, index) => circle.setAttribute('r', [86, 76, 66][index]));
   const dot = svg.querySelector('.track-dot');
   dot.setAttribute('cx', '189');
   dot.setAttribute('cy', '88');
 });
})();
