(() => {
  const site = new URL('./', location.href);
  let preferences = {};
  let catalog;
  function loadCatalog() {
    if (!catalog) catalog = fetch(new URL('catalog.json', site)).then(response => {
      if (!response.ok) throw new Error('曲库加载失败，请重试');
      return response.json();
    }).catch(error => { catalog = null; throw error; });
    return catalog;
  }

  function publicTrack(track) {
    return {...track,stream_url:new URL(track.file,site).href,liked:false};
  }

  window.BanpaiStaticBeta = true;
  window.BanpaiAPI = {
    async request(path, method, body) {
      const url = new URL(path, site);
      if (url.pathname === '/preferences' && method === 'PUT') {
        preferences = {...body};
        return preferences;
      }
      if (url.pathname === '/onboarding') return {ok:true};
      const {tracks} = await loadCatalog();
      if (url.pathname === '/tracks' || url.pathname === '/recommendations') {
        const scene = url.searchParams.get('scene');
        const matches = tracks.filter(track => track.themes.includes(scene));
        if (url.pathname === '/tracks') return matches.map(publicTrack);
        const target = preferences.energy ?? 46;
        const currentId = url.searchParams.get('current_id');
        const score = track => Math.abs(track.energy-target)
          - 15 * Number(track.styles.some(style => preferences.styles?.includes(style)));
        const items = matches.filter(track => track.id !== currentId)
          .sort((a, b) => score(a)-score(b)).slice(0, 30).map(publicTrack);
        return {items};
      }
      if (url.pathname.startsWith('/tracks/')) {
        const track = tracks.find(entry => entry.id === decodeURIComponent(url.pathname.slice(8)));
        if (track) return publicTrack(track);
      }
      throw new Error('当前曲目或功能暂不可用');
    },
    loadCatalog,
  };
})();
