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
    let op=defs.map(m=>'<option value="'+safe(m.code)+'">'+safe(m.name)+' ('+safe(m.code)+')</option>').join('');
    e('metric').innerHTML=op;e('trendMetric').innerHTML=op;e('metric').onchange=sync;e('trendMetric').onchange=drawDetailTrend;
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
    let r=await db.rpc('get_family_dashboard',{p_code:code});
    if(r.error||!r.data)return false;
    defs=r.data.metrics||[];vals=r.data.results||[];reps=[];
    await renderDataV3();return true;
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
    if(!ok){e('familyMsg').textContent='访问码不正确';return}
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
  function overallJudgmentV3(a){
    if(!a)return {title:'本轮总体：暂无足够数据形成趋势判断。',detail:''};
    const risks=currentRiskDomainsV3().slice(0,3),riskText=risks.length?risks.join('、'):'主要指标';
    let title='';
    if(a.improved.length>0&&a.worse.length===0) title='本轮总体：整体呈改善趋势，但'+riskText+'仍需继续关注。';
    else if(a.improved.length>a.worse.length) title='本轮总体：部分指标改善，但'+riskText+'仍有异常。';
    else if(a.worse.length>a.improved.length) title='本轮总体：仍有多项指标走向不利，'+riskText+'需要重点关注。';
    else if(a.improved.length>0) title='本轮总体：有改善也有波动，'+riskText+'仍需持续观察。';
    else title='本轮总体：主要异常仍持续，'+riskText+'仍需关注。';
    const good=a.improved.slice(0,4).map(x=>x.code).join('、');
    const watch=[...a.worse,...a.attention].slice(0,5).map(x=>x.code).join('、');
    let detail=''; if(good)detail+='改善：'+good+'。'; if(watch)detail+=(detail?' ':'')+'重点观察：'+watch+'。';
    return {title,detail};
  }

  batchSummaryHtml=function(a,hero){
    if(!a)return'<div class="panel summary-empty">暂无可用于比较的检验数据。</div>';
    let timeText=fmtChina(a.start.toISOString());if(a.end-a.start>5*60*1000)timeText+=' ～ '+fmtChina(a.end.toISOString());
    let overall=overallJudgmentV3(a);
    return '<div class="'+(hero?'report-summary-hero':'')+'">'+
      (hero?'<div class="overall-judgment"><strong>'+safe(overall.title)+'</strong><div class="detail">'+safe(overall.detail)+'</div></div>':'')+
      (hero?'<div class="report-summary-head"><div><div class="report-summary-title">本轮检验趋势总结</div><div class="report-summary-sub">采样时间：'+safe(timeText)+' · 本轮更新 '+a.count+' 个指标</div></div><div class="report-summary-score"><span class="sum-chip good">改善 '+a.improved.length+'</span><span class="sum-chip bad">不利 '+a.worse.length+'</span><span class="sum-chip warn">仍异常 '+a.attention.length+'</span></div></div>':'')+
      '<div class="report-summary-grid"><div class="report-summary-col"><h4 class="good">✓ 好转/改善</h4>'+summaryList(a.improved,'本轮暂无明确改善趋势')+'</div><div class="report-summary-col"><h4 class="bad">! 需要注意</h4>'+summaryList(a.worse,'本轮暂无明确恶化趋势')+'</div><div class="report-summary-col"><h4 class="warn">○ 仍未恢复正常</h4>'+summaryList(a.attention,'本轮未发现额外持续异常')+'</div></div>'+
      (hero?'<div class="report-summary-note">“本轮总判断”只基于检验结果变化和医院参考范围，用于帮助家属快速看趋势；不等同于临床诊断，也不能替代主管医生结合生命体征、尿量、影像和治疗反应作出的判断。</div>':'')+
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

  function patchWriteHandlers(){
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

  ensureFamilyGate();ensureHeader();ensureAccessSettings();patchWriteHandlers();

  show=routeAccessV3;
  load=async()=>sess?loadAdminV3():loadGuestV3(guestCodeV3);

  e('adminLoginBtn').onclick=showAdminLoginV3;
  e('cancelLogin').onclick=routeAccessV3;
  e('login').onclick=async()=>{e('authmsg').textContent='登录中…';let r=await db.auth.signInWithPassword({email:e('email').value.trim(),password:e('password').value});e('authmsg').textContent=r.error?(r.error.message==='Invalid login credentials'?'邮箱或密码不正确':r.error.message):''};
  e('logout').onclick=async()=>{await db.auth.signOut()};

  routeAccessV3();
})();