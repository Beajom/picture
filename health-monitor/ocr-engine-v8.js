(() => {
  'use strict';

  const VERSION='8.0';
  const HARD={
    WBC:[0.1,300],PLT:[1,2000],HGB:[20,250],HCT:[0.05,0.75],RBC:[0.5,10],
    CRP:[0,1000],PCT:[0,200],CREA:[5,5000],UREA:[0.2,150],
    ALT:[0,10000],AST:[0,10000],TBIL:[0,1500],DBIL:[0,1200],IBIL:[0,800],
    ALB:[5,80],TP:[10,120],GLO:[5,80],NTPROBNP:[0,100000],
    PT:[5,100],PTR:[0.3,10],INR:[0.3,15],APTT:[5,200],FIB:[0.1,15],PTA:[5,250],
    PH:[6.7,7.8],PCO2:[5,180],PO2:[10,800],HCO3:[3,60],HCO3STD:[3,60],BEE:[-40,40],
    NA:[90,200],K:[1,10],ICA:[0.3,2.5],CL:[60,160],AG:[0,50],GLU:[0.5,50],LAC:[0,30],
    SO2:[20,100],FO2HB:[20,100],FCOHB:[0,40],FMETHB:[0,30],FHHB:[0,100],PF:[20,800],
    CK:[0,20000],MYO:[0,10000],TNT:[0,50]
  };
  const EXPECTED_UNIT={
    WBC:'×10^9/L',PLT:'×10^9/L',RBC:'×10^12/L',HGB:'g/L',CRP:'mg/L',PCT:'ng/mL',
    CREA:'µmol/L',UREA:'mmol/L',ALT:'U/L',AST:'U/L',TBIL:'µmol/L',DBIL:'µmol/L',IBIL:'µmol/L',
    ALB:'g/L',TP:'g/L',GLO:'g/L',NTPROBNP:'pg/mL',PT:'s',APTT:'s',FIB:'g/L',
    PCO2:'mmHg',PO2:'mmHg',HCO3:'mmol/L',HCO3STD:'mmol/L',NA:'mmol/L',K:'mmol/L',
    ICA:'mmol/L',CL:'mmol/L',AG:'mmol/L',GLU:'mmol/L',LAC:'mmol/L',SO2:'%',PF:''
  };
  const TEMPLATE_REFS={
    chem:{
      ALT:[7,40],AST:[13,35],ASAL:[0.8,1.5],TBIL:[0,21],DBIL:[0,8],IBIL:[0,18],
      TP:[65,85],ALB:[40,55],GLO:[20,40],AGRATIO:[1.2,2.4],UREA:[3.1,8.8],
      CREA:[41,81],UNCR:[null,null],CK:[24,195]
    },
    coag:{PT:[9,15],PTR:[0.82,1.15],INR:[0.76,1.15],APTT:[24,36],FIB:[2,4],PTA:[80,150]},
    pct:{PCT:[0,0.5]},
    ntprobnp:{NTPROBNP:[0,125]},
    cbc:{
      WBC:[3.5,9.5],NEP:[40,75],LYP:[20,50],MONOP:[3,10],EOSP:[0.4,8],BASOP:[0,1],
      NEABS:[1.8,6.3],LYABS:[1.1,3.2],MONOABS:[0.1,0.6],EOSABS:[0.02,0.52],BASOABS:[0,0.06],
      RBC:[3.8,5.1],HGB:[115,150],HCT:[0.35,0.45],MCV:[82,100],MCH:[27,34],MCHC:[316,354],
      PDW:[12.4,18.6],PLT:[125,350],MPV:[8.6,13.6],PCTPLT:[0.108,0.282],RDWCV:[11.8,14.8],CRP:[0,6]
    },
    bloodgas:{
      PH:[7.35,7.45],PCO2:[35,45],PO2:[83,108],HCO3:[22,26],HCO3STD:[22,26],BEE:[-3,3],
      HCTPCT:[37,49],THB:[120,175],SO2:[93,98],FO2HB:[93,98],FCOHB:[0,2],FMETHB:[0,1.5],
      FHHB:[2,7],P50:[null,null],CTO2:[16,22],NA:[136,146],K:[3.4,4.5],ICA:[1.15,1.29],
      CL:[98,106],AG:[8,12],GLU:[3.89,5.83],LAC:[0.5,1.6],PF:[400,500]
    }
  };
  const MAP={
    chem:{
      'ALT':'ALT','AST':'AST','AS/AL':'ASAL','ASAL':'ASAL','TBIL':'TBIL','DBIL':'DBIL','IBIL':'IBIL',
      'TP':'TP','ALB':'ALB','GLO':'GLO','A/G':'AGRATIO','AGR':'AGRATIO','UREA':'UREA','CREA':'CREA',
      'UN/CR':'UNCR','UNCR':'UNCR','CK':'CK'
    },
    coag:{'PT':'PT','PTR':'PTR','INR':'INR','APTT':'APTT','FBG':'FIB','FIB':'FIB','PTA':'PTA'},
    pct:{'PCT':'PCT'},
    ntprobnp:{'NT-PROBNP':'NTPROBNP','NTPROBNP':'NTPROBNP'},
    cbc:{
      'WBC':'WBC','NE%':'NEP','LY%':'LYP','MONO%':'MONOP','EOS%':'EOSP','BASO%':'BASOP',
      'NE#':'NEABS','LY#':'LYABS','MONO#':'MONOABS','EOS#':'EOSABS','BASO#':'BASOABS',
      'RBC':'RBC','HGB':'HGB','HCT':'HCT','MCV':'MCV','MCH':'MCH','MCHC':'MCHC',
      'PDW':'PDW','PLT':'PLT','MPV':'MPV','PCT':'PCTPLT','RDW-CV':'RDWCV','RDWCV':'RDWCV','CRP':'CRP'
    },
    bloodgas:{
      'PH':'PH','PCO2':'PCO2','PO2':'PO2','HCO3-S':'HCO3STD','HCO3S':'HCO3STD','HCO3':'HCO3',
      'BE(ECF)':'BEE','BEECF':'BEE','HCT':'HCTPCT','THB':'THB','SO2':'SO2','FO2HB':'FO2HB',
      'FCOHB':'FCOHB','FMETHB':'FMETHB','FHHB':'FHHB','P50':'P50','CTO2(A)':'CTO2','CTO2A':'CTO2',
      'NA':'NA','K':'K','CA':'ICA','CL':'CL','ANGAP':'AG','AN GAP':'AG','GLU':'GLU','LAC':'LAC',
      'PF INDEX':'PF','PFINDEX':'PF','PF':'PF'
    }
  };
  const DEC={
    ALT:0,AST:0,ASAL:2,TBIL:1,DBIL:1,IBIL:1,TP:2,ALB:2,GLO:2,AGRATIO:2,UREA:2,CREA:1,UNCR:2,CK:0,
    PT:1,PTR:2,INR:2,APTT:1,FIB:2,PTA:2,PCT:2,NTPROBNP:3,
    WBC:2,NEP:2,LYP:2,MONOP:2,EOSP:2,BASOP:2,NEABS:2,LYABS:2,MONOABS:2,EOSABS:2,BASOABS:2,
    RBC:2,HGB:0,HCT:3,MCV:1,MCH:1,MCHC:0,PDW:1,PLT:0,MPV:1,PCTPLT:3,RDWCV:1,CRP:2,
    PH:2,PCO2:1,PO2:1,HCO3:1,HCO3STD:1,BEE:1,HCTPCT:1,THB:1,SO2:1,FO2HB:1,FCOHB:1,FMETHB:1,FHHB:1,
    P50:1,CTO2:1,NA:1,K:2,ICA:2,CL:1,AG:1,GLU:2,LAC:2,PF:0
  };
  const EXPECTED={
    chem:['ALT','AST','ASAL','TBIL','DBIL','IBIL','TP','ALB','GLO','AGRATIO','UREA','CREA','UNCR','CK'],
    coag:['PT','PTR','INR','APTT','FIB','PTA'],
    pct:['PCT'],
    ntprobnp:['NTPROBNP'],
    cbc:['WBC','NEP','LYP','MONOP','EOSP','BASOP','NEABS','LYABS','MONOABS','EOSABS','BASOABS','RBC','HGB','HCT','MCV','MCH','MCHC','PDW','PLT','MPV','PCTPLT','RDWCV','CRP'],
    bloodgas:['PH','PCO2','PO2','HCO3','HCO3STD','BEE','HCTPCT','THB','SO2','FO2HB','FCOHB','FMETHB','FHHB','P50','CTO2','NA','K','ICA','CL','AG','GLU','LAC','PF']
  };

  let current={items:[],reports:[],fallback:'',mode:'upload'};
  let rawLocalText='';

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function rx(s){return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}
  function safeNum(v){const n=Number(v);return Number.isFinite(n)?n:null}
  function def(code){return (window.defs||defs||[]).find(x=>x.code===code)}
  function allSeries(code){try{return typeof series==='function'?series(code):[]}catch(_e){return []}}
  function prevValue(code){const s=allSeries(code);return s.length?safeNum(s[s.length-1].value):null}
  function templateRef(kind,code,m){
    const r=(TEMPLATE_REFS[kind]||{})[code];
    if(r)return r;
    return [m&&m.ref_low!=null?Number(m.ref_low):null,m&&m.ref_high!=null?Number(m.ref_high):null]
  }
  function detect(text){
    const t=String(text||'').toUpperCase();
    if(t.includes('NT-PROBNP')||String(text||'').includes('N末端B型'))return 'ntprobnp';
    if(t.includes('APTT')&&(t.includes('PTA')||t.includes('FBG')||t.includes('FIB')))return 'coag';
    if(t.includes('PCO2')&&t.includes('HCO3')&&(t.includes('ANGAP')||t.includes('PF INDEX')||String(text||'').includes('血气')))return 'bloodgas';
    if(t.includes('WBC')&&t.includes('PLT')&&(t.includes('RDW-CV')||t.includes('PDW')))return 'cbc';
    if(t.includes('ALT')&&t.includes('AST')&&t.includes('TBIL')&&(t.includes('CREA')||t.includes('UREA')))return 'chem';
    if(String(text||'').includes('降钙素原测定')||(t.includes('PCT')&&!t.includes('PDW')&&!t.includes('MPV')))return 'pct';
    return 'generic';
  }
  function sampleTime(text,fallback){
    const tx=String(text||'').replace(/[年月]/g,'-').replace(/日/g,' ');
    const p=x=>String(x).padStart(2,'0');
    let m=tx.match(/采\s*样\s*时\s*间[\s:：]*(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(m)return m[1]+'-'+p(m[2])+'-'+p(m[3])+'T'+p(m[4])+':'+p(m[5])+':'+p(m[6]||'00');
    const found=[...tx.matchAll(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/g)];
    if(found.length){
      const vals=found.map(z=>({key:+(z[1]+p(z[2])+p(z[3])+p(z[4])+p(z[5])+p(z[6]||'00')),v:z[1]+'-'+p(z[2])+'-'+p(z[3])+'T'+p(z[4])+':'+p(z[5])+':'+p(z[6]||'00')}));
      vals.sort((a,b)=>a.key-b.key);return vals[0].v
    }
    return fallback||''
  }
  function normalize(code,raw,kind){
    let s=String(raw||'').replace(/[^\d.-]/g,'');
    if(!s)return null;
    const d=DEC[code];
    const p=s.indexOf('.');
    if(p>=0&&d!=null&&s.length-p-1>d)s=d===0?s.slice(0,p):s.slice(0,p+1+d);
    let n=Number(s);
    if(!Number.isFinite(n))return null;

    if(d===0&&!s.includes('.')&&s.length>=3){
      const cut=Number(s.slice(0,-1)),ref=templateRef(kind,code,def(code)),hi=ref[1],prev=prevValue(code);
      if(Number.isFinite(cut)){
        if(Number.isFinite(hi)&&n>hi*3&&cut<Math.max(hi*8,100))n=cut;
        else if(Number.isFinite(prev)&&Math.abs(cut-prev)<Math.abs(n-prev)*0.45)n=cut;
        else if(code==='CK'&&n>=100&&cut<100)n=cut
      }
    }
    return n
  }
  function parseRows(text,kind,report,fallback){
    if(kind==='pct'||kind==='ntprobnp')return parseSingle(text,kind,report,fallback);
    const map=MAP[kind]||{};
    const st=sampleTime(text,fallback),out=[],seen=new Set();
    const lines=String(text||'').split(/\r?\n/).map(x=>String(x).replace(/[★☆*↑↓]/g,' ').replace(/[，,]/g,'.').replace(/\s+/g,' ').trim()).filter(Boolean);
    for(const src of lines){
      let line=src.replace(/^\s*\d+\s+/,'').trim(),matched=null,code=null;
      for(const k of Object.keys(map).sort((a,b)=>b.length-a.length)){
        const re=new RegExp('^'+rx(k)+'(?=\\s|[^A-Za-z0-9]|$)','i');
        if(re.test(line)){matched=k;code=map[k];line=line.replace(re,'').trim();break}
      }
      if(!code||seen.has(code))continue;
      const m=def(code);if(!m)continue;
      const nums=line.match(/-?\d+(?:\.\d+)?/g)||[];
      if(!nums.length)continue;
      const ref=templateRef(kind,code,m);
      let raw=nums[0];
      if(nums.length>=3)raw=nums[nums.length-3];
      const value=normalize(code,raw,kind);
      if(!Number.isFinite(value))continue;
      out.push({m,code,value,unit:m.unit||EXPECTED_UNIT[code]||'',ref_low:ref[0],ref_high:ref[1],sampleTime:st,reportId:report&&report.id||null,fileName:report&&report.file_name||'',kind});
      seen.add(code)
    }
    return out
  }
  function parseSingle(text,kind,report,fallback){
    const code=kind==='pct'?'PCT':'NTPROBNP',m=def(code);
    if(!m)return [];
    const st=sampleTime(text,fallback),t=String(text||'');
    let z;
    if(kind==='pct')z=t.match(/(?:降钙素原测定|\bPCT\b)[^\d-]{0,50}(-?\d+(?:\.\d+)?)/i);
    else z=t.match(/(?:NT[- ]?proBNP|N末端B型)[^\d-]{0,60}(-?\d+(?:\.\d+)?)/i);
    if(!z){
      const lines=t.split(/\r?\n/).filter(x=>x.toUpperCase().includes(kind==='pct'?'PCT':'NT'));
      for(const line of lines){const n=line.match(/-?\d+(?:\.\d+)?/g)||[];if(n.length){z=[null,n[0]];break}}
    }
    if(!z)return [];
    const value=normalize(code,z[1],kind);if(!Number.isFinite(value))return [];
    const ref=templateRef(kind,code,m);
    return [{m,code,value,unit:m.unit||EXPECTED_UNIT[code]||'',ref_low:ref[0],ref_high:ref[1],sampleTime:st,reportId:report&&report.id||null,fileName:report&&report.file_name||'',kind}]
  }
  function genericParse(text,report,fallback){
    const st=sampleTime(text,fallback),out=[],seen=new Set(),lines=String(text||'').split(/\r?\n/).map(x=>String(x).replace(/[★☆*↑↓]/g,' ').replace(/[，,]/g,'.').replace(/\s+/g,' ').trim()).filter(Boolean);
    const defsNow=window.defs||defs||[];
    for(const line0 of lines){
      const line=line0.replace(/^\s*\d+\s+/,'');
      for(const m of defsNow){
        if(!m.code||m.code.length<2||seen.has(m.code))continue;
        const re=new RegExp('^'+rx(m.code)+'(?=\\s|[^A-Za-z0-9]|$)','i');
        if(!re.test(line))continue;
        const nums=line.replace(re,'').match(/-?\d+(?:\.\d+)?/g)||[];
        if(!nums.length)break;
        const value=Number(nums[0]);if(!Number.isFinite(value))break;
        out.push({m,code:m.code,value,unit:m.unit||'',ref_low:m.ref_low,ref_high:m.ref_high,sampleTime:st,reportId:report&&report.id||null,fileName:report&&report.file_name||'',kind:'generic'});
        seen.add(m.code);break
      }
    }
    return out
  }
  function merge(items){
    const map=new Map();
    items.forEach(x=>{
      const k=(x.reportId||x.fileName||'')+'|'+x.code;
      if(!map.has(k))map.set(k,x)
    });
    return [...map.values()]
  }
  async function crop(file,start,width,suffix){
    const bmp=await createImageBitmap(file),sx=Math.floor(bmp.width*start),sw=Math.floor(bmp.width*width);
    const cv=document.createElement('canvas');cv.width=sw;cv.height=bmp.height;
    cv.getContext('2d').drawImage(bmp,sx,0,sw,bmp.height,0,0,sw,bmp.height);
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(bmp.close)bmp.close();
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'-'+suffix+'.png',{type:'image/png'})
  }
  async function recognizeRaw(file,label){
    const r=await Tesseract.recognize(file,'chi_sim+eng',{logger:m=>{
      const msg=$('ocrV8Msg');if(msg&&m.progress!=null)msg.textContent=label+' · '+Math.round(m.progress*100)+'%'
    }});
    return r.data.text||''
  }
  async function recognize(file,report,fallback,index,total){
    const label='正在识别 '+(index+1)+' / '+total+'：'+file.name;
    let full=await recognizeRaw(file,label),kind=detect(full),combined=full;
    if(kind==='cbc'||kind==='bloodgas'){
      try{
        const left=await crop(file,0,.56,'left'),right=await crop(file,.44,.56,'right');
        const a=await recognizeRaw(left,label+' · 左栏'),b=await recognizeRaw(right,label+' · 右栏');
        combined=a+'\n'+b+'\n'+full
      }catch(err){console.warn('column OCR fallback',err)}
    }
    let items=kind==='generic'?genericParse(combined,report,fallback):parseRows(combined,kind,report,fallback);
    if(!items.length)items=genericParse(combined,report,fallback);
    return {kind,text:combined,items}
  }

  function checkItem(item){
    const errors=[],warnings=[],code=item.code,v=safeNum(item.value),lo=safeNum(item.ref_low),hi=safeNum(item.ref_high);
    if(v==null)errors.push('结果不是有效数字');
    const h=HARD[code];
    if(v!=null&&h&&(v<h[0]||v>h[1]))errors.push('数值超出合理生理范围，疑似OCR错误');
    if(lo!=null&&hi!=null&&lo>=hi)errors.push('参考范围上下限异常');
    if(v!=null&&lo!=null&&hi!=null&&(Math.abs(v-lo)<1e-12||Math.abs(v-hi)<1e-12)){
      warnings.push('结果恰好等于参考边界，请核对是否把参考值当成结果')
    }
    const expect=EXPECTED_UNIT[code];
    if(expect&&item.unit&&String(item.unit).replace('μ','µ')!==String(expect).replace('μ','µ'))warnings.push('单位与系统定义不一致');
    const prev=prevValue(code);
    if(v!=null&&prev!=null&&Math.abs(prev)>0){
      const ratio=Math.max(Math.abs(v/prev),Math.abs(prev/v||0));
      if(ratio>8)warnings.push('与上一次变化超过8倍，请核对')
    }
    if(!item.sampleTime)errors.push('未识别到采样时间');
    return {errors,warnings}
  }
  function crossChecks(items){
    const by={};items.forEach(x=>by[x.code]=x);
    function warn(codes,msg){
      codes.forEach(code=>{const x=by[code];if(x){x._cross=x._cross||[];x._cross.push(msg)}})
    }
    if(by.TBIL&&by.DBIL&&by.IBIL){
      const d=Math.abs(Number(by.TBIL.value)-Number(by.DBIL.value)-Number(by.IBIL.value));
      if(d>3)warn(['TBIL','DBIL','IBIL'],'总胆红素 ≠ 直接胆红素 + 间接胆红素，请核对')
    }
    if(by.TP&&by.ALB&&by.GLO){
      const d=Math.abs(Number(by.TP.value)-Number(by.ALB.value)-Number(by.GLO.value));
      if(d>3)warn(['TP','ALB','GLO'],'总蛋白 ≠ 白蛋白 + 球蛋白，请核对')
    }
    const diff=['NEP','LYP','MONOP','EOSP','BASOP'];
    if(diff.every(c=>by[c])){
      const sum=diff.reduce((s,c)=>s+Number(by[c].value),0);
      if(Math.abs(sum-100)>5)warn(diff,'白细胞分类百分比合计不是约100%，请核对')
    }
  }
  function validate(items){
    items.forEach(x=>{x._cross=[]});
    crossChecks(items);
    items.forEach(x=>{
      const r=checkItem(x);
      x.validation={errors:r.errors,warnings:[...r.warnings,...(x._cross||[])]}
    });
    return items
  }
  function completeness(items){
    const groups=new Map();
    items.forEach(x=>{
      const key=(x.fileName||'未命名')+'|'+x.kind;
      if(!groups.has(key))groups.set(key,{file:x.fileName||'未命名',kind:x.kind,codes:new Set()});
      groups.get(key).codes.add(x.code)
    });
    const issues=[];
    for(const g of groups.values()){
      const exp=EXPECTED[g.kind];
      if(!exp||!exp.length)continue;
      const missing=exp.filter(code=>!g.codes.has(code));
      const coverage=(exp.length-missing.length)/exp.length;
      if(missing.length){
        issues.push({file:g.file,kind:g.kind,missing,coverage,severe:coverage<0.6})
      }
    }
    return issues
  }
  function statusHtml(x){
    const v=x.validation||{errors:[],warnings:[]};
    if(v.errors.length)return '<span class="ocrv8-badge err">禁止保存</span><div class="ocrv8-hint">'+esc(v.errors.join('；'))+'</div>';
    if(v.warnings.length)return '<span class="ocrv8-badge warn">需核对</span><div class="ocrv8-hint">'+esc(v.warnings.join('；'))+'</div>';
    return '<span class="ocrv8-badge ok">通过</span>'
  }
  function ensureUI(){
    const old=$('autoReviewPanel');
    if(old)old.classList.add('hidden');
    let panel=$('ocrV8Panel');
    if(panel)return panel;
    panel=document.createElement('div');panel.id='ocrV8Panel';panel.className='panel ocrv8-panel hidden';
    panel.innerHTML=
      '<div class="ocrv8-head"><div><h3>自动识别 + 数据可靠性检查</h3><p>先按报告模板识别，再检查数值范围、单位、参考范围、跨指标关系和采样时间。红色错误必须修正后才能保存。</p></div><span class="pill">OCR Engine '+VERSION+'</span></div>'+
      '<div id="ocrV8Msg" class="ocrv8-msg">等待识别</div>'+
      '<div id="ocrV8Stats" class="ocrv8-stats"></div>'+
      '<div class="scroll"><table class="ocrv8-table"><thead><tr><th>保存</th><th>指标</th><th>结果</th><th>单位</th><th>参考下限</th><th>参考上限</th><th>采样时间</th><th>可靠性</th><th>来源</th></tr></thead><tbody id="ocrV8Rows"></tbody></table></div>'+
      '<div class="row" style="margin-top:14px"><button id="ocrV8Save">确认并更新趋势</button><button id="ocrV8Cancel" class="alt">暂不保存</button></div>';
    const up=$('upload');up.querySelector('.panel').insertAdjacentElement('afterend',panel);
    $('ocrV8Save').onclick=saveReview;
    $('ocrV8Cancel').onclick=()=>{panel.classList.add('hidden');current={items:[],reports:[],fallback:'',mode:'upload'}};
    return panel
  }
  function renderReview(items,reports,fallback,mode){
    const panel=ensureUI();current={items:validate(merge(items)),reports:reports||[],fallback:fallback||'',mode:mode||'upload',completeness:completeness(merge(items))};
    panel.classList.remove('hidden');
    const body=$('ocrV8Rows');
    body.innerHTML=current.items.map((x,i)=>
      '<tr data-i="'+i+'">'+
      '<td><input class="ocrv8-use" type="checkbox" checked></td>'+
      '<td><b>'+esc(x.m.name)+'</b><br><span class="muted">'+esc(x.code)+'</span></td>'+
      '<td><input class="ocrv8-value" type="number" step="any" value="'+esc(x.value)+'"></td>'+
      '<td><input class="ocrv8-unit" value="'+esc(x.unit||'')+'"></td>'+
      '<td><input class="ocrv8-low" type="number" step="any" value="'+(x.ref_low==null?'':esc(x.ref_low))+'"></td>'+
      '<td><input class="ocrv8-high" type="number" step="any" value="'+(x.ref_high==null?'':esc(x.ref_high))+'"></td>'+
      '<td><input class="ocrv8-time" type="datetime-local" step="1" value="'+esc((x.sampleTime||fallback||'').slice(0,19))+'"></td>'+
      '<td class="ocrv8-status">'+statusHtml(x)+'</td>'+
      '<td>'+esc(x.fileName||'')+'</td></tr>'
    ).join('');
    body.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',refreshValidation));
    refreshStats();
    const miss=current.completeness||[];
    $('ocrV8Msg').textContent='识别到 '+current.items.length+' 个指标。'+(miss.length?'有 '+miss.length+' 份报告存在漏项，请先核对完整性。':'报告项目完整性检查通过。')+' 请先看“可靠性”一列，再确认保存。';
    panel.scrollIntoView({behavior:'smooth',block:'start'})
  }
  function readRows(){
    const rows=[...$('ocrV8Rows').querySelectorAll('tr[data-i]')];
    rows.forEach(tr=>{
      const x=current.items[Number(tr.dataset.i)];
      x._use=tr.querySelector('.ocrv8-use').checked;
      x.value=Number(tr.querySelector('.ocrv8-value').value);
      x.unit=tr.querySelector('.ocrv8-unit').value.trim();
      const lo=tr.querySelector('.ocrv8-low').value,hi=tr.querySelector('.ocrv8-high').value;
      x.ref_low=lo===''?null:Number(lo);x.ref_high=hi===''?null:Number(hi);
      x.sampleTime=tr.querySelector('.ocrv8-time').value;
    });
    return rows
  }
  function refreshValidation(){
    const rows=readRows();validate(current.items);
    rows.forEach(tr=>{const x=current.items[Number(tr.dataset.i)];tr.querySelector('.ocrv8-status').innerHTML=statusHtml(x)});
    refreshStats()
  }
  function refreshStats(){
    const used=current.items.filter(x=>x._use!==false),err=used.filter(x=>x.validation&&x.validation.errors.length).length,warn=used.filter(x=>x.validation&&!x.validation.errors.length&&x.validation.warnings.length).length,ok=used.length-err-warn;
    const miss=current.completeness||[];
    const severe=miss.filter(x=>x.severe).length;
    const missingCount=miss.reduce((s,x)=>s+x.missing.length,0);
    $('ocrV8Stats').innerHTML='<span class="ocrv8-badge ok">通过 '+ok+'</span><span class="ocrv8-badge warn">需核对 '+warn+'</span><span class="ocrv8-badge err">错误 '+err+'</span>'+(miss.length?'<span class="ocrv8-badge '+(severe?'err':'warn')+'">漏识别 '+missingCount+' 项</span>':'<span class="ocrv8-badge ok">完整性通过</span>')+
      (miss.length?'<div class="ocrv8-completeness">'+miss.map(x=>'<div><b>'+esc(x.file)+'</b>：缺 '+esc(x.missing.join('、'))+'</div>').join('')+'</div>':'')
  }
  async function saveReview(){
    if(!sess)return alert('请先管理员登录');
    refreshValidation();
    const selected=current.items.filter(x=>x._use!==false);
    const bad=selected.filter(x=>x.validation.errors.length);
    if(bad.length){
      $('ocrV8Msg').textContent='还有 '+bad.length+' 个红色错误，必须修正或取消勾选后才能保存。';
      return
    }
    const warns=selected.filter(x=>x.validation.warnings.length);
    const miss=current.completeness||[];
    if(miss.some(x=>x.severe)){
      $('ocrV8Msg').textContent='当前至少一份报告识别完整度低于60%。请先对照原图补录或取消本次保存，避免大量漏项进入趋势。';
      return
    }
    if((warns.length||miss.length)&&!confirm('还有 '+warns.length+' 个“需核对”项目，'+miss.length+' 份报告存在漏项。确认你已经对照原报告检查无误，并继续保存吗？'))return;
    const rows=selected.map(x=>({
      user_id:sess.user.id,report_id:x.reportId||null,collected_at:chinaIso(x.sampleTime),
      metric_code:x.code,metric_name:x.m.name,system_group:x.m.system_group,value:Number(x.value),
      unit:x.unit||x.m.unit||'',ref_low:x.ref_low,ref_high:x.ref_high,direction:x.m.direction
    }));
    const btn=$('ocrV8Save');btn.disabled=true;$('ocrV8Msg').textContent='正在保存已核对的数据…';
    try{
      const byReport=new Map();rows.forEach(r=>{if(r.report_id&&!byReport.has(r.report_id))byReport.set(r.report_id,r.collected_at)});
      for(const [id,iso] of byReport)await db.from('reports').update({collected_at:iso,report_date:iso.slice(0,10),notes:'OCR '+VERSION+' 识别并通过人工核对'}).eq('id',id);
      const q=await db.from('results').upsert(rows,{onConflict:'user_id,collected_at,metric_code'});
      if(q.error)throw q.error;
      $('ocrV8Msg').textContent='已保存 '+rows.length+' 个指标；总览和趋势已刷新。';
      await load();
      document.querySelector('[data-tab="home"]')?.click()
    }catch(err){$('ocrV8Msg').textContent='保存失败：'+(err.message||err)}
    finally{btn.disabled=false}
  }

  async function uploadFlow(){
    if(!sess)return alert('家属只读模式不能上传报告，请管理员登录');
    const files=[...$('reportFiles').files],fallback=$('reportTime').value;
    if(!files.length){$('uploadMsg').textContent='请选择报告图片';return}
    if(!fallback){$('uploadMsg').textContent='请选择采样时间';return}
    const btn=$('uploadBtn');btn.disabled=true;
    const reports=[],pairs=[];
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i],name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=sess.user.id+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+name;
        $('uploadMsg').textContent='正在保存原报告 '+(i+1)+' / '+files.length+'：'+file.name;
        const u=await db.storage.from('medical-reports').upload(path,file);if(u.error)throw u.error;
        const rr=await db.from('reports').insert({user_id:sess.user.id,collected_at:chinaIso(fallback),report_date:fallback.slice(0,10),file_name:file.name,file_path:path,notes:$('reportNotes').value||''}).select().single();
        if(rr.error)throw rr.error;
        reports.push(rr.data);pairs.push({file,report:rr.data})
      }
      const items=[];
      const images=pairs.filter(x=>x.file.type.startsWith('image/'));
      if(!images.length){
        $('uploadMsg').textContent='原报告已保存。PDF目前不做浏览器OCR，请使用图片格式或手动录入。';return
      }
      ensureUI().classList.remove('hidden');
      for(let i=0;i<images.length;i++){
        const r=await recognize(images[i].file,images[i].report,fallback,i,images.length);
        items.push(...r.items)
      }
      $('uploadMsg').textContent='原报告已保存，自动识别完成。';
      if(items.length)renderReview(items,reports,fallback,'upload');
      else {$('ocrV8Msg').textContent='原图已保存，但没有达到可靠识别条件。请使用手动录入，避免错误数据进入趋势。';ensureUI().classList.remove('hidden')}
      $('reportFiles').value='';
      await load()
    }catch(err){$('uploadMsg').textContent='处理失败：'+(err.message||err)}
    finally{btn.disabled=false}
  }

  function historyGroups(){
    const map=new Map();
    (window.reps||reps||[]).forEach(r=>{const k=r.collected_at||r.report_date||r.created_at||r.id;if(!map.has(k))map.set(k,[]);map.get(k).push(r)});
    return [...map.entries()].sort((a,b)=>new Date(b[0])-new Date(a[0]))
  }
  async function historyRecognize(btn){
    if(!sess)return;
    const entries=historyGroups(),group=entries[Number(btn.dataset.group)]&&entries[Number(btn.dataset.group)][1];
    if(!group||!group.length)return;
    document.querySelector('[data-tab="upload"]')?.click();
    ensureUI().classList.remove('hidden');$('ocrV8Msg').textContent='正在读取历史原图…';
    const pairs=[];
    for(const r of group){
      if(!r.file_path||!/\.(png|jpe?g|webp)$/i.test(r.file_name||r.file_path))continue;
      const s=await db.storage.from('medical-reports').createSignedUrl(r.file_path,300);if(s.error)continue;
      const resp=await fetch(s.data.signedUrl);if(!resp.ok)continue;
      const blob=await resp.blob(),file=new File([blob],r.file_name||'report.png',{type:blob.type||'image/png'});
      pairs.push({file,report:r})
    }
    const fallback=group[0].collected_at?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(group[0].collected_at)).replace(' ','T'):'';
    const items=[];
    for(let i=0;i<pairs.length;i++){const rr=await recognize(pairs[i].file,pairs[i].report,fallback,i,pairs.length);items.push(...rr.items)}
    if(items.length)renderReview(items,group,fallback,'history');else $('ocrV8Msg').textContent='没有达到可靠识别条件，请对照原图手动录入。'
  }

  async function localRecognize(){
    const file=$('ocrFile').files[0];if(!file){$('ocrMsg').textContent='请选择图片';return}
    const btn=$('ocrBtn');btn.disabled=true;$('ocrMsg').textContent='正在使用统一OCR引擎识别…';
    try{
      const rr=await recognize(file,null,$('reportTime').value||inputTime(),0,1);
      rawLocalText=rr.text;$('ocrText').value=rr.text;
      $('ocrMsg').textContent='识别完成：'+(rr.items.length?'已提取 '+rr.items.length+' 个候选指标。':'未达到可靠提取条件。');
      if(rr.items.length)renderLocal(rr.items)
    }catch(err){$('ocrMsg').textContent='OCR失败：'+(err.message||err)}
    finally{btn.disabled=false}
  }
  function renderLocal(items){
    items=validate(merge(items));
    window.ocr=items.map(x=>({m:x.m,value:x.value,unit:x.unit,ref_low:x.ref_low,ref_high:x.ref_high,sampleTime:x.sampleTime,validation:x.validation}));
    $('ocrRows').innerHTML='<div class="scroll"><table><thead><tr><th>指标</th><th>结果</th><th>参考范围</th><th>可靠性</th></tr></thead><tbody>'+items.map((x,i)=>'<tr><td>'+esc(x.m.name)+' ('+esc(x.code)+')</td><td><input data-i="'+i+'" type="number" step="any" value="'+esc(x.value)+'"></td><td>'+esc((x.ref_low??'')+' ～ '+(x.ref_high??''))+'</td><td>'+statusHtml(x)+'</td></tr>').join('')+'</tbody></table></div><button id="saveOcr">人工确认后保存</button>';
    $('ocrRows').querySelectorAll('input[data-i]').forEach(inp=>inp.oninput=()=>{const i=Number(inp.dataset.i);items[i].value=Number(inp.value);validate(items);inp.closest('tr').lastElementChild.innerHTML=statusHtml(items[i])});
    $('saveOcr').onclick=async()=>{
      validate(items);const bad=items.filter(x=>x.validation.errors.length);if(bad.length)return alert('仍有明显错误，不能保存。请先修正数值。');
      const warn=items.filter(x=>x.validation.warnings.length);if(warn.length&&!confirm('还有 '+warn.length+' 个需核对项目，确认已对照原图无误吗？'))return;
      const rows=items.map(x=>({user_id:sess.user.id,collected_at:chinaIso(x.sampleTime||$('reportTime').value||inputTime()),metric_code:x.code,metric_name:x.m.name,system_group:x.m.system_group,value:x.value,unit:x.unit||x.m.unit,ref_low:x.ref_low,ref_high:x.ref_high,direction:x.m.direction}));
      const q=await db.from('results').upsert(rows,{onConflict:'user_id,collected_at,metric_code'});if(q.error)return alert(q.error.message);
      alert('已保存 '+rows.length+' 条经可靠性检查的数据');await load()
    }
  }
  function localParse(){
    const text=$('ocrText').value||rawLocalText||'',kind=detect(text);
    let items=kind==='generic'?genericParse(text,null,$('reportTime').value||inputTime()):parseRows(text,kind,null,$('reportTime').value||inputTime());
    if(!items.length)items=genericParse(text,null,$('reportTime').value||inputTime());
    $('ocrMsg').textContent=items.length?'按模板重新提取 '+items.length+' 个指标。':'没有达到可靠提取条件。';
    renderLocal(items)
  }

  function installStyle(){
    if($('ocrV8Style'))return;
    const st=document.createElement('style');st.id='ocrV8Style';st.textContent=
      '.ocrv8-panel{margin-top:18px;border-color:#cfe1f6;background:linear-gradient(180deg,#fff,#f8fbff)}'+
      '.ocrv8-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}.ocrv8-head h3{margin:0 0 5px}.ocrv8-head p{margin:0;color:#667085;font-size:13px;line-height:1.6}'+
      '.ocrv8-msg{padding:12px 14px;border-radius:10px;background:#eef6ff;color:#24527d;margin:12px 0;font-size:13px}.ocrv8-stats{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap}'+
      '.ocrv8-table input{margin:0;padding:7px 8px;min-width:92px}.ocrv8-table input[type=checkbox]{min-width:0;width:auto}.ocrv8-table td{vertical-align:top}'+
      '.ocrv8-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}.ocrv8-badge.ok{background:#ecfdf3;color:#067647}.ocrv8-badge.warn{background:#fff7e6;color:#b54708}.ocrv8-badge.err{background:#fee4e2;color:#b42318}.ocrv8-hint{font-size:11px;color:#667085;line-height:1.45;margin-top:5px;max-width:230px}.ocrv8-completeness{width:100%;margin-top:8px;padding:10px 12px;border:1px solid #f1dfbd;border-radius:10px;background:#fffaf2;color:#7a4d0b;font-size:12px;line-height:1.6}';
    document.head.appendChild(st)
  }
  function install(){
    installStyle();ensureUI();
    const old=$('autoReviewPanel');if(old)old.remove();
    const up=$('uploadBtn');if(up)up.onclick=uploadFlow;
    const ob=$('ocrBtn');if(ob)ob.onclick=localRecognize;
    const pb=$('parseOcr');if(pb)pb.onclick=localParse;
    const h3=[...document.querySelectorAll('#upload h3')].find(x=>x.textContent.includes('OCR'));
    if(h3)h3.textContent='报告OCR校对工具';
    const p=h3&&h3.nextElementSibling;if(p&&p.classList.contains('muted'))p.textContent='与上方上传使用同一套模板识别和可靠性检查；红色错误不会允许保存。';
    document.addEventListener('click',ev=>{
      const b=ev.target.closest('.recognize-batch');
      if(!b)return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();historyRecognize(b)
    },true)
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();