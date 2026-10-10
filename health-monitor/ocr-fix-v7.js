(() => {
  const CHEM_MAP = {
    'ALT':'ALT','AST':'AST','AS/AL':'ASAL','ASAL':'ASAL',
    'TBIL':'TBIL','DBIL':'DBIL','IBIL':'IBIL','TP':'TP','ALB':'ALB',
    'GLO':'GLO','A/G':'AGRATIO','AGR':'AGRATIO',
    'UREA':'UREA','CREA':'CREA','UN/CR':'UNCR','UNCR':'UNCR','CK':'CK'
  };
  const REF = {
    ALT:[7,40],AST:[13,35],ASAL:[0.8,1.5],TBIL:[0,21],DBIL:[0,8],IBIL:[0,18],
    TP:[65,85],ALB:[40,55],GLO:[20,40],AGRATIO:[1.2,2.4],UREA:[3.1,8.8],
    CREA:[41,81],UNCR:[null,null],CK:[24,195]
  };
  const DEC = {ALT:0,AST:0,ASAL:2,TBIL:1,DBIL:1,IBIL:1,TP:2,ALB:2,GLO:2,AGRATIO:2,UREA:2,CREA:1,UNCR:2,CK:0};
  let capturedFile=null, capturedFallback='', repairing=false, repairedKey='', currentItems=[];

  function rx(s){return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}
  function isChemText(t){
    t=String(t||'').toUpperCase();
    return t.includes('ALT')&&t.includes('AST')&&t.includes('TBIL')&&t.includes('CREA');
  }
  function sampleTime(text,fallback){
    const tx=String(text||'').replace(/[年月]/g,'-').replace(/日/g,' ');
    let m=tx.match(/采\s*样\s*时\s*间[\s:：]*(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const pad=x=>String(x).padStart(2,'0');
    if(m)return m[1]+'-'+pad(m[2])+'-'+pad(m[3])+'T'+pad(m[4])+':'+pad(m[5])+':'+pad(m[6]||'00');
    const all=[...tx.matchAll(/(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/g)].map(z=>({
      raw:z[0], key:+(z[1]+pad(z[2])+pad(z[3])+pad(z[4])+pad(z[5])+pad(z[6]||'00')),
      val:z[1]+'-'+pad(z[2])+'-'+pad(z[3])+'T'+pad(z[4])+':'+pad(z[5])+':'+pad(z[6]||'00')
    }));
    if(all.length)return all.sort((a,b)=>a.key-b.key)[0].val;
    return fallback||'';
  }
  function prevVal(code){
    const s=(typeof series==='function'?series(code):[]);return s&&s.length?Number(s[s.length-1].value):null;
  }
  function normalize(code,raw){
    let s=String(raw||'').replace(/[^\d.-]/g,''); if(!s)return null;
    const d=DEC[code], p=s.indexOf('.');
    if(p>=0 && d!=null && s.length-p-1>d)s=d===0?s.slice(0,p):s.slice(0,p+1+d);
    let n=Number(s); if(!Number.isFinite(n))return null;
    if(d===0 && !s.includes('.') && s.length>=3){
      const cut=Number(s.slice(0,-1)), hi=(REF[code]||[])[1], prev=prevVal(code);
      if(Number.isFinite(cut)){
        if(Number.isFinite(hi)&&n>hi*3&&cut<hi*6)n=cut;
        else if(Number.isFinite(prev)&&Math.abs(cut-prev)<Math.abs(n-prev)*0.5)n=cut;
        else if(code==='CK'&&n>=100&&cut<100)n=cut;
      }
    }
    return n;
  }
  function parseChem(text,reportId,fileName,fallback){
    const st=sampleTime(text,fallback), out=[], seen=new Set();
    const lines=String(text||'').split(/\r?\n/).map(x=>String(x).replace(/[★☆*]/g,' ').replace(/[，,]/g,'.').replace(/\s+/g,' ').trim()).filter(Boolean);
    for(const original of lines){
      let line=original.trim(), matched=null, code=null;
      for(const k of Object.keys(CHEM_MAP).sort((a,b)=>b.length-a.length)){
        const re=new RegExp('^\\s*\\d*\\s*'+rx(k)+'(?=\\s|[^A-Za-z0-9]|$)','i');
        if(re.test(line)){matched=k;code=CHEM_MAP[k];line=line.replace(re,'').trim();break}
      }
      if(!code||seen.has(code))continue;
      const m=defs.find(x=>x.code===code); if(!m)continue;
      const nums=line.match(/-?\d+(?:\.\d+)?/g)||[]; if(!nums.length)continue;
      let raw=nums[0];
      if(nums.length>=3)raw=nums[nums.length-3];
      const value=normalize(code,raw); if(!Number.isFinite(value))continue;
      const ref=REF[code]||[m.ref_low,m.ref_high];
      out.push({m,value,reportId,fileName,ref_low:ref[0],ref_high:ref[1],unit:m.unit||'',sampleTime:st});
      seen.add(code);
    }
    return out;
  }
  async function ocr(file){
    const r=await Tesseract.recognize(file,'chi_sim+eng',{logger:m=>{
      const el=document.getElementById('autoRecognizeMsg');
      if(el&&m.progress!=null)el.textContent='正在校正生化报告识别 · '+Math.round(m.progress*100)+'%';
    }});
    return r.data.text||'';
  }
  async function latestReport(fileName){
    if(!sess)return null;
    const q=await db.from('reports').select('*').eq('user_id',sess.user.id).eq('file_name',fileName).order('created_at',{ascending:false}).limit(1);
    return q.error||!q.data?.length?null:q.data[0];
  }
  function ensureReview(){
    return document.getElementById('autoReviewRows')&&document.getElementById('saveAutoReview');
  }
  function render(items){
    currentItems=items;
    const body=document.getElementById('autoReviewRows'), msg=document.getElementById('autoRecognizeMsg');
    if(!body||!msg)return;
    msg.textContent='已校正识别 '+items.length+' 个指标。生化结果按“项目代码 + 固定参考范围 + 箭头误码修正”解析，请保存前再快速核对。';
    body.innerHTML=items.map((x,i)=>'<tr data-v7="'+i+'"><td><input class="v7-use" type="checkbox" checked></td><td><b>'+safe(x.m.name)+'</b><br><span class="muted">'+safe(x.m.code)+'</span></td><td><input class="v7-value" type="number" step="any" value="'+safe(x.value)+'"></td><td><input class="v7-unit" value="'+safe(x.unit)+'"></td><td><input class="v7-low" type="number" step="any" value="'+(x.ref_low==null?'':safe(x.ref_low))+'"></td><td><input class="v7-high" type="number" step="any" value="'+(x.ref_high==null?'':safe(x.ref_high))+'"></td><td><input class="v7-time" type="datetime-local" step="1" value="'+safe((x.sampleTime||capturedFallback||'').slice(0,19))+'"></td><td>'+safe(x.fileName||'')+'</td></tr>').join('');
    const save=document.getElementById('saveAutoReview');
    save.onclick=saveCorrected;
  }
  async function saveCorrected(){
    if(!sess||!currentItems.length)return;
    const trs=[...document.querySelectorAll('#autoReviewRows tr[data-v7]')].filter(tr=>tr.querySelector('.v7-use').checked);
    const rows=trs.map(tr=>{
      const x=currentItems[Number(tr.dataset.v7)], v=Number(tr.querySelector('.v7-value').value), t=tr.querySelector('.v7-time').value;
      if(!Number.isFinite(v)||!t)return null;
      const lo=tr.querySelector('.v7-low').value, hi=tr.querySelector('.v7-high').value;
      return {user_id:sess.user.id,report_id:x.reportId||null,collected_at:chinaIso(t),metric_code:x.m.code,metric_name:x.m.name,system_group:x.m.system_group,value:v,unit:tr.querySelector('.v7-unit').value||x.m.unit,ref_low:lo===''?null:Number(lo),ref_high:hi===''?null:Number(hi),direction:x.m.direction};
    }).filter(Boolean);
    if(!rows.length)return alert('没有可保存的指标');
    const btn=document.getElementById('saveAutoReview'),msg=document.getElementById('autoRecognizeMsg');
    btn.disabled=true;msg.textContent='正在保存校正后的数据…';
    try{
      const byReport=new Map();rows.forEach(x=>{if(x.report_id&&!byReport.has(x.report_id))byReport.set(x.report_id,x.collected_at)});
      for(const [id,iso] of byReport)await db.from('reports').update({collected_at:iso,report_date:iso.slice(0,10)}).eq('id',id);
      const r=await db.from('results').upsert(rows,{onConflict:'user_id,collected_at,metric_code'});
      if(r.error)throw r.error;
      msg.textContent='已保存 '+rows.length+' 个校正指标，总览和趋势已更新。';
      await load();
      document.querySelector('[data-tab="home"]')?.click();
    }catch(err){msg.textContent='保存失败：'+(err.message||err)}
    finally{btn.disabled=false}
  }
  async function repair(){
    if(repairing||!capturedFile||!ensureReview())return;
    const key=capturedFile.name+'|'+capturedFile.size+'|'+capturedFile.lastModified;
    if(key===repairedKey)return;
    const msg=document.getElementById('autoRecognizeMsg')?.textContent||'';
    if(!/识别到|没有可靠识别|原图已保存/.test(msg))return;
    repairing=true;
    try{
      const text=await ocr(capturedFile);
      if(!isChemText(text))return;
      const report=await latestReport(capturedFile.name);
      const items=parseChem(text,report?.id||null,capturedFile.name,capturedFallback);
      if(items.length>=8){render(items);repairedKey=key}
    }catch(err){console.error('chem OCR repair failed',err)}
    finally{repairing=false}
  }
  function install(){
    const up=document.getElementById('uploadBtn');
    if(!up)return setTimeout(install,300);
    up.addEventListener('click',()=>{
      const f=document.getElementById('reportFiles')?.files?.[0];
      if(f){capturedFile=f;capturedFallback=document.getElementById('reportTime')?.value||'';repairedKey=''}
    },true);
    const target=document.getElementById('autoReviewPanel')||document.getElementById('upload');
    new MutationObserver(()=>repair()).observe(target,{subtree:true,childList:true,characterData:true});

    const parseBtn=document.getElementById('parseOcr');
    if(parseBtn)parseBtn.onclick=()=>{
      const tx=document.getElementById('ocrText')?.value||'';
      if(!isChemText(tx)){document.getElementById('ocrMsg').textContent='当前增强提取主要用于生化报告；其它报告请使用上方自动识别。';return}
      const items=parseChem(tx,null,document.getElementById('ocrFile')?.files?.[0]?.name||'OCR图片',document.getElementById('reportTime')?.value||'');
      ocr=items.map(x=>({m:x.m,value:x.value}));
      document.getElementById('ocrMsg').textContent='已校正提取 '+ocr.length+' 个指标，请人工核对。';
      renderOcr();
    };
  }
  install();
})();