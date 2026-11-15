/* Assignment review workflow for Amazon Ads Academy.
   Formula checks are automatic; substantive review requires an actual reviewer.
   File evidence stays in this browser's IndexedDB; never uploaded automatically. */
window.AdsStudyAssessment=(function(){
'use strict';
var DB_NAME='amazon-ads-academy-assignments-v1';
var MAX_FILE=15*1024*1024,MAX_FILES=4;
var pending=null,ctx=null,aiBusy=false;
var FIELDS={
1:[['price','单件售价（USD）'],['procure','采购/包装成本折算（USD）'],['freight','头程成本折算（USD）'],['fees','亚马逊佣金+FBA等单件费用（USD）'],['other','其他单件成本（USD）'],['result','我算的广告前单件贡献利润（USD）']],
2:[['price','单件售价 / 客单价（USD）'],['contribution','广告前每单贡献利润（USD）'],['reserved','每单希望保留的利润（USD）'],['targetCPA','我算的目标 CPA（USD）'],['targetACOS','我算的目标 ACOS（%）']],
3:[['spend','广告花费（USD）'],['adSales','广告归因销售额（USD）'],['totalSales','同期总销售额（USD）'],['acos','我算的 ACOS（%）'],['tacos','我算的 TACOS（%）']]
};
function esc(s){return String(s===undefined||s===null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function history(s,action,summary){if(!Array.isArray(s.history))s.history=[];s.history.push({at:stamp(),action:action,summary:String(summary||'').slice(0,500)});if(s.history.length>35)s.history.splice(0,s.history.length-35)}
function read(p,n){if(!p.submissions||typeof p.submissions!=='object')p.submissions={};if(!p.submissions[n])p.submissions[n]={status:'draft',values:{},criteria:{},history:[],evidence:'',conclusion:'',risks:'',files:[],feedback:''};var v=p.submissions[n];if(!v.criteria)v.criteria={};if(!Array.isArray(v.history))v.history=[];if(!Array.isArray(v.files))v.files=[];if(!v.values)v.values={};return v}
function stamp(){return new Date().toISOString()}
function niceDate(t){return t?String(t).slice(0,16).replace('T',' '):'—'}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;var n=Number(String(v).replace(/[,，$￥¥\s%]/g,''));return Number.isFinite(n)?n:null}
function near(a,b,t){return Math.abs(a-b)<=t}
function format(n){return Number(n).toFixed(2)}
function audit(n,s){
 var messages=[],calc={};
 if(!(s.evidence||'').trim()||s.evidence.trim().length<12)messages.push('请写明具体数据来源、报告期间及证据（至少12个字符），不能只写“看过了”。');
 if(!(s.conclusion||'').trim()||s.conclusion.trim().length<12)messages.push('请写出自己的判断及理由（至少12个字符）。');
 if(!(s.risks||'').trim()||s.risks.trim().length<6)messages.push('请写出可能的风险、限制或下一次复查时间（至少6个字符）。');
 var rubric=window.AdsDayRubrics.validate(n,s);messages.push.apply(messages,rubric.messages);
 if(FIELDS[n]){
  var data={},missing=[];
  FIELDS[n].forEach(function(x){data[x[0]]=num(s.values[x[0]]);if(data[x[0]]===null)missing.push(x[1])});
  if(missing.length)messages.push('计算题缺少数字：'+missing.join('、')+'。');
  else if(n===1){
   if(['price','procure','freight','fees','other'].some(function(k){return data[k]<0})||data.price<=0)messages.push('售价必须大于0，成本不能为负数。');
   else {
    calc.profit=data.price-data.procure-data.freight-data.fees-data.other;
    if(!near(data.result,calc.profit,0.055))messages.push('广告前贡献利润计算有误。正确口径：售价 − 采购/包装 − 头程 − 佣金/FBA − 其他成本；按输入数据应为 $'+format(calc.profit)+'。');
   }
   }else if(n===2){
   if(data.price<=0||data.reserved<0)messages.push('售价必须大于0，每单希望保留的利润不能为负。');
   else{
    calc.cpa=data.contribution-data.reserved;
    calc.acos=calc.cpa/data.price*100;
    if(calc.cpa<0)messages.push('可投入广告费为负数，说明当前定价与利润目标不支持盈利型广告。');
    if(!near(data.targetCPA,calc.cpa,.055))messages.push('目标 CPA = 广告前每单贡献利润 − 每单希望保留的利润，应为 $'+format(calc.cpa)+'。');
    if(!near(data.targetACOS,calc.acos,.3))messages.push('目标 ACOS = 目标 CPA ÷ 单件售价/客单价 ×100，应为 '+format(calc.acos)+'%。');
   }
  }else if(n===3){
   if(data.spend<0||data.adSales<=0||data.totalSales<=0)messages.push('本题要求广告归因销售额和同期总销售额大于0，花费不能为负数。');
   else{
    calc.acos=data.spend/data.adSales*100;calc.tacos=data.spend/data.totalSales*100;
    if(!near(data.acos,calc.acos,.3))messages.push('ACOS 应为 '+format(calc.acos)+'%，公式：花费÷广告归因销售额×100。');
    if(!near(data.tacos,calc.tacos,.3))messages.push('TACOS 应为 '+format(calc.tacos)+'%，公式：同期全部广告花费÷同期总销售额×100。');
   }
  }
 }
 return {passed:messages.length===0,messages:messages,calc:calc};
}
function dayLabel(s){
 if(s.status==='passed')return 'AI审核通过';
 if(s.status==='manual_reviewed')return '人工反馈已登记';
 if(s.status==='submitted')return '规则初审完成 · 待正式复核';
 if(s.status==='revision')return '需修改重交';
 if(s.status==='failed')return '公式或材料待修正';
 return '尚未提交';
}
function badge(s){
 var kind=s.status==='passed'||s.status==='manual_reviewed'?'success':s.status==='submitted'?'wait':s.status==='failed'||s.status==='revision'?'warn':'';
 return '<span class="study-review-badge '+kind+'">'+esc(dayLabel(s))+'</span>';
}
function renderSummary(p){
 var all=Object.values(p.submissions||{}),approved=all.filter(function(x){return x.status==='passed'}).length,manually=all.filter(function(x){return x.status==='manual_reviewed'}).length,waiting=all.filter(function(x){return x.status==='submitted'}).length,changes=all.filter(function(x){return x.status==='revision'||x.status==='failed'}).length;
 return '<div class="study-review-strip"><div><b>'+approved+'</b><small>AI审核通过</small></div><div><b>'+manually+'</b><small>人工审核登记</small></div><div><b>'+waiting+'</b><small>等待正式复核</small></div><div><b>'+changes+'</b><small>待修改</small></div><div class="study-review-strip-text">规则初审只检查算术和材料完整性；AI审核需要登录和服务端密钥，人工审核需登记实际意见。旧版勾选不会自动算作审核通过。</div></div>';
}
function renderPanel(d,p){
 var s=read(p,d.n),values=s.values||{},fs=FIELDS[d.n]||null;
 var show=s.status==='submitted'||s.status==='passed'||s.status==='revision'||s.status==='failed';
 var rubric=window.AdsDayRubrics.forDay(d.n);
 var out='<section class="study-assignment" id="study-assignment-'+d.n+'">'+
 '<div class="study-topline"><div><span class="study-eyebrow">DAY '+d.n+' · SUBMIT FOR REVIEW</span><h4>作业提交与审核</h4></div>'+badge(s)+'</div>'+
 '<p class="study-muted">课程任务：'+esc(d.task)+'。提交后先进行规则初审；涉及运营策略的实质判断需由 ChatGPT 或老师阅读证据后复核。</p>';
 if(fs){
  out+='<div class="study-audit-numbers">'+fs.map(function(x){return '<label><span>'+esc(x[1])+'</span><input type="number" step="any" data-sra-field="'+x[0]+'" data-day="'+d.n+'" value="'+esc(values[x[0]]===undefined?'':values[x[0]])+'" placeholder="填写数字"></label>'}).join('')+'</div>';
  out+='<p class="study-tiny">请统一以美元核算。第2天默认1订单对应1件该SKU；多件订单应使用实际客单价及每单贡献利润。第3天TACOS须使用同期完整广告花费与总销售额。</p>';
 }
 out+='<div class="study-rubric"><div class="study-topline"><h4>本日专属验收清单</h4><span class="study-tiny">每项说明实际证据后才能提交规则初审</span></div>'+
 rubric.map(function(item){
  var c=s.criteria[item.id]||{};
  return '<div class="study-rubric-item"><label class="study-rubric-title"><input type="checkbox" data-sra-criterion-check="'+item.id+'" data-day="'+d.n+'" '+(c.checked?'checked':'')+'>'+
   '<strong>'+esc(item.title)+'</strong></label><p>'+esc(item.hint)+'</p>'+
   '<textarea rows="2" data-sra-criterion-proof="'+item.id+'" data-day="'+d.n+'" placeholder="填写这一项的实际数据、案例或判断依据（至少18字）">'+esc(c.proof||'')+'</textarea></div>';
 }).join('')+'</div>';
 var asin=String(p.asin||'').trim().toUpperCase();
 var profile=(ctx?.user?.adsLab?.products||[]).find(function(x){return x.asin===asin});
 if(profile){
  out+='<div class="study-product-source"><b>已关联商品：'+esc(asin)+'</b> · '+esc(profile.name||profile.internal||'')+
   '<div class="study-muted">商品资料：'+esc(profile.color||'')+' '+esc(profile.size||'')+'，采购RMB '+esc(profile.procure||'待补充')+'，头程RMB '+esc(profile.freight||'待补充')+
   '，其他RMB '+esc(profile.otherRMB||'待补充')+'。仅作为背景，不会自动假定FBA和售价已知。</div></div>';
 }
 out+='<button type="button" class="study-action" data-route="adslab">↗ 打开广告数据工作台，查找本日证据</button>';
 var areas=[['evidence','证据与数据来源','写明报告名称、起止日期、商品/活动范围及观察到的关键数字…'],
 ['conclusion','我的结论与计算/判断过程','请说明为什么这么算、为什么选这个优化动作…'],
 ['risks','风险、限制与复查计划','样本是否足够？归因是否一致？调整后何时复查？']];
 out+='<div class="study-audit-text">'+areas.map(function(x){return '<label><span>'+x[1]+'</span><textarea data-sra-field="'+x[0]+'" data-day="'+d.n+'" rows="3" placeholder="'+esc(x[2])+'">'+esc(s[x[0]]||'')+'</textarea></label>'}).join('')+'</div>'+
 '<div class="study-audit-upload"><div class="study-topline"><div><strong>上传证据文件（可选）</strong><p>支持图片、PDF、Excel、CSV，最多4个文件，每个不超过15MB。当前设备先保留本地副本；登录后可同步至私人云端附件库。</p></div></div>'+
 '<input type="file" data-sra-upload="'+d.n+'" accept=".png,.jpg,.jpeg,.webp,.pdf,.xlsx,.xls,.csv,.txt" multiple>'+
 (s.files&&s.files.length?'<div class="study-audit-filelist">'+s.files.map(function(f){return '<div class="study-audit-file"><span>'+esc(f.name)+' <small>('+Math.round(f.size/1024)+' KB · '+(f.cloudPath?'已存私人云端':'仅本机')+')</small></span><div><button type="button" data-sp="reviewDownload" data-day="'+d.n+'" data-file="'+esc(f.id)+'">查看/下载</button><button type="button" data-sp="reviewRemove" data-day="'+d.n+'" data-file="'+esc(f.id)+'">移除</button></div></div>'}).join('')+'</div>':'<p class="study-tiny">暂无附件。附件必须明确上传或同步；AI文字审核不会自动读取附件内容。</p>')+
 '</div>'+
 '<div class="study-row">'+
 '<button class="study-action primary" type="button" data-sp="reviewSubmit" data-day="'+d.n+'">① 提交规则初审</button>'+
 '<button class="study-action" type="button" data-sp="reviewCopy" data-day="'+d.n+'">复制审核材料</button>'+
 '<button type="button" class="study-action" data-sp="reviewAI" data-day="'+d.n+'">'+(aiBusy?'AI审核中…':'② AI正式审核')+'</button>'+'<a class="study-action study-review-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">或使用 ChatGPT 人工交流审核</a>'+'<button type="button" class="study-action" data-sp="reviewSyncFiles" data-day="'+d.n+'">同步附件到私人云端</button>'+
 '</div>';
 if(show){
  out+='<div class="study-audit-result '+(s.status==='failed'||s.status==='revision'?'warn':'')+'"><b>'+esc(dayLabel(s))+'</b>'+
   (s.autoMessages&&s.autoMessages.length?'<ul>'+s.autoMessages.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'<p>材料基本齐全'+(fs?'，计算结果与输入数据相符':'')+'。这只是规则初审，并不代表广告决策正确。</p>')+
   (s.submittedAt?'<small>提交时间：'+niceDate(s.submittedAt)+'</small>':'')+
   '</div>';
 }
 if(s.ai){
  var a=s.ai,parts=a.dimensions||{};
  out+='<div class="study-ai-score"><div class="study-topline"><h4>AI复核结果</h4><strong>'+esc(a.verdict==='pass'?'合格':'需修改')+' · '+esc(a.score)+'/100</strong></div>'+
  '<div class="study-ai-dims">'+[['计算/推理',parts.reasoning],['数据证据',parts.data],['运营判断',parts.decision],['风险意识',parts.risk]].map(function(x){
   return '<div><small>'+x[0]+'</small><b>'+esc(x[1])+'/25</b></div>';
  }).join('')+'</div><p>'+esc(a.summary||'')+'</p>'+
  (a.errors?.length?'<b>问题：</b><ul>'+a.errors.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'')+
  (a.actions?.length?'<b>下一步：</b><ul>'+a.actions.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'')+
  '<p class="study-tiny">AI仅阅读提交的文字、指标和检查项，不会自行读取本地附件或进入真实亚马逊账户。需专业人工核查时以实际证据为准。</p></div>';
 }
 out+='<div class="study-review-feedback"><h4>记录老师 / ChatGPT 的真实审核意见</h4>'+
 '<p class="study-muted">如AI服务未配置或你希望老师线下评阅，可复制审核材料到聊天，并另行上传实际证据。下面只记录你自行确认收到的审核结论，和网站真实AI审核分开计数。</p>'+
 '<textarea data-sra-field="feedback" data-day="'+d.n+'" rows="3" placeholder="粘贴审核意见：哪里正确、哪里有误、需要改什么…">'+esc(s.feedback||'')+'</textarea>'+
 '<div class="study-row"><button type="button" class="study-action completed" data-sp="reviewApprove" data-day="'+d.n+'">登记人工审核通过（自行确认）</button>'+
 '<button type="button" class="study-action" data-sp="reviewReject" data-day="'+d.n+'">审核要求修改</button></div>'+
 (s.reviewedAt?'<p class="study-tiny">最近确认复核：'+niceDate(s.reviewedAt)+'</p>':'')+
 '</div>'+(s.history?.length?'<details class="study-review-history"><summary>查看历次提交与审核记录（'+s.history.length+'）</summary>'+s.history.slice(-12).reverse().map(function(x){return '<div>'+esc(x.at)+' · '+esc(x.action)+' · '+esc(x.summary||'')+'</div>'}).join('')+'</details>':'')+'</section>';
 return out;
}
function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast('审核材料已复制，请在ChatGPT粘贴，并上传截图或报表附件。')}).catch(function(){window.prompt('复制审核材料',t)})}else window.prompt('复制审核材料',t)}
function toast(t){var a=document.createElement('div');a.className='toast';a.textContent=t;document.body.appendChild(a);setTimeout(function(){a.remove()},3100)}
function draftText(d,p){
 var s=read(p,d.n);
 return '请作为亚马逊广告实战课程的审核老师，严格审核我的Day '+d.n+'作业。先检查算术、单位、归因日期和广告报表口径，再评价运营判断及风险；不要只给鼓励性反馈。请按「正确之处／关键错误／应如何修正／是否通过（通过或退回修改）」回答。\n\n'+
 '课程：'+d.title+'\n学习目标：'+d.task+'\n验收标准：'+d.pass+
 '\n练习ASIN：'+(p.asin||'未指定')+'\n需要的报表：'+d.report+
 (FIELDS[d.n]?'\n计算输入：\n'+FIELDS[d.n].map(function(x){return x[1]+'：'+(s.values[x[0]]??'未填')}).join('\n'):'')+
 '\n证据来源和数据：'+(s.evidence||'未填写')+
 '\n我的判断及计算过程：'+(s.conclusion||'未填写')+
 '\n风险和复查：'+(s.risks||'未填写')+
 '\n本地附件名称（请我自行上传到聊天）：'+(s.files||[]).map(function(x){return x.name}).join('、')+
 '\n\n请明确指出是否达到了本日验收标准，并给出必须修改的细节。';
}
function db(){
 if(!window.indexedDB)return Promise.reject(new Error('此浏览器禁用了附件本地数据库'));
 return new Promise(function(res,rej){var request=window.indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=function(){if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'key'})};
  request.onsuccess=function(){res(request.result)};
  request.onerror=function(){rej(request.error||new Error('IndexedDB打开失败'))};
 });
}
function writeFile(file,id){
 return db().then(function(d){return new Promise(function(res,rej){
  var tx=d.transaction('files','readwrite');tx.objectStore('files').put({key:id,blob:file});
  tx.oncomplete=function(){d.close();res()};
  tx.onerror=function(){d.close();rej(tx.error||new Error('附件保存失败'))};
 })});
}
function retrieveFile(id){
 return db().then(function(d){return new Promise(function(res,rej){var tx=d.transaction('files','readonly'),q=tx.objectStore('files').get(id);
  q.onsuccess=function(){d.close();res(q.result?.blob||null)};q.onerror=function(){d.close();rej(q.error)}
 })});
}
function deleteFile(id){
 return db().then(function(d){return new Promise(function(res,rej){var tx=d.transaction('files','readwrite');tx.objectStore('files').delete(id);
  tx.oncomplete=function(){d.close();res()};tx.onerror=function(){d.close();rej(tx.error)};
 })});
}
function collected(day,context){
 var s=read(context.user.studyPlan,day),els=document.querySelectorAll('[data-sra-field][data-day="'+day+'"]');
 els.forEach(function(el){
  var key=el.getAttribute('data-sra-field');
  if(FIELDS[day]&&FIELDS[day].some(function(x){return x[0]===key}))s.values[key]=el.value;
  else s[key]=el.value;
 });
 return s;
}
function modified(s,p,day){
 if(s.status==='passed'||s.status==='manual_reviewed'||s.status==='submitted'||s.status==='revision'||s.status==='failed'){
  s.status='draft';s.autoMessages=[];s.reviewedAt='';s.ai=null;p.done[day]=false;
 }
}
async function cloudAccess(){
 var ctx=window.AcademyReviewService?.context;
 if(typeof ctx!=='function')return null;
 return ctx();
}
async function cloudUpload(day,meta,blob){
 var auth=await cloudAccess();
 if(!auth?.user||!auth?.client)return false;
 var ext=String(meta.name||'').match(/\.[a-z0-9]{1,5}$/i)?.[0].toLowerCase()||'.bin';
 var path=auth.user.id+'/day-'+day+'/'+meta.id+ext;
 var bucket=auth.client.storage.from('academy-homework-private');
 var res=await bucket.upload(path,blob,{contentType:meta.type||'application/octet-stream',upsert:false});
 if(res.error)throw res.error;
 meta.cloudPath=path;return true;
}
async function syncFiles(day){
 var s=read(ctx.user.studyPlan,day),auth=await cloudAccess();
 if(!auth?.user){toast('请先登录云端账号，才能将附件安全同步到跨设备私人存储。');return}
 var ok=0,missing=0,errors=[];
 for(var meta of s.files||[]){
  if(meta.cloudPath){ok++;continue}
  var blob=await retrieveFile(meta.id);
  if(!blob){missing++;continue}
  try{if(await cloudUpload(day,meta,blob))ok++}catch(e){errors.push(meta.name+': '+String(e.message||e).slice(0,80))}
 }
 ctx.save();ctx.refresh();
 toast('已同步/已有云端附件 '+ok+' 个，当前设备缺失 '+missing+' 个。'+(errors.length?errors.slice(0,2).join('; '):''));
}
async function attach(day,files){
 var p=ctx.user.studyPlan,s=read(p,day),items=Array.from(files||[]);
 if(!items.length)return;
 var allowed=/\.(png|jpe?g|webp|pdf|xlsx|xls|csv|txt)$/i;
 var pendingFiles=items.slice(0,Math.max(0,MAX_FILES-(s.files||[]).length)),errors=[];
 for(var i=0;i<pendingFiles.length;i++){
  var f=pendingFiles[i];
  if(!allowed.test(f.name)){errors.push(f.name+'：文件格式不支持');continue}
  if(f.size>MAX_FILE){errors.push(f.name+'：超过15MB');continue}
  var id='day'+day+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  try{
   await writeFile(f,id);
   var meta={id:id,name:f.name,size:f.size,type:f.type||'application/octet-stream',at:stamp(),cloudPath:''};
   s.files.push(meta);
   try{await cloudUpload(day,meta,f)}catch(err){errors.push(f.name+'：私人云端同步暂不可用（本地附件仍已保存），'+String(err.message||err).slice(0,90))}
  }catch(e){errors.push(f.name+'：'+(e.message||e))}
 }
 if(items.length>pendingFiles.length)errors.push('每个作业最多保存4个附件');
 modified(s,p,day);ctx.save();ctx.refresh();
 toast(errors.length?errors.join('；'):'已将附件保存在本浏览器，可随作业使用；需人工上传到ChatGPT。');
}
async function remove(day,id){
 var p=ctx.user.studyPlan,s=read(p,day);
 var target=(s.files||[]).find(function(f){return f.id===id});
 if(target?.cloudPath){
  var auth=await cloudAccess();
  if(!auth?.client){toast('该附件已同步云端，请先登录账号后再删除。');return}
  var result=await auth.client.storage.from('academy-homework-private').remove([target.cloudPath]);
  if(result.error){toast('云端删除失败，附件仍然保留：'+String(result.error.message||result.error));return}
 }
 try{await deleteFile(id)}catch(e){}
 s.files=(s.files||[]).filter(function(f){return f.id!==id});
 modified(s,p,day);ctx.save();ctx.refresh();
}
async function download(id,name){
 var f=await retrieveFile(id);
 if(!f){
  var p=ctx.user.studyPlan,all=Object.values(p.submissions||{}),meta=all.flatMap(function(x){return x.files||[]}).find(function(x){return x.id===id});
  if(meta?.cloudPath){
   var auth=await cloudAccess();if(!auth?.client){toast('这是私人云端附件，请先登录原账号。');return}
   var remote=await auth.client.storage.from('academy-homework-private').download(meta.cloudPath);
   if(remote.error){toast('跨设备下载失败：'+String(remote.error.message||remote.error));return}
   f=remote.data;
  }
 }
 if(!f){toast('本机和云端都找不到该附件，请重新上传。');return}
 var url=URL.createObjectURL(f),a=document.createElement('a');a.href=url;a.download=name;a.target='_blank';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},3000);
}
async function aiReview(day,d,p,options){
 if(aiBusy){toast('已有作业在审核，请稍后再次提交。');return}
 var s=collected(day,options),check=audit(day,s);
 if(!check.passed||s.status!=='submitted'){
  if(!check.passed){s.autoMessages=check.messages;s.status='failed';options.save();options.refresh()}
  toast('请先提交作业并通过规则初审，再进行AI正式复核。');return;
 }
 if(!window.AcademyReviewService){toast('尚未检测到AI服务，使用复制材料到ChatGPT审核。');return}
 var rubrics=window.AdsDayRubrics.forDay(day).map(function(r){return {title:r.title,evidence:String(s.criteria[r.id]?.proof||'')}});
 var payload={day,title:d.title,task:d.task,standard:d.pass,evidence:s.evidence,conclusion:s.conclusion,risks:s.risks,
  values:s.values,checklist:rubrics,fileNames:(s.files||[]).map(function(f){return f.name}),localMessages:check.messages};
 aiBusy=true;options.refresh();
 try{
  var result=await window.AcademyReviewService.review(payload);
  s.ai=result;s.status=result.verdict==='pass'?'passed':'revision';s.reviewedAt=stamp();
  p.done[day]=result.verdict==='pass';s.feedback=String(result.summary||'');
  history(s,'AI复核',result.score+'/100 · '+result.verdict+' · '+String(result.summary||'').slice(0,300));
  options.save();toast(result.verdict==='pass'?'AI评分 '+result.score+'/100，审核通过。':'AI已列出需要修改的问题，修正后可再次提交。');
 }catch(e){toast(String(e?.message||e).slice(0,230))}
 finally{aiBusy=false;options.refresh()}
}
function handle(action,z,options,days){
 if(!/^review/.test(action))return false;
 ctx=options;var day=Number(z.dataset.day),d=days.find(function(x){return x.n===day});
 if(!d)return true;
 var p=options.user.studyPlan,s=read(p,day);
 if(action==='reviewSubmit'){
  collected(day,options);var check=audit(day,s);s.autoMessages=check.messages;s.autoCheck=check.calc;s.status=check.passed?'submitted':'failed';s.submittedAt=stamp();
  s.ai=null;p.done[day]=false;history(s,'规则初审',check.passed?'材料和公式完整性通过':check.messages.join('；').slice(0,350));
  options.save();options.refresh();toast(check.passed?'规则初审完成，请继续AI审核或老师复核；此时未算作正式通过。':'规则初审有待修正的内容，请查看下方反馈。');
 }else if(action==='reviewCopy'){collected(day,options);options.save();copyText(draftText(d,p))}
 else if(action==='reviewAI'){void aiReview(day,d,p,options)}
 else if(action==='reviewSyncFiles'){void syncFiles(day)}
 else if(action==='reviewApprove'||action==='reviewReject'){
  collected(day,options);
  if(s.status!=='submitted'&&s.status!=='passed'){toast('请先修改并重新提交作业、通过公式初审，再录入新的审核结论。');return true}
  if((s.feedback||'').trim().length<15){toast('请先粘贴真实审核意见（至少15字符），再记录审核结论。');return true}
  s.status=action==='reviewApprove'?'manual_reviewed':'revision';s.reviewedAt=stamp();p.done[day]=action==='reviewApprove';history(s,action==='reviewApprove'?'手工登记复核意见':'要求重做',s.feedback);
  options.save();options.refresh();
  toast(action==='reviewApprove'?'已登记人工反馈（由用户自行确认），与系统AI审核区分显示。':'已标记需要修改，请根据审核意见重新提交。');
 }else if(action==='reviewRemove'){void remove(day,z.dataset.file)}
 else if(action==='reviewDownload'){var attachment=(s.files||[]).find(function(x){return x.id===z.dataset.file});if(attachment)void download(attachment.id,attachment.name)}
 return true;
}
function change(event,options){
 var el=event.target;if(!el||!el.hasAttribute)return false;
 if(el.hasAttribute('data-sra-upload')){
  var day=Number(el.getAttribute('data-sra-upload'));
  ctx=options;void attach(day,el.files);return true;
 }
 if(el.hasAttribute('data-sra-criterion-check')||el.hasAttribute('data-sra-criterion-proof')){
  var dy=Number(el.dataset.day),pp=options.user.studyPlan,ss=read(pp,dy),
   id=el.getAttribute('data-sra-criterion-check')||el.getAttribute('data-sra-criterion-proof');
  if(!ss.criteria[id])ss.criteria[id]={checked:false,proof:''};
  if(el.hasAttribute('data-sra-criterion-check'))ss.criteria[id].checked=!!el.checked;else ss.criteria[id].proof=el.value;
  modified(ss,pp,dy);options.save();return true;
 }
 if(!el.hasAttribute('data-sra-field'))return false;
 var day=Number(el.dataset.day),p=options.user.studyPlan,s=read(p,day),key=el.getAttribute('data-sra-field');
 if(FIELDS[day]&&FIELDS[day].some(function(x){return x[0]===key}))s.values[key]=el.value;
 else s[key]=el.value;
 if(key!=='feedback')modified(s,p,day);
 options.save();return true;
}
function reviewList(p){
 var all=Object.keys(p.submissions||{}).map(function(x){return {day:Number(x),s:p.submissions[x]}}).filter(function(x){return x.s&&x.s.status!=='draft'}).sort(function(a,b){return a.day-b.day});
 return '<section class="study-card study-pad"><div class="study-eyebrow">ASSIGNMENT REVIEW HISTORY</div><h3 style="margin:7px 0">作业审核记录</h3>'+
 (all.length?'<div class="study-review-list">'+all.map(function(x){return '<div class="study-review-row"><span>Day '+x.day+' · '+esc(dayLabel(x.s))+'</span><small>'+esc(niceDate(x.s.submittedAt))+'</small>'+(x.s.feedback?'<p>'+esc(x.s.feedback)+'</p>':'')+'</div>'}).join('')+'</div>':
 '<p class="study-muted">还没有提交过实操作业。每天先填入证据和计算，提交初审后才会有审核记录。</p>')+
 '</section>';
}
return {read:read,audit:audit,renderPanel:renderPanel,renderSummary:renderSummary,handle:handle,change:change,reviewList:reviewList,copyRequest:draftText,dayLabel:dayLabel};
})();