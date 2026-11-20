/* Authenticated product API. No credentials or media bytes ship with this client. */
(function(root, factory) {
  if(typeof module === 'object' && module.exports) module.exports = factory;
  else root.BanpaiAPI = factory(root.fetch.bind(root), root.sessionStorage, root.location);
})(globalThis, function(fetcher, storage, location) {
  let base = storage.getItem('banpai.api') || 'http://127.0.0.1:8000';
  let token = storage.getItem('banpai.token') || '';
  const local = location && ['127.0.0.1','localhost'].includes(location.hostname);
  const hosted = location && (!local || /^\/ui(?:\/|$)/.test(location.pathname));
  if (hosted && base !== location.origin) {
    base = location.origin;
    token = '';
    storage.setItem('banpai.api',base);
    storage.removeItem('banpai.token');
  }
  // Local preview links may select a local service; credentials never go in URLs.
  if(local && !hosted) {
    const address=new URLSearchParams(location.search).get('api');
    if(address)try {
      const target=new URL(address);
      if(target.protocol==='http:' && ['127.0.0.1','localhost'].includes(target.hostname) && !target.username && !target.password && target.pathname==='/' && !target.search && !target.hash) {
        if(base!==target.origin){token='';storage.removeItem('banpai.token');}
        base=target.origin;storage.setItem('banpai.api',base);
      }
    } catch {}
  }
  async function request(path, method='GET', body) {
    const response = await fetcher(base+'/v1/app'+path, {
      method, headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}), signal:AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(()=>({}));
    if(!response.ok) {
      if(response.status===401) { token=''; storage.removeItem('banpai.token'); }
      const detail=data.detail;
      const error=new Error(typeof detail==='string'?detail:detail?.message||'请求失败，请重试');
      error.status=response.status; throw error;
    }
    return data;
  }
  return {request, get base(){return base}, get token(){return token},
    setBase(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('请输入完整服务地址，如 http://127.0.0.1:8000');base=url.origin;token='';storage.setItem('banpai.api',base);storage.removeItem('banpai.token');},
    authenticate(data){token=data.token;storage.setItem('banpai.token',token);},
    clear(){token='';storage.removeItem('banpai.token');}
  };
});
