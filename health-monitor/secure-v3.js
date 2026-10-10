(() => {
  const style = document.createElement('style');
  style.textContent = `
  .family-gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#f7faff 0,#edf4fb 100%)}
  .family-gate .box{width:min(440px,100%);padding:28px;box-shadow:0 18px 50px rgba(20,54,90,.14)}
  .family-gate h1{margin:0 0 8px;font-size:30px}.family-gate p{margin:0 0 16px;color:#667085;line-height:1.65}
  .access-code-input{font-size:18px;letter-spacing:1px;text-transform:uppercase}
  .overall-judgment{margin:0 0 14px;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,#eef6ff,#f8fbff);border:1px solid #cfe1f6}
  .overall-judgment strong{display:block;font-size:18px;color:#183b5f;margin-bottom:7px}
  .overall-judgment .detail{font-size:13px;color:#475467;line-height:1.7}
  .access-panel{max-width:760px}.access-panel .access-status{margin:8px 0 16px;padding:12px 14px;border-radius:10px;background:#f7f9fc;color:#475467;font-size:13px}
.auto-review-panel{margin-top:18px;border-color:#cfe1f6;background:linear-gradient(180deg,#fff,#f8fbff)}
.auto-review-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
.auto-review-head h3{margin:0 0 5px}.auto-review-head p{margin:0;color:#667085;font-size:13px}
.auto-review-table input{margin:0;padding:7px 8px}.auto-review-table input[type=checkbox]{width:auto}
.auto-review-table td,.auto-review-table th{vertical-align:middle}
.auto-progress{padding:12px 14px;border-radius:10px;background:#eef6ff;color:#24527d;margin:12px 0;font-size:13px;line-height:1.6}
.batch-report{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;box-shadow:0 4px 14px rgba(31,51,73,.04)}
.batch-report+.batch-report{margin-top:10px}.batch-report-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.batch-report-files{margin-top:10px;border-top:1px solid #eef2f6;padding-top:8px;display:grid;gap:6px}
.batch-report-file{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:13px}
.batch-state{font-size:12px;font-weight:750;padding:4px 8px;border-radius:999px;background:#f2f4f7;color:#475467}
.batch-state.missing{background:#fff0ef;color:#b42318}.batch-state.ready{background:#ecfdf3;color:#067647}
  `;
  document.head.appendChild(style);

  let guestCodeV3 = '';

  function ensureFamilyGate(){
    if(document.getElementById('familyGate')) return;
    const gate=document.createElement('div');
    gate.id='familyGate';gate.className='family-gate hidden';
    gate.innerHTML='<div class="box"><h1>病情监测</h1><p>家属查看请输入访问码。无需注册账号，验证后本机可记住访问权限。</p><input id="familyCode" class="access-code-input" type="password" autocomplete="off" placeholder="请输入家属访问码"><div class="row"><button id="familyEnter">进入查看</button><button id="familyAdminLogin" class="alt">管理员登录</button></div><div id="familyMsg" class="msg"></div></div>';
    document.body.insertBefore(gate,document.getElementById('auth'));
    document.getElementById('familyEnter').onclick=enterFamilyV3;
    document.getElementById('familyAdminLogin').onclick=showAdminLoginV3;
    document.getElementById('familyCode').addEventListener('keydown',ev=>{if(ev.key==='Enter')enterFamilyV3()});
  }

  function ensureHeader(){
    const badge=document.querySelector('.guest-badge'); if(badge) badge.textContent='家属只读';
    const row=document.querySelector('header .row');
    if(row && !document.getElementById('guestExit')){
      const btn=document.createElement('button');btn.id='guestExit';btn.className='alt guest-only';btn.textContent='退出查看';
      const admin=document.getElementById('adminLoginBtn');row.insertBefore(btn,admin||row.firstChild);
      btn.onclick=()=>{guestCodeV3='';localStorage.removeItem('familyAccessCode');showFamilyGateV3('已退出家属查看')};
    }
  }

  function ensureAccessSettings(){
    const nav=document.querySelector('nav');
    if(nav && !nav.querySelector('[data-tab="access"]')){
      const btn=document.createElement('button');btn.className='admin-only';btn.dataset.tab='access';btn.textContent='访问设置';
      const backup=nav.querySelector('[data-tab="backup"]');nav.insertBefore(btn,backup||null);
      btn.onclick=function(){document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.getElementById('access').classList.add('active')};
    }
    if(!document.getElementById('access')){
      const sec=document.createElement('section');sec.id='access';sec.className='tab';
      sec.innerHTML='<h2>访问设置</h2><div class="panel access-panel"><h3>家属访问码</h3><div class="access-status">家属无需账号，只输入访问码即可查看只读数据。访问码不会写在网页源码里。</div><label>设置新的访问码（至少 8 位）</label><input id="newFamilyCode" class="access-code-input" type="text" autocomplete="off" placeholder="例如：ABCD-1234"><div class="row"><button id="saveFamilyCode">更新访问码</button></div><div id="accessMsg" class="msg"></div></div>';
      const backup=document.getElementById('backup');backup.parentNode.insertBefore(sec,backup);
      document.getElementById('saveFamilyCode').onclick=saveFamilyCodeV3;
    }
  }

  function showFamilyGateV3(msg=''){
    ensureFamilyGate();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('familyGate').classList.remove('hidden');
    document.getElementById('familyMsg').textContent=msg;
  }
  function showAdminLoginV3(){
    ensureFamilyGate();
    document.getElementById('familyGate').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth').classList.remove('hidden');
    document.getElementById('authmsg').textContent='';
  }

  async function renderDataV3(){
    let op=defs.map(m=>'<option value="'+safe(m.code)+'">'+safe(typeof metricOptionLabel==='function'?metricOptionLabel(m):(m.name+' ('+m.code+')'))+'</option>').join('');
    e('metric').innerHTML=op;e('trendMetric').innerHTML=op;e('metric').onchange=sync;e('trendMetric').onchange=drawDetailTrend;
    if(typeof setupTrendMetricSearch==='function')setupTrendMetricSearch();
    sync();home();if(sess)reportList();draw();
  }
  async function loadAdminV3(){
    let a=await Promise.all([
      db.from('metric_definitions').select('*').order('system_group').order('name'),
      db.from('results').select('*').order('collected_at'),
      db.from('reports').select('*').order('collected_at',{ascending:false})
    ]);
    if(a[0].error||a[1].error)return false;
    defs=a[0].data||[];vals=a[1].data||[];reps=!a[2].error?(a[2].data||[]):[];
    await renderDataV3();return true;
  }
  async function loadGuestV3(code){
    try{
      let r=await db.rpc('get_family_dashboard',{p_code:code});
      if(r.error||!r.data){
        console.error('family dashboard load failed',r.error);
        return false;
      }
      let data=r.data;
      if(typeof data==='string'){try{data=JSON.parse(data)}catch(_e){}}
      if(!data||typeof data!=='object')return false;
      let metrics=data.metrics||[],results=data.results||[];
      if(typeof metrics==='string'){try{metrics=JSON.parse(metrics)}catch(_e){metrics=[]}}
      if(typeof results==='string'){try{results=JSON.parse(results)}catch(_e){results=[]}}
      defs=Array.isArray(metrics)?metrics:[];
      vals=Array.isArray(results)?results:[];
      reps=[];
      await renderDataV3();
      return defs.length>0;
    }catch(err){
      console.error('family dashboard exception',err);
      return false;
    }
  }

  async function routeAccessV3(){
    ensureFamilyGate();ensureHeader();ensureAccessSettings();
    e('auth').classList.add('hidden');e('familyGate').classList.add('hidden');
    if(sess){
      e('app').classList.remove('hidden');e('app').classList.remove('guest-mode');e('who').textContent=sess.user.email||'管理员';
      await loadAdminV3();return;
    }
    const saved=localStorage.getItem('familyAccessCode')||'';
    if(saved && await loadGuestV3(saved)){
      guestCodeV3=saved;e('app').classList.remove('hidden');e('app').classList.add('guest-mode');return;
    }
    if(saved)localStorage.removeItem('familyAccessCode');
    showFamilyGateV3();
  }

  async function enterFamilyV3(){
    const code=e('familyCode').value.trim();
    if(code.length<8){e('familyMsg').textContent='请输入正确的家属访问码';return}
    e('familyMsg').textContent='验证中…';
    const ok=await loadGuestV3(code);
    if(!ok){e('familyMsg').textContent='未能读取数据。请先确认访问码；若访问码正确，请刷新页面后重试。';return}
    guestCodeV3=code;localStorage.setItem('familyAccessCode',code);
    e('familyGate').classList.add('hidden');e('app').classList.remove('hidden');e('app').classList.add('guest-mode');e('familyMsg').textContent='';
  }

  async function saveFamilyCodeV3(){
    if(!sess){e('accessMsg').textContent='请先管理员登录';return}
    const code=e('newFamilyCode').value.trim();
    if(code.length<8){e('accessMsg').textContent='访问码至少 8 位';return}
    e('accessMsg').textContent='更新中…';
    let r=await db.rpc('set_family_access_code',{p_code:code});
    if(r.error){e('accessMsg').textContent='更新失败：'+r.error.message;return}
    e('accessMsg').textContent='访问码已更新，旧访问码立即失效。';e('newFamilyCode').value='';
  }

  function latestAbnormal(code){
    let m=defs.find(x=>x.code===code),s=series(code);
    return !!(m&&s.length&&stateR(m,s[s.length-1])!=='参考范围内');
  }
  function currentRiskDomainsV3(){
    const groups=[
      {name:'感染相关',codes:['WBC','PCT','CRP','IL6']},
      {name:'肾功能',codes:['CREA','UREA','CYSC']},
      {name:'凝血/血小板',codes:['PLT','DD','FIB','INR','APTT']},
      {name:'循环灌注',codes:['LAC']},
      {name:'肝胆',codes:['TBIL','DBIL','IBIL','ALT','AST']},
      {name:'心脏负荷',codes:['NTPROBNP','TNT','MYO']},
      {name:'氧合',codes:['PO2','SO2','PF']},
      {name:'电解质/酸碱',codes:['K','CA','ICA','MG','NA','HCO3','HCO3STD','AG']}
    ];
    return groups.filter(g=>g.codes.some(latestAbnormal)).map(g=>g.name);
  }
  function latestPointV5(code){
    const s=series(code);
    return s.length?s[s.length-1]:null;
  }
  function previousPointV5(code){
    const s=series(code);
    return s.length>1?s[s.length-2]:null;
  }
  function fmtNumV5(v){
    const n=Number(v);
    if(!Number.isFinite(n))return String(v??'');
    if(Math.abs(n)>=1000)return n.toFixed(n%1?2:0);
    if(Math.abs(n)>=100)return n.toFixed(n%1?1:0);
    if(Math.abs(n)>=10)return n.toFixed(n%1?2:0).replace(/0+$/,'').replace(/\.$/,'');
    return n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
  }
  const KEY_SUMMARY_V5={
    PLT:{label:'血小板',good:'回升',bad:'下降',why:'仍低时出血风险较高'},
    WBC:{label:'白细胞',good:'下降',bad:'升高',why:'仍高说明感染/炎症仍重'},
    PCT:{label:'降钙素原',good:'下降',bad:'升高',why:'仍高说明严重细菌感染尚未完全控制'},
    CRP:{label:'C反应蛋白',good:'下降',bad:'升高',why:'仍高说明炎症仍活跃'},
    LAC:{label:'乳酸',good:'下降',bad:'升高',why:'升高要关注循环灌注是否不足'},
    CREA:{label:'肌酐',good:'下降',bad:'升高',why:'仍高说明肾功能尚未恢复'},
    NTPROBNP:{label:'NT-proBNP',good:'下降',bad:'升高',why:'仍高提示心脏负荷较重'},
    TBIL:{label:'总胆红素',good:'下降',bad:'升高',why:'仍高说明肝胆/胆道问题尚未完全恢复'},
    HGB:{label:'血红蛋白',good:'回升',bad:'下降',why:'偏低提示贫血/携氧能力下降'},
    INR:{label:'INR',good:'下降',bad:'升高',why:'升高提示凝血时间延长'},
    HCO3:{label:'碳酸氢根',good:'回升',bad:'下降',why:'偏低提示代谢性酸负荷仍存在'},
    ICA:{label:'离子钙',good:'回升',bad:'下降',why:'偏低会影响心肌和神经肌肉功能'}
  };
  const KEY_ORDER_V5=['PLT','WBC','PCT','CRP','LAC','CREA','NTPROBNP','TBIL','HGB','INR','HCO3','ICA'];

  function keyTrendV5(code){
    const cfg=KEY_SUMMARY_V5[code],m=defs.find(x=>x.code===code),z=latestPointV5(code),p=previousPointV5(code);
    if(!cfg||!m||!z)return null;
    const st=stateR(m,z),a=assess(m,p&&p.value,z.value);
    return {code,cfg,m,z,p,state:st,trend:a[1],trendText:a[0]};
  }

  function shortChangeV5(x){
    const unit=x.z.unit||x.m.unit||'';
    if(!x.p)return x.cfg.label+' '+fmtNumV5(x.z.value)+(unit?' '+unit:'');
    const arrow=Number(x.z.value)>Number(x.p.value)?'↑':Number(x.z.value)<Number(x.p.value)?'↓':'→';
    return x.cfg.label+' '+fmtNumV5(x.p.value)+' '+arrow+' '+fmtNumV5(x.z.value)+(unit?' '+unit:'');
  }

  function readableListsV5(){
    const items=KEY_ORDER_V5.map(keyTrendV5).filter(Boolean);
    const improved=items.filter(x=>x.trend==='good');
    const worse=items.filter(x=>x.trend==='bad');
    const abnormal=items.filter(x=>x.state!=='参考范围内');

    const improvedText=improved.map(x=>({
      code:x.code,
      text:shortChangeV5(x)+'，'+x.cfg.good+'，属于好转',
      state:x.state
    }));

    const worseText=worse.map(x=>({
      code:x.code,
      text:shortChangeV5(x)+'，'+x.cfg.bad+'；'+x.cfg.why,
      state:x.state
    }));

    const recoveringText=abnormal.filter(x=>x.trend==='good').map(x=>({
      code:x.code,
      text:x.cfg.label+'目前 '+fmtNumV5(x.z.value)+(x.z.unit||x.m.unit?' '+(x.z.unit||x.m.unit):'')+'，虽然方向在改善，但仍'+(x.state==='低于参考'?'偏低':'偏高'),
      state:x.state
    }));

    const persistentText=abnormal.filter(x=>x.trend!=='good'&&x.trend!=='bad').map(x=>({
      code:x.code,
      text:x.cfg.label+'目前 '+fmtNumV5(x.z.value)+(x.z.unit||x.m.unit?' '+(x.z.unit||x.m.unit):'')+'，'+x.cfg.why,
      state:x.state
    }));

    return {items,improved,worse,abnormal,improvedText,worseText,recoveringText:[...recoveringText,...persistentText]};
  }

  function overallJudgmentV3(a){
    const r=readableListsV5();
    const goodNames=r.improved.slice(0,3).map(x=>x.cfg.label);
    const badNames=r.worse.slice(0,3).map(x=>x.cfg.label);
    let title='本轮总体：';
    if(goodNames.length&&badNames.length){
      title+=goodNames.join('、')+'在改善；但'+badNames.join('、')+'出现不利变化。';
    }else if(goodNames.length){
      title+=goodNames.join('、')+'在改善，但仍有部分指标没有恢复正常。';
    }else if(badNames.length){
      title+=badNames.join('、')+'出现不利变化，需要重点关注。';
    }else{
      title+='主要指标暂时没有明显新的变化。';
    }

    // Add a plain-language clinical-level summary based on the current key data.
    const plt=keyTrendV5('PLT'),wbc=keyTrendV5('WBC'),pct=keyTrendV5('PCT'),crp=keyTrendV5('CRP'),lac=keyTrendV5('LAC'),ica=keyTrendV5('ICA'),inr=keyTrendV5('INR');
    const infectionBetter=[wbc,pct,crp].filter(x=>x&&x.trend==='good').length>=2;
    const pltBetter=plt&&plt.trend==='good';
    const keyWorse=[lac,ica,inr].filter(x=>x&&x.trend==='bad').map(x=>x.cfg.label);

    let detail='';
    if(infectionBetter)detail+='感染相关指标整体下降，提示炎症/感染负荷在减轻。';
    if(pltBetter)detail+=(detail?' ':'')+'血小板回升是积极变化，但当前仍明显偏低。';
    if(keyWorse.length)detail+=(detail?' ':'')+keyWorse.join('、')+'需要继续观察。';
    if(!detail)detail='请结合血压、尿量、意识状态、氧疗强度和医生查房判断整体病情。';
    return {title,detail};
  }

  function readableListHtmlV5(items,empty){
    if(!items.length)return '<div class="summary-empty">'+empty+'</div>';
    return '<ul>'+items.slice(0,6).map(x=>'<li>'+safe(x.text)+'</li>').join('')+'</ul>';
  }

  batchSummaryHtml=function(a,hero){
    if(!a)return'<div class="panel summary-empty">暂无可用于比较的检验数据。</div>';
    let timeText=fmtChina(a.start.toISOString());
    if(a.end-a.start>5*60*1000)timeText+=' ～ '+fmtChina(a.end.toISOString());
    const overall=overallJudgmentV3(a),r=readableListsV5();
    const good=r.improvedText;
    const bad=r.worseText;
    const recovering=r.recoveringText.filter(x=>!bad.some(y=>y.code===x.code));

    return '<div class="'+(hero?'report-summary-hero':'')+'">'+
      (hero?'<div class="overall-judgment"><strong>'+safe(overall.title)+'</strong><div class="detail">'+safe(overall.detail)+'</div></div>':'')+
      (hero?'<div class="report-summary-head"><div><div class="report-summary-title">这次检查和上一次相比</div><div class="report-summary-sub">采样时间：'+safe(timeText)+' · 重点看 12 项关键指标</div></div><div class="report-summary-score"><span class="sum-chip good">好转 '+good.length+'</span><span class="sum-chip bad">需注意 '+bad.length+'</span><span class="sum-chip warn">仍异常 '+recovering.length+'</span></div></div>':'')+
      '<div class="report-summary-grid">'+
        '<div class="report-summary-col"><h4 class="good">✓ 明显好转</h4>'+readableListHtmlV5(good,'这次没有看到明确好转的重点指标')+'</div>'+
        '<div class="report-summary-col"><h4 class="bad">! 需要重点注意</h4>'+readableListHtmlV5(bad,'这次没有看到重点指标明显变差')+'</div>'+
        '<div class="report-summary-col"><h4 class="warn">○ 虽好转但还没正常</h4>'+readableListHtmlV5(recovering,'重点指标目前没有额外持续异常')+'</div>'+
      '</div>'+
      (hero?'<div class="report-summary-note">这里优先展示血小板、感染指标、乳酸、肾功能、心脏负荷、肝胆、凝血、酸碱和电解质等重点变化；普通小幅波动不会放在最前面。仅用于家属看趋势，不能替代主管医生判断。</div>':'')+
    '</div>';
  };

  function dedupeRowsV3(rows){
    const map=new Map();rows.forEach(r=>map.set([r.user_id,r.collected_at,r.metric_code].join('|'),r));return [...map.values()];
  }
  async function writeResultsV3(rows,label='数据'){
    rows=dedupeRowsV3(Array.isArray(rows)?rows:[rows]);
    let r=await db.from('results').insert(rows);
    if(!r.error)return {ok:true,message:'已保存 '+rows.length+' 条'+label};
    if(r.error.code!=='23505')return {ok:false,error:r.error};
    const overwrite=confirm('检测到同一采样时间、同一指标已经存在。\n\n点击“确定”：用新结果覆盖旧结果。\n点击“取消”：保留旧结果，只导入本次新增指标。');
    let u=await db.from('results').upsert(rows,{onConflict:'user_id,collected_at,metric_code',ignoreDuplicates:!overwrite});
    if(u.error)return {ok:false,error:u.error};
    return {ok:true,message:overwrite?'已覆盖重复项并保存':'已保留原值，仅保存新增项'};
  }


  let autoReviewStateV3={items:[],time:''};

  function ensureAutoReviewUIV3(){
    if(e('autoReviewPanel'))return;
    const panel=document.createElement('div');
    panel.id='autoReviewPanel';panel.className='panel auto-review-panel hidden';
    panel.innerHTML='<div class="auto-review-head"><div><h3>自动识别结果</h3><p>原报告已经保存。请核对识别结果后再更新趋势，避免OCR误识别。</p></div><span class="pill">保存后自动刷新总览与趋势</span></div><div id="autoRecognizeMsg" class="auto-progress">等待识别</div><div class="scroll"><table class="auto-review-table"><thead><tr><th>保存</th><th>指标</th><th>识别结果</th><th>单位</th><th>参考下限</th><th>参考上限</th><th>来源</th></tr></thead><tbody id="autoReviewRows"></tbody></table></div><div class="row" style="margin-top:14px"><button id="saveAutoReview">确认并更新趋势</button><button id="cancelAutoReview" class="alt">暂不保存</button></div>';
    const upload=e('upload');
    const firstPanel=upload.querySelector('.panel');
    firstPanel.insertAdjacentElement('afterend',panel);
    e('saveAutoReview').onclick=saveAutoReviewV3;
    e('cancelAutoReview').onclick=()=>{panel.classList.add('hidden');autoReviewStateV3={items:[],time:''}};
  }

  const OCR_ALIASES_V3={
    WBC:['白细胞计数','白细胞数'],PLT:['血小板计数'],CRP:['C反应蛋白','超敏C反应蛋白'],PCT:['降钙素原'],
    CREA:['肌酐','CREA','Cr'],UREA:['尿素'],CYSC:['胱抑素C','CysC'],UA:['尿酸'],
    TBIL:['总胆红素','T-BIL','TBIL'],DBIL:['直接胆红素','D-BIL','DBIL'],IBIL:['间接胆红素','I-BIL','IBIL'],
    ALT:['丙氨酸氨基转移酶','谷丙转氨酶','ALT'],AST:['天门冬氨酸氨基转移酶','谷草转氨酶','AST'],
    TP:['总蛋白'],ALB:['白蛋白'],NH3:['血氨'],
    LAC:['乳酸','Lac'],NTPROBNP:['NT-proBNP','NTproBNP','N末端B型钠尿肽前体','N末端脑钠肽前体'],
    TNT:['肌钙蛋白T','高敏肌钙蛋白T','cTnT','hs-cTnT'],MYO:['肌红蛋白','Myo'],
    DD:['D-二聚体','D二聚体'],PT:['凝血酶原时间'],PTR:['凝血酶原比值'],PTA:['凝血酶原活动度'],
    INR:['国际标准化比值'],APTT:['活化部分凝血活酶时间'],TT:['凝血酶时间'],FIB:['纤维蛋白原'],
    IL6:['白介素-6','IL-6'],HGB:['血红蛋白','HGB'],THB:['总血红蛋白','tHb'],HCT:['红细胞压积','HCT'],
    PH:['pH'],PCO2:['PCO2','二氧化碳分压'],PO2:['PO2','氧分压'],HCO3:['实际碳酸氢根','HCO3'],
    HCO3STD:['标准碳酸氢根'],BEE:['BE-ecf','细胞外液碱剩余'],BEB:['BE-B','血碱剩余'],
    NA:['Na+','钠'],K:['K+','钾'],CL:['Cl-','氯'],ICA:['iCa','离子钙'],CA:['总钙'],MG:['镁'],
    AG:['阴离子间隙','AG'],GLU:['葡萄糖','Glu'],SO2:['血氧饱和度','SO2'],PF:['PF氧合指数','氧合指数','P/F']
  };

  function cleanOcrLineV3(s){
    return String(s||'').replace(/[，,]/g,'.').replace(/[：:]/g,' ').replace(/[（(]/g,' ').replace(/[）)]/g,' ').replace(/\s+/g,' ').trim();
  }

  function parseNumberNearAliasV3(line,alias){
    const low=line.toLowerCase(),a=alias.toLowerCase(),i=low.indexOf(a);
    if(i<0)return null;
    const before=line.slice(0,i),after=line.slice(i+alias.length);
    const numsAfter=(after.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
    if(numsAfter.length)return numsAfter[0];
    const numsBefore=(before.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
    return numsBefore.length?numsBefore[numsBefore.length-1]:null;
  }

  function parseOcrTextV3(text,reportId,fileName){
    const lines=String(text||'').split(/\r?\n/).map(cleanOcrLineV3).filter(Boolean);
    const found=[];
    defs.forEach(m=>{
      const aliases=[m.name,...(OCR_ALIASES_V3[m.code]||[])];
      if(String(m.code).length>=3)aliases.push(m.code);
      let hit=null;
      for(const alias of [...new Set(aliases)].sort((a,b)=>b.length-a.length)){
        for(const line of lines){
          if(!line.toLowerCase().includes(String(alias).toLowerCase()))continue;
          const value=parseNumberNearAliasV3(line,String(alias));
          if(value!=null&&Number.isFinite(value)){hit=value;break}
        }
        if(hit!=null)break;
      }
      if(hit!=null)found.push({m,value:hit,reportId,fileName,ref_low:m.ref_low,ref_high:m.ref_high,unit:m.unit||''});
    });
    return found;
  }

  function mergeRecognizedV3(items){
    const map=new Map();
    items.forEach(x=>{if(!map.has(x.m.code))map.set(x.m.code,x)});
    return [...map.values()];
  }

  async function ocrOneFileV3(file,index,total){
    e('autoRecognizeMsg').textContent='正在识别 '+(index+1)+' / '+total+'：'+file.name;
    const r=await Tesseract.recognize(file,'chi_sim+eng',{logger:m=>{
      if(m.progress!=null)e('autoRecognizeMsg').textContent='正在识别 '+(index+1)+' / '+total+'：'+file.name+' · '+Math.round(m.progress*100)+'%';
    }});
    return r.data.text||'';
  }

  async function recognizeAndReviewV3(files,reportRows,time){
    ensureAutoReviewUIV3();
    const panel=e('autoReviewPanel');panel.classList.remove('hidden');
    e('autoReviewRows').innerHTML='';
    const imagePairs=[];
    files.forEach((file,i)=>{
      if(file.type.startsWith('image/')){
        imagePairs.push({file,report:reportRows[i]||null});
      }
    });
    if(!imagePairs.length){
      e('autoRecognizeMsg').textContent='原报告已上传，但当前自动识别仅支持 JPG / PNG / WEBP 图片。PDF 请使用手动录入或 Excel 导入。';
      return;
    }
    let all=[];
    for(let i=0;i<imagePairs.length;i++){
      const pair=imagePairs[i];
      try{
        const txt=await ocrOneFileV3(pair.file,i,imagePairs.length);
        all.push(...parseOcrTextV3(txt,pair.report&&pair.report.id,pair.file.name));
      }catch(err){
        console.error(err);
      }
    }
    const merged=mergeRecognizedV3(all);
    if(!merged.length){
      e('autoRecognizeMsg').textContent='报告原图已保存，但没有可靠提取到已知指标。可以使用下面的本地OCR或手动录入。';
      return;
    }
    autoReviewStateV3={items:merged,time};
    e('autoRecognizeMsg').textContent='识别到 '+merged.length+' 个指标。请核对数值和参考范围，确认后再写入趋势数据库。';
    e('autoReviewRows').innerHTML=merged.map((x,i)=>'<tr data-i="'+i+'"><td><input class="auto-use" type="checkbox" checked></td><td><b>'+safe(x.m.name)+'</b><br><span class="muted">'+safe(x.m.code)+'</span></td><td><input class="auto-value" type="number" step="any" value="'+safe(x.value)+'"></td><td><input class="auto-unit" value="'+safe(x.unit)+'"></td><td><input class="auto-low" type="number" step="any" value="'+(x.ref_low==null?'':safe(x.ref_low))+'"></td><td><input class="auto-high" type="number" step="any" value="'+(x.ref_high==null?'':safe(x.ref_high))+'"></td><td>'+safe(x.fileName||'')+'</td></tr>').join('');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function saveAutoReviewV3(){
    if(!sess)return alert('请先管理员登录');
    const time=autoReviewStateV3.time||e('reportTime').value||inputTime();
    const rows=[...e('autoReviewRows').querySelectorAll('tr[data-i]')].filter(tr=>tr.querySelector('.auto-use').checked).map(tr=>{
      const x=autoReviewStateV3.items[Number(tr.dataset.i)],value=Number(tr.querySelector('.auto-value').value);
      if(!Number.isFinite(value))return null;
      const low=tr.querySelector('.auto-low').value,high=tr.querySelector('.auto-high').value;
      return {user_id:sess.user.id,report_id:x.reportId||null,collected_at:chinaIso(time),metric_code:x.m.code,metric_name:x.m.name,system_group:x.m.system_group,value,unit:tr.querySelector('.auto-unit').value||x.m.unit,ref_low:low===''?null:Number(low),ref_high:high===''?null:Number(high),direction:x.m.direction};
    }).filter(Boolean);
    if(!rows.length)return alert('请至少保留一个有效指标');
    e('saveAutoReview').disabled=true;e('autoRecognizeMsg').textContent='正在保存并刷新趋势…';
    try{
      const r=await writeResultsV3(rows,'报告指标');
      if(!r.ok)throw r.error;
      e('autoRecognizeMsg').textContent=r.message+'，总览和趋势已更新。';
      await load();
      document.querySelector('[data-tab="home"]').click();
    }catch(err){
      e('autoRecognizeMsg').textContent='保存失败：'+(err.message||err);
    }finally{e('saveAutoReview').disabled=false}
  }

  async function recognizeStoredBatchV3(group){
    ensureAutoReviewUIV3();
    document.querySelector('[data-tab="upload"]').click();
    const t=group[0].collected_at||group[0].created_at;
    e('reportTime').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t)).replace(' ','T');
    e('autoReviewPanel').classList.remove('hidden');
    e('autoRecognizeMsg').textContent='正在读取历史原图…';
    const files=[],rows=[];
    for(const r of group){
      if(!r.file_path||!(/\.(png|jpe?g|webp)$/i.test(r.file_name||r.file_path)))continue;
      const s=await db.storage.from('medical-reports').createSignedUrl(r.file_path,300);
      if(s.error)continue;
      const resp=await fetch(s.data.signedUrl);if(!resp.ok)continue;
      const blob=await resp.blob();
      files.push(new File([blob],r.file_name||'report.png',{type:blob.type||'image/png'}));rows.push(r);
    }
    if(!files.length){e('autoRecognizeMsg').textContent='这批报告没有可识别的图片原图。';return}
    await recognizeAndReviewV3(files,rows,e('reportTime').value);
  }

  function reportListV3(){
    if(!reps.length){e('reportList').innerHTML='<div class="panel">暂无报告</div>';return}
    const groups=new Map();
    reps.forEach(r=>{
      const key=r.collected_at||r.report_date||r.created_at||r.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(r);
    });
    const entries=[...groups.entries()].sort((a,b)=>new Date(b[0])-new Date(a[0]));
    e('reportList').innerHTML=entries.map(([key,group],gi)=>{
      const t=group[0].collected_at||group[0].created_at;
      const hasData=vals.some(v=>Math.abs(new Date(v.collected_at)-new Date(t))<60000);
      const canRecognize=group.some(r=>r.file_path&&/\.(png|jpe?g|webp)$/i.test(r.file_name||r.file_path));
      const files=group.map(r=>{
        const action=r.file_path?'<button class="alt" data-view-path="'+safe(r.file_path)+'">查看原图</button>':'<span class="missing-file">无原图</span>';
        return '<div class="batch-report-file"><span>'+safe(r.file_name||r.report_type||'历史报告')+'</span><span>'+action+'</span></div>';
      }).join('');
      return '<div class="batch-report" data-group="'+gi+'"><div class="batch-report-head"><div><b>'+safe(fmtChina(t))+' 报告</b><div class="muted">'+group.length+' 张原报告</div></div><div class="row"><span class="batch-state '+(hasData?'ready':'missing')+'">'+(hasData?'已有指标数据':'尚未识别指标')+'</span>'+(canRecognize?'<button class="alt recognize-batch" data-group="'+gi+'">批量识别数据</button>':'')+'</div></div><div class="batch-report-files">'+files+'</div></div>';
    }).join('');
    e('reportList').querySelectorAll('[data-view-path]').forEach(b=>b.onclick=async()=>{let x=await db.storage.from('medical-reports').createSignedUrl(b.dataset.viewPath,300);if(x.error)return alert(x.error.message);window.open(x.data.signedUrl,'_blank')});
    e('reportList').querySelectorAll('.recognize-batch').forEach(b=>b.onclick=()=>recognizeStoredBatchV3(entries[Number(b.dataset.group)][1]));
  }

  function patchWriteHandlers(){
    ensureAutoReviewUIV3();

    e('uploadBtn').onclick=async function(){
      if(!sess){alert('家属只读模式不能上传报告，请管理员登录');return}
      const files=[...e('reportFiles').files],time=e('reportTime').value;
      if(!files.length){e('uploadMsg').textContent='请选择文件';return}
      if(!time){e('uploadMsg').textContent='请选择采样时间';return}
      e('uploadBtn').disabled=true;e('uploadMsg').textContent='正在上传原报告…';
      const reportRows=[];
      try{
        for(let i=0;i<files.length;i++){
          const file=files[i],name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=sess.user.id+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+name;
          e('uploadMsg').textContent='正在上传 '+(i+1)+' / '+files.length+'：'+file.name;
          let u=await db.storage.from('medical-reports').upload(path,file);if(u.error)throw u.error;
          let r=await db.from('reports').insert({user_id:sess.user.id,collected_at:chinaIso(time),report_date:time.slice(0,10),file_name:file.name,file_path:path,notes:e('reportNotes').value}).select().single();
          if(r.error)throw r.error;
          reportRows.push(r.data);
        }
        e('uploadMsg').textContent='原报告上传完成，正在自动识别检验数据…';
        await recognizeAndReviewV3(files,reportRows,time);
        e('reportFiles').value='';
        await loadAdminV3();
      }catch(err){
        e('uploadMsg').textContent='处理失败：'+(err.message||err);
      }finally{e('uploadBtn').disabled=false}
    };

    e('save').onclick=async function(){
      if(!sess){alert('家属只读模式不能修改数据，请管理员登录');return}
      let m=defs.find(x=>x.code===e('metric').value),v=Number(e('value').value),t=e('entryTime').value;
      if(!m||!t||!Number.isFinite(v)){e('entryMsg').textContent='请填写有效时间和数值';return}
      let row={user_id:sess.user.id,collected_at:chinaIso(t),metric_code:m.code,metric_name:m.name,system_group:m.system_group,value:v,unit:e('unit').value||m.unit,ref_low:e('low').value===''?m.ref_low:Number(e('low').value),ref_high:e('high').value===''?m.ref_high:Number(e('high').value),direction:m.direction};
      let r=await writeResultsV3(row,'结果');e('entryMsg').textContent=r.ok?r.message:(r.error?.message||'保存失败');if(r.ok){e('value').value='';await load()}
    };

    e('importBtn').onclick=async function(){
      if(!sess){alert('家属只读模式不能导入数据，请管理员登录');return}
      let f=e('sheet').files[0];if(!f){e('importMsg').textContent='请选择文件';return}
      e('importMsg').textContent='读取中…';
      try{
        let wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}),sn=wb.SheetNames.includes('全部指标')?'全部指标':wb.SheetNames[0],arr=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:''}),out=[];
        for(let row of arr){
          let tm=row['采样时间']||row['时间']||row['日期时间']||row['date'],mt=String(row['指标']||row['项目']||row['metric']||'').trim(),v=Number(row['结果']||row['数值']||row['value']);
          if(!tm||!mt||!Number.isFinite(v))continue;
          let m=defs.find(x=>x.code.toLowerCase()===mt.toLowerCase()||x.name===mt||mt.includes(x.code)||mt.includes(x.name));if(!m)continue;
          let iso=tm instanceof Date?tm.toISOString():chinaIso(String(tm).replace(' ','T').slice(0,16));if(!iso)continue;
          out.push({user_id:sess.user.id,collected_at:iso,metric_code:m.code,metric_name:m.name,system_group:m.system_group,value:v,unit:row['单位']||m.unit,ref_low:m.ref_low,ref_high:m.ref_high,direction:m.direction});
        }
        if(!out.length)throw new Error('没有识别到可导入的指标');
        let r=await writeResultsV3(out,'指标');if(!r.ok)throw r.error;
        e('importMsg').textContent=r.message+'（共识别 '+dedupeRowsV3(out).length+' 条）';await load();
      }catch(err){e('importMsg').textContent='导入失败：'+(err.message||err)}
    };

    renderOcr=function(){
      if(!ocr.length){e('ocrRows').innerHTML='<p class="muted">没有自动提取到已知指标，请手动录入。</p>';return}
      e('ocrRows').innerHTML='<div class="scroll"><table><tr><th>指标</th><th>识别值</th><th>单位</th></tr>'+ocr.map((x,i)=>'<tr><td>'+safe(x.m.name)+'</td><td><input data-i="'+i+'" type="number" step="any" value="'+x.value+'"></td><td>'+safe(x.m.unit||'')+'</td></tr>').join('')+'</table></div><button id="saveOcr">确认无误并保存</button>';
      e('ocrRows').querySelectorAll('input[data-i]').forEach(x=>x.oninput=()=>ocr[Number(x.dataset.i)].value=Number(x.value));
      e('saveOcr').onclick=async function(){
        let t=e('reportTime').value||inputTime(),p=ocr.filter(x=>Number.isFinite(x.value)).map(x=>({user_id:sess.user.id,collected_at:chinaIso(t),metric_code:x.m.code,metric_name:x.m.name,system_group:x.m.system_group,value:x.value,unit:x.m.unit,ref_low:x.m.ref_low,ref_high:x.m.ref_high,direction:x.m.direction}));
        let r=await writeResultsV3(p,'OCR指标');if(!r.ok)return alert(r.error?.message||'保存失败');alert(r.message);ocr=[];renderOcr();await load();
      };
    };
  }


  // V4: report-type-aware OCR. Prefer Latin item codes at the start of each report row,
  // split two-column reports before OCR, distinguish PCT (procalcitonin) from plateletcrit,
  // and use the specimen collection time printed on each report.
  function detectReportKindV4(text){
    const t=String(text||'').toUpperCase();
    if(t.indexOf('NT-PROBNP')>=0 || String(text||'').indexOf('N末端B型')>=0)return 'ntprobnp';
    if(t.indexOf('APTT')>=0 && (t.indexOf('PTA')>=0 || t.indexOf('FBG')>=0 || t.indexOf('FIB')>=0))return 'coag';
    if(t.indexOf('PCO2')>=0 && t.indexOf('HCO3')>=0 && (t.indexOf('ANGAP')>=0 || t.indexOf('PF INDEX')>=0 || String(text||'').indexOf('血气')>=0))return 'bloodgas';
    if(t.indexOf('WBC')>=0 && t.indexOf('PLT')>=0 && (t.indexOf('RDW-CV')>=0 || t.indexOf('PDW')>=0))return 'cbc';
    if(String(text||'').indexOf('降钙素原测定')>=0 || (t.indexOf('PCT')>=0 && t.indexOf('PDW')<0 && t.indexOf('MPV')<0))return 'pct';
    return 'generic';
  }

  function extractSampleTimeV4(text,fallback){
    const tx=String(text||'').replace(/[年月]/g,'-').replace(/日/g,' ');
    const m=tx.match(/采样时间\s*[:：]?\s*(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m)return fallback||'';
    const pad=x=>String(x).padStart(2,'0');
    return m[1]+'-'+pad(m[2])+'-'+pad(m[3])+'T'+pad(m[4])+':'+pad(m[5])+':'+pad(m[6]||'00');
  }

  const ROW_CODE_MAP_V4={
    cbc:{
      'WBC':'WBC','NE%':'NEP','LY%':'LYP','MONO%':'MONOP','EOS%':'EOSP','BASO%':'BASOP',
      'NE#':'NEABS','LY#':'LYABS','MONO#':'MONOABS','EOS#':'EOSABS','BASO#':'BASOABS',
      'RBC':'RBC','HGB':'HGB','HCT':'HCT','MCV':'MCV','MCH':'MCH','MCHC':'MCHC',
      'PDW':'PDW','PLT':'PLT','MPV':'MPV','PCT':'PCTPLT','RDW-CV':'RDWCV','RDWCV':'RDWCV','CRP':'CRP'
    },
    coag:{'PT':'PT','PTR':'PTR','INR':'INR','APTT':'APTT','FBG':'FIB','FIB':'FIB','PTA':'PTA'},
    pct:{'PCT':'PCT'},
    ntprobnp:{'NT-PROBNP':'NTPROBNP','NTPROBNP':'NTPROBNP'},
    bloodgas:{
      'PH':'PH','PCO2':'PCO2','PO2':'PO2','HCO3':'HCO3','BE':'BEE','HCT':'HCTPCT','THB':'THB',
      'SO2':'SO2','FO2HB':'FO2HB','FCOHB':'FCOHB','FMETHB':'FMETHB','FHHB':'FHHB','P50':'P50',
      'CTO2(A)':'CTO2','CTO2A':'CTO2','NA':'NA','K':'K','CA':'ICA','CL':'CL','ANGAP':'AG',
      'GLU':'GLU','LAC':'LAC','PF':'PF'
    }
  };

  function normalizeRowV4(line){
    return String(line||'').replace(/[★☆↑↓]/g,' ').replace(/[，,]/g,'.').replace(/\s+/g,' ').trim().replace(/^\d+\s+/,'');
  }

  function mapRowCodeV4(kind,first,line){
    let token=String(first||'').toUpperCase().replace(/[.:：;；]+$/,'');
    if(kind==='bloodgas' && token==='HCO3' && (/-\s*S\b/i.test(line) || /标准碳酸氢根/.test(line)))return 'HCO3STD';
    if(kind==='bloodgas' && token==='BE' && /ECF/i.test(line))return 'BEE';
    if(kind==='bloodgas' && token==='CTO2' && /\(A\)/i.test(line))return 'CTO2';
    const map=ROW_CODE_MAP_V4[kind]||{};
    return map[token]||null;
  }

  function parseRowsV4(text,kind,reportId,fileName,fallbackTime){
    const sampleTime=extractSampleTimeV4(text,fallbackTime);
    const out=[],seen=new Set();
    const lines=String(text||'').split(/\r?\n/).map(normalizeRowV4).filter(Boolean);
    for(const line of lines){
      const parts=line.split(/\s+/);
      if(!parts.length)continue;
      const code=mapRowCodeV4(kind,parts[0],line);
      if(!code || seen.has(code))continue;
      const m=defs.find(x=>x.code===code);
      if(!m)continue;
      const rest=line.slice(parts[0].length);
      const nums=(rest.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
      if(!nums.length)continue;
      let value=nums[0],low=m.ref_low,high=m.ref_high;
      if(nums.length>=3){low=nums[1];high=nums[2]}
      out.push({m,value,reportId,fileName,ref_low:low,ref_high:high,unit:m.unit||'',sampleTime,kind});
      seen.add(code);
    }

    if(kind==='pct' && !seen.has('PCT')){
      const z=String(text||'').match(/(?:降钙素原测定|PCT)[^\d-]{0,45}(-?\d+(?:\.\d+)?)/i);
      const m=defs.find(x=>x.code==='PCT');
      if(z&&m)out.push({m,value:Number(z[1]),reportId,fileName,ref_low:0,ref_high:.5,unit:'ng/mL',sampleTime,kind});
    }
    if(kind==='ntprobnp' && !seen.has('NTPROBNP')){
      const z=String(text||'').match(/(?:NT[- ]?proBNP|N末端B型)[^\d-]{0,50}(-?\d+(?:\.\d+)?)/i);
      const m=defs.find(x=>x.code==='NTPROBNP');
      if(z&&m)out.push({m,value:Number(z[1]),reportId,fileName,ref_low:0,ref_high:125,unit:'pg/mL',sampleTime,kind});
    }
    return out;
  }

  async function cropForOcrV4(file,startFrac,widthFrac,suffix){
    const bmp=await createImageBitmap(file);
    const sx=Math.floor(bmp.width*startFrac),sw=Math.floor(bmp.width*widthFrac);
    const canvas=document.createElement('canvas');canvas.width=sw;canvas.height=bmp.height;
    canvas.getContext('2d').drawImage(bmp,sx,0,sw,bmp.height,0,0,sw,bmp.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(bmp.close)bmp.close();
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'-'+suffix+'.png',{type:'image/png'});
  }

  async function ocrPlainV4(file,label){
    const r=await Tesseract.recognize(file,'chi_sim+eng',{logger:m=>{
      if(m.progress!=null)e('autoRecognizeMsg').textContent=label+' · '+Math.round(m.progress*100)+'%';
    }});
    return r.data.text||'';
  }

  async function ocrOneFileV4(file,index,total){
    const base='正在识别 '+(index+1)+' / '+total+'：'+file.name;
    const full=await ocrPlainV4(file,base);
    const kind=detectReportKindV4(full);
    if(kind!=='cbc' && kind!=='bloodgas')return {text:full,kind};
    try{
      const left=await cropForOcrV4(file,0,.56,'left');
      const right=await cropForOcrV4(file,.44,.56,'right');
      const leftText=await ocrPlainV4(left,base+' · 左栏');
      const rightText=await ocrPlainV4(right,base+' · 右栏');
      return {text:leftText+'\n'+rightText+'\n'+full,kind};
    }catch(err){
      console.warn('column crop OCR failed',err);
      return {text:full,kind};
    }
  }

  ensureAutoReviewUIV3=function(){
    if(e('autoReviewPanel'))return;
    const panel=document.createElement('div');
    panel.id='autoReviewPanel';panel.className='panel auto-review-panel hidden';
    panel.innerHTML='<div class="auto-review-head"><div><h3>自动识别结果</h3><p>按报告项目代码识别，并区分“降钙素原PCT”和“血小板压积PCT”。请核对后再保存。</p></div><span class="pill">保存后自动刷新总览与趋势</span></div><div id="autoRecognizeMsg" class="auto-progress">等待识别</div><div class="scroll"><table class="auto-review-table"><thead><tr><th>保存</th><th>指标</th><th>识别结果</th><th>单位</th><th>参考下限</th><th>参考上限</th><th>采样时间</th><th>来源</th></tr></thead><tbody id="autoReviewRows"></tbody></table></div><div class="row" style="margin-top:14px"><button id="saveAutoReview">确认并更新趋势</button><button id="cancelAutoReview" class="alt">暂不保存</button></div>';
    e('upload').querySelector('.panel').insertAdjacentElement('afterend',panel);
    e('saveAutoReview').onclick=saveAutoReviewV3;
    e('cancelAutoReview').onclick=()=>{panel.classList.add('hidden');autoReviewStateV3={items:[],time:''}};
  };

  recognizeAndReviewV3=async function(files,reportRows,time){
    ensureAutoReviewUIV3();
    const panel=e('autoReviewPanel');panel.classList.remove('hidden');e('autoReviewRows').innerHTML='';
    const pairs=[];files.forEach((file,i)=>{if(file.type.startsWith('image/'))pairs.push({file,report:reportRows[i]||null})});
    if(!pairs.length){e('autoRecognizeMsg').textContent='原报告已上传，但当前自动识别仅支持 JPG / PNG / WEBP 图片。';return}
    let all=[];
    for(let i=0;i<pairs.length;i++){
      const pair=pairs[i];
      try{
        const o=await ocrOneFileV4(pair.file,i,pairs.length);
        all.push(...parseRowsV4(o.text,o.kind,pair.report&&pair.report.id,pair.file.name,time));
      }catch(err){console.error(err)}
    }
    const merged=mergeRecognizedV3(all);
    if(!merged.length){e('autoRecognizeMsg').textContent='原图已保存，但没有可靠识别到指标。请使用手动录入。';return}
    autoReviewStateV3={items:merged,time};
    e('autoRecognizeMsg').textContent='识别到 '+merged.length+' 个指标。请重点核对数值、参考范围和采样时间。';
    e('autoReviewRows').innerHTML=merged.map((x,i)=>'<tr data-i="'+i+'"><td><input class="auto-use" type="checkbox" checked></td><td><b>'+safe(x.m.name)+'</b><br><span class="muted">'+safe(x.m.code)+'</span></td><td><input class="auto-value" type="number" step="any" value="'+safe(x.value)+'"></td><td><input class="auto-unit" value="'+safe(x.unit)+'"></td><td><input class="auto-low" type="number" step="any" value="'+(x.ref_low==null?'':safe(x.ref_low))+'"></td><td><input class="auto-high" type="number" step="any" value="'+(x.ref_high==null?'':safe(x.ref_high))+'"></td><td><input class="auto-time" type="datetime-local" step="1" value="'+safe((x.sampleTime||time||'').slice(0,19))+'"></td><td>'+safe(x.fileName||'')+'</td></tr>').join('');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  };

  saveAutoReviewV3=async function(){
    if(!sess)return alert('请先管理员登录');
    const fallback=autoReviewStateV3.time||e('reportTime').value||inputTime();
    const rows=[...e('autoReviewRows').querySelectorAll('tr[data-i]')].filter(tr=>tr.querySelector('.auto-use').checked).map(tr=>{
      const x=autoReviewStateV3.items[Number(tr.dataset.i)],value=Number(tr.querySelector('.auto-value').value);
      if(!Number.isFinite(value))return null;
      const low=tr.querySelector('.auto-low').value,high=tr.querySelector('.auto-high').value,sample=tr.querySelector('.auto-time').value||fallback;
      return {user_id:sess.user.id,report_id:x.reportId||null,collected_at:chinaIso(sample),metric_code:x.m.code,metric_name:x.m.name,system_group:x.m.system_group,value,unit:tr.querySelector('.auto-unit').value||x.m.unit,ref_low:low===''?null:Number(low),ref_high:high===''?null:Number(high),direction:x.m.direction};
    }).filter(Boolean);
    if(!rows.length)return alert('请至少保留一个有效指标');
    e('saveAutoReview').disabled=true;e('autoRecognizeMsg').textContent='正在保存并刷新趋势…';
    try{
      const byReport=new Map();rows.forEach(row=>{if(row.report_id&&!byReport.has(row.report_id))byReport.set(row.report_id,row.collected_at)});
      for(const item of byReport){await db.from('reports').update({collected_at:item[1],report_date:item[1].slice(0,10)}).eq('id',item[0])}
      const r=await writeResultsV3(rows,'报告指标');if(!r.ok)throw r.error;
      e('autoRecognizeMsg').textContent=r.message+'，总览和趋势已更新。';await load();document.querySelector('[data-tab="home"]').click();
    }catch(err){e('autoRecognizeMsg').textContent='保存失败：'+(err.message||err)}
    finally{e('saveAutoReview').disabled=false}
  };


  // V5：增强恩施州中心医院生化报告识别，修复异常箭头被粘成数字的问题。
  const detectReportKindBaseV5=detectReportKindV4;
  detectReportKindV4=function(text){
    const t=String(text||'').toUpperCase();
    if(t.indexOf('ALT')>=0 && t.indexOf('AST')>=0 && t.indexOf('TBIL')>=0 && t.indexOf('CREA')>=0)return 'chem';
    return detectReportKindBaseV5(text);
  };

  ROW_CODE_MAP_V4.chem={
    'ALT':'ALT','AST':'AST','AS/AL':'ASAL','ASAL':'ASAL',
    'TBIL':'TBIL','DBIL':'DBIL','IBIL':'IBIL',
    'TP':'TP','ALB':'ALB','GLO':'GLO','A/G':'AGRATIO','AGR':'AGRATIO',
    'UREA':'UREA','CREA':'CREA','UN/CR':'UNCR','UNCR':'UNCR','CK':'CK'
  };

  const CHEM_DECIMALS_V5={ALT:0,AST:0,ASAL:2,TBIL:1,DBIL:1,IBIL:1,TP:2,ALB:2,GLO:2,AGRATIO:2,UREA:2,CREA:1,UNCR:2,CK:0};

  function previousMetricValueV5(code){
    const s=series(code);
    return s.length?Number(s[s.length-1].value):null;
  }

  function normalizeChemValueV5(code,raw,low,high){
    let s=String(raw||'').replace(/[^\d.-]/g,'');
    if(!s)return null;
    const decimals=CHEM_DECIMALS_V5[code];
    if(decimals!=null){
      const p=s.indexOf('.');
      if(p>=0){
        const frac=s.slice(p+1);
        if(frac.length>decimals){
          s=decimals===0?s.slice(0,p):s.slice(0,p+1+decimals);
        }
      }
    }
    let n=Number(s);
    if(!Number.isFinite(n))return null;
    if(decimals===0 && !s.includes('.') && s.length>=3){
      const cut=Number(s.slice(0,-1));
      const prev=previousMetricValueV5(code);
      if(Number.isFinite(cut)){
        if(Number.isFinite(prev)){
          const dRaw=Math.abs(n-prev),dCut=Math.abs(cut-prev);
          if(dCut<dRaw*.35)n=cut;
        }else if(Number.isFinite(high) && n>high*3 && cut<high*6){
          n=cut;
        }else if(code==='CK' && n>=100 && n<=999 && cut<100){
          n=cut;
        }
      }
    }
    return n;
  }

  function escapeRxV5(s){return String(s).replace(/[.*+?^$()|[\]\\{}]/g,'\\  ensureFamilyGate();ensureHeader();ensureAccessSettings();patchWriteHandlers();')}

  function parseRowsV5(text,kind,reportId,fileName,fallbackTime){
    const sampleTime=extractSampleTimeV4(text,fallbackTime);
    const out=[],seen=new Set();
    const lines=String(text||'').split(/\r?\n/).map(line=>String(line||'').replace(/[★☆]/g,' ').replace(/[，,]/g,'.').replace(/\s+/g,' ').trim()).filter(Boolean);
    const map=ROW_CODE_MAP_V4[kind]||{};

    for(const original of lines){
      let line=original.replace(/^\s*\d+\s+/,'').trim();
      const keys=Object.keys(map).sort((a,b)=>b.length-a.length);
      let matched=null,code=null;
      for(const k of keys){
        const re=new RegExp('^'+escapeRxV5(k)+'(?:\\s|$)','i');
        if(re.test(line)){matched=k;code=map[k];break}
      }
      if(!matched||!code||seen.has(code))continue;
      const m=defs.find(x=>x.code===code);
      if(!m)continue;

      let rest=line.replace(new RegExp('^'+escapeRxV5(matched),'i'),'').trim();
      const rawNums=rest.match(/-?\d+(?:\.\d+)?/g)||[];
      if(!rawNums.length)continue;

      let low=m.ref_low,high=m.ref_high;
      if(rawNums.length>=3){
        const l=Number(rawNums[1]),h=Number(rawNums[2]);
        if(Number.isFinite(l))low=l;
        if(Number.isFinite(h))high=h;
      }

      let value=kind==='chem'?normalizeChemValueV5(code,rawNums[0],Number(low),Number(high)):Number(rawNums[0]);
      if(!Number.isFinite(value))continue;

      out.push({m,value,reportId,fileName,ref_low:low,ref_high:high,unit:m.unit||'',sampleTime,kind});
      seen.add(code);
    }
    return out;
  }

  const parseRowsBaseV5=parseRowsV4;
  parseRowsV4=function(text,kind,reportId,fileName,fallbackTime){
    if(kind==='chem'){
      const z=parseRowsV5(text,kind,reportId,fileName,fallbackTime);
      if(z.length)return z;
    }
    const base=parseRowsBaseV5(text,kind,reportId,fileName,fallbackTime);
    if(base&&base.length)return base;
    return parseRowsV5(text,'chem',reportId,fileName,fallbackTime);
  };

  const ocrOneFileBaseV5=ocrOneFileV4;
  ocrOneFileV4=async function(file,index,total){
    const first=await ocrOneFileBaseV5(file,index,total);
    const kind=detectReportKindV4(first.text);
    if(kind!=='chem')return {text:first.text,kind};
    try{
      const eng=await Tesseract.recognize(file,'eng',{logger:m=>{
        if(m.progress!=null)e('autoRecognizeMsg').textContent='正在增强识别 '+(index+1)+' / '+total+'：'+file.name+' · '+Math.round(m.progress*100)+'%';
      }});
      return {text:(eng.data.text||'')+'\n'+first.text,kind:'chem'};
    }catch(err){
      console.warn('eng OCR fallback failed',err);
      return {text:first.text,kind:'chem'};
    }
  };

  e('parseOcr').onclick=function(){
    const tx=e('ocrText').value||'';
    const kind=detectReportKindV4(tx);
    const parsed=parseRowsV4(tx,kind,null,e('ocrFile').files[0]?.name||'OCR图片',e('reportTime').value||inputTime());
    ocr=(parsed||[]).map(x=>({m:x.m,value:x.value,ref_low:x.ref_low,ref_high:x.ref_high}));
    e('ocrMsg').textContent=ocr.length?'已提取 '+ocr.length+' 个指标，请人工核对后保存。':'没有可靠识别到已知指标，请使用上方“上传报告”重新识别或手动录入。';
    renderOcr();
  };

  ensureFamilyGate();ensureHeader();ensureAccessSettings();patchWriteHandlers();
  reportList=reportListV3;

  show=routeAccessV3;
  load=async()=>sess?loadAdminV3():loadGuestV3(guestCodeV3);

  e('adminLoginBtn').onclick=showAdminLoginV3;
  e('cancelLogin').onclick=routeAccessV3;
  e('login').onclick=async()=>{e('authmsg').textContent='登录中…';let r=await db.auth.signInWithPassword({email:e('email').value.trim(),password:e('password').value});e('authmsg').textContent=r.error?(r.error.message==='Invalid login credentials'?'邮箱或密码不正确':r.error.message):''};
  e('logout').onclick=async()=>{await db.auth.signOut()};

  async function bootSecureV3(){
    const current=await db.auth.getSession();
    sess=current.data.session;
    await routeAccessV3();
    db.auth.onAuthStateChange(async function(_event,s){
      sess=s;
      await routeAccessV3();
    });
  }
  bootSecureV3();
  window.addEventListener('pageshow',()=>{if(!sess && localStorage.getItem('familyAccessCode'))routeAccessV3()});
})();