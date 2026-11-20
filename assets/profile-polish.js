(() => {
 const svg=(path)=>`<svg class="profile-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
 const paths={music:'M8 17V6l11-2v11M8 9l11-2M8 17c0 3-6 4-6 1 0-2 4-3 6-1Zm11-2c0 3-6 4-6 1 0-2 4-3 6-1Z',heart:'M12 20S3 15 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z',play:'m9 6 9 6-9 6Z',crown:'M3 7l4 3 5-6 5 6 4-3-2 12H5ZM6 22h12',device:'M8 5V2h8v3M8 19v3h8v-3M7 5h10v14H7Z',sound:'M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4',privacy:'M12 2 4 5v6c0 6 8 11 8 11s8-5 8-11V5ZM9 11l2 2 4-4',receipt:'M6 3h12v19l-3-2-3 2-3-2-3 2ZM9 8h6m-6 4h6',flow:'M3 8h14l-3-3m3 3-3 3M21 16H7l3-3m-3 3 3 3',spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z'};
 const profile=document.querySelector('#screen-profile');
 profile.querySelectorAll('.cover').forEach(el=>{el.innerHTML=svg(el.closest('.p-block')?.querySelector('.p-head b')?.textContent.includes('喜欢')?paths.heart:paths.music);});
 profile.querySelectorAll('.p-item .play').forEach(el=>el.innerHTML=svg(paths.play));
 const crown=profile.querySelector('.sub-card>span:first-child');if(crown)crown.innerHTML=svg(paths.crown);
 const rows=[...profile.querySelectorAll('.setting-row')];const keys=['flow','spark','device','sound','receipt','privacy'];rows.forEach((row,i)=>row.insertAdjacentHTML('afterbegin',svg(paths[keys[i]]||paths.sound)));
})();
