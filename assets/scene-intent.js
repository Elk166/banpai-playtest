/* One explicit five-scene resolver for typed status and future speech transcripts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BanpaiSceneIntent=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const names={commute:'通勤',focus:'刷题',reading:'阅读',office:'办公',creative:'创作'};
  // Longer activity phrases override contained generic verbs (写作业 ≠ 写作).
  const terms={
    commute:['通勤','坐地铁','地铁','坐公交','公交车','公交','坐车','乘车','驾车','驾驶','开车','打车','坐出租车','坐高铁','坐火车','坐飞机','赶路','走路','步行','骑车','骑自行车','回家','在路上','路上','出门'],
    focus:['刷题','做题','解题','练题','习题','试题','数学题','练习题','模拟题','真题','做试卷','写试卷','模拟考试','备考','准备考试','准备考研','准备考公','考研复习','考公复习','复习','考试','写作业','做作业','赶作业','完成作业','课后作业','背单词','记单词','背书','背课文','记知识点','整理错题','订正错题','复盘错题','练听力'],
    reading:['阅读','看书','读书','读论文','看论文','看材料','读材料','阅读材料','看资料','读资料','阅读资料','查阅资料','查资料','浏览资料','看文章','读文章','读小说','看小说','看教材','读教材','看课本','读课本','看文献','读文献','查文献','看杂志','读杂志','看新闻','读新闻','看电子书','读电子书'],
    office:['办公','工作','上班','开会','参加会议','线上会议','视频会议','会议','报表','邮件','整理材料','整理资料','准备材料','归档材料','汇总材料','整理文件','处理文件','归档文件','整理文档','处理文档','整理表格','处理表格','做表格','数据录入','录入数据','核对数据','分析数据','做汇报','准备汇报','准备会议','做ppt','写ppt','做方案','写方案','处理工作','编程','写代码','调试代码','修bug','周报','月报','日报','年报','财报','工作报告','工作总结','会议纪要','合同','发票','账单','对账','报销','项目计划','项目进度','客户需求','客户消息','回复客户','联系客户','回复邮件','收发邮件','处理邮件','写邮件'],
    creative:['创作','写作','写文章','绘画','画画','设计','作曲','编曲','写歌','剪视频','剪辑视频','视频剪辑','写小说','写论文','写作文','写文案','写剧本','写故事','写散文','写诗','写报告','画插画','画漫画','画草图','做海报','设计海报','设计图标','设计界面','头脑风暴','构思故事','构思情节','找灵感','灵感','创意']
  };
  const workDocuments='周报|月报|日报|年报|财报|工作报告|工作总结|会议纪要|合同|发票|账单|报表|工作邮件|邮件|项目计划|项目进度|客户需求';
  const patterns=[
    {scene:'office',pattern:new RegExp('(?:看|读|阅读|查看|浏览|查阅|检查|核对|写|撰写|整理|处理|审核|审阅|修改|分析|制作|编写)(?:一下|一份|这份|公司的|公司|工作中的|工作)?(?:'+workDocuments+')','g')},
    {scene:'office',pattern:/(?:整理|汇总|归档|处理|准备|分类)(?:一下|一些|这份|公司的|公司|工作)?(?:材料|资料|文件|文档|表格)/g},
    {scene:'reading',pattern:/(?:看|读|阅读|浏览|查阅)(?:一下|一些|这份|一本|一篇)?(?:材料|资料|书|文章|小说|教材|课本|文献|杂志)/g}
  ];
  function resolve(text){
    const original=String(text||'').trim().slice(0,200);
    const normalized=original.toLowerCase();
    const pivotNow=Math.max(original.lastIndexOf('现在'),original.lastIndexOf('此刻'),original.lastIndexOf('正在'));
    const future=/等会儿|等会|待会|一会儿|之后|然后再|接下来|明天/.exec(original.slice(Math.max(0,pivotNow)));
    const q=(future?normalized.slice(0,Math.max(0,pivotNow)+future.index):normalized),hits=[];
    for(const scene of Object.keys(names)){
      for(const term of terms[scene]){
        let at=q.indexOf(term);
        while(at>=0){hits.push({scene,at,term,end:at+term.length});at=q.indexOf(term,at+1);}
      }
    }
    for(const rule of patterns){rule.pattern.lastIndex=0;for(const m of q.matchAll(rule.pattern))hits.push({scene:rule.scene,at:m.index,term:m[0],end:m.index+m[0].length});}
    // Resolve nested matches before negation, so “不看周报” cannot leak a 周报 hit.
    const specific=hits.filter(h=>!hits.some(o=>o!==h&&o.at<=h.at&&o.end>=h.end&&(o.at<h.at||o.end>h.end)));
    const valid=specific.filter(h=>{
      const prefix=q.slice(Math.max(0,h.at-12),h.at);
      if(/(?:不想|不想再|不要|不是|不是在|不是正在|没有正在|不在|不去|没在|并非|没有在|不|没)(?:再|继续|看|读|写|处理|整理)?$/.test(prefix))return false;
      if(h.term==='上班'&&/(地铁|公交|通勤|开车|路上)/.test(q)&&!/(已经到|到了|到公司|到办公室)/.test(q))return false;
      return true;
    });
    if(!valid.length)return null;
    // Use an explicit present-intent clause when a sentence also mentions a past/future activity.
    const pivot=Math.max(q.lastIndexOf('现在'),q.lastIndexOf('此刻'),q.lastIndexOf('正在'),q.lastIndexOf('想要'));
    const current=pivot>=0?valid.filter(h=>h.at>=pivot):valid;
    if(pivot>=0&&!current.length)return null;
    const active=current.length?current:valid;
    const broad=new Set(['备考','准备考试','准备考研','准备考公','考试','复习','工作','上班','灵感','创意']);
    const concrete=active.filter(h=>!broad.has(h.term));
    const candidates=concrete.length?concrete:active;
    const scenes=[...new Set(candidates.map(h=>h.scene))];
    return scenes.length===1?{scene:scenes[0],name:names[scenes[0]],text:original}:null;
  }
  return{resolve,names};
});
