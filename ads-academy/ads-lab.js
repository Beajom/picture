/* Amazon Ads Lab v1: dashboards, analytics, actionable practice.
   Raw reports are stored only in the visitor's browser IndexedDB. */
(function(){
'use strict';
var E=window.AdsEngine;
var TABS=[
 ['overview','经营总览','layout-dashboard'],['import','报表导入','upload'],
 ['terms','搜索词决策','search'],['placements','广告位诊断','target'],
 ['campaigns','活动治理','layers'],['products','ASIN利润库','calculator'],
 ['actions','优化任务与复盘','clipboard-list'],['practice','真实数据训练','graduation-cap'],['overlap','重叠投放检查','copy'],['ranks','自然排名跟踪','trending-up'],['connect','数据接入','plug']
];
var COLUMNS=[
 ['key','搜索词/投放'],['impressions','曝光'],['clicks','点击'],['spend','花费'],['orders','订单'],['sales','销售额'],['ctr','CTR'],['cvr','CVR'],['cpc','CPC'],['cpa','CPA'],['acos','ACOS'],['type','决策分类'],['confidence','可信度']
];
var state={ready:false,loading:false,datasets:[],error:'',notice:'',tab:'overview',kind:'',asin:'all',campaign:'',q:'',from:'',to:'',minClicks:0,importAsin:'',importBusy:false,uploadMode:'replace',currency:'',productDraft:null,editProduct:'',detail:'',reviewWeek:'current',practiceIndex:0,practiceReveal:false};
var context=null;
function esc(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&quot;':'&quot;',"'":'&#39;'}[c]})}
function num(x){return E.number(x)}
function f(x,n){return x===null||x===undefined||!Number.isFinite(x)?'—':Number(x).toLocaleString('en-US',{minimumFractionDigits:n||0,maximumFractionDigits:n===undefined?2:n})}
function pct(x){return x===null||x===undefined||!Number.isFinite(x)?'—':f(x*100,1)+'%'}
function usd(x){return x===null||x===undefined||!Number.isFinite(x)?'—':'$'+f(x,2)}
function stamp(){return new Date().toISOString().slice(0,10)}
function dataUser(){var u=context.user;if(!u.adsLab||typeof u.adsLab!=='object')u.adsLab={};var p=u.adsLab;if(!Array.isArray(p.products))p.products=[];if(!Array.isArray(p.actions))p.actions=[];if(!Array.isArray(p.practice))p.practice=[];if(!Array.isArray(p.ranks))p.ranks=[];if(!p.revenue||typeof p.revenue!=='object')p.revenue={amount:'',from:'',to:'',currency:'USD'};if(!p.targets||typeof p.targets!=='object')p.targets={cpa:'',acos:'',currency:'USD'};return p}
function notify(s,isError){state.notice=s;state.error=isError?s:'';context&&context.refresh()}
function dirty(){context.save();context.refresh()}
function init(ctx){context=ctx;dataUser();if(state.ready||state.loading)return;state.loading=true;E.load().then(function(items){state.datasets=Array.isArray(items)?items:[];state.ready=true;state.loading=false;autoKind();if(context)context.refresh()}).catch(function(e){state.ready=true;state.loading=false;state.error='当前浏览器无法持久保存报表：'+(e.message||e)+'；可继续使用临时分析，但刷新后可能丢失。';if(context)context.refresh()})}
function autoKind(){if(!state.kind&&state.datasets.length)state.kind=state.datasets[0].kind;var d=state.datasets.find(function(x){return x.kind===state.kind});if(d&&!state.currency)state.currency=d.currencies&&d.currencies[0]||'USD'}
function kinds(){
 var kinds=['sp_search','sp_placement','sb_search','sb_placement'];
 return kinds;
}
var KN={sp_search:'SP · 搜索词',sp_placement:'SP · 广告位',sb_search:'SB · 搜索词',sb_placement:'SB · 广告位'};
function chip(x,type){return '<span class="al-chip '+(type||'')+'">'+esc(x)+'</span>'}
function btn(text,action,cls,extras){return '<button type="button" class="al-btn '+(cls||'')+'" data-al="'+action+'" '+(extras||'')+'>'+esc(text)+'</button>'}
function datasetSummary(d){return E.metric(d.rows||[])}
function activeDatasets(){return state.datasets.filter(function(d){return d.kind===state.kind})}
function uniqueRows(){
 var selected=activeDatasets();
 var currencies=Array.from(new Set(selected.flatMap(function(d){return (d.rows||[]).map(function(r){return r.currency||'未注明'})})));if(currencies.length&&!currencies.includes(state.currency))state.currency=currencies[0];
 var all=[];
 selected.slice().sort(function(a,b){return String(a.importedAt).localeCompare(String(b.importedAt))}).forEach(function(d){
  (d.rows||[]).forEach(function(r){if(state.currency&&((r.currency||'未注明')!==state.currency))return;
   if(state.asin!=='all'&&(r._asin||d.asin||'')!==state.asin)return;
   if(state.from&&r.date&&r.date<state.from)return;if(state.to&&r.date&&r.date>state.to)return;
   if(state.campaign&&!String(r.campaign||'').toLowerCase().includes(state.campaign.toLowerCase()))return;
   all.push(Object.assign({},r,{_asin:r._asin||d.asin||'',_kind:d.kind,_dataset:d.id}));
  });
 });
 var u=E.unique(all);
 return {rows:u.rows,duplicates:u.duplicates,original:all.length,datasets:selected.length};
}
function productByAsin(asin){return dataUser().products.find(function(p){return p.asin===asin})}
function targets(){
 var t=dataUser().targets,cpa=num(t.cpa),acos=num(t.acos)/100;
 if(state.asin!=='all'){
  var pr=productByAsin(state.asin);
  if(pr){var model=E.products(pr);if(model.valid)return {cpa:model.targetCPA,acos:model.targetACOS,from:'ASIN利润库：'+pr.asin,model:model}}
 }
 return {cpa:cpa>0?cpa:null,acos:acos>0?acos:null,from:'手动输入的广告目标'};
}
function groupData(by){var x=uniqueRows().rows,t=targets();return E.report(x,by,{targetCPA:t.cpa,targetACOS:t.acos})}
function hi(){return '<section class="al-hero"><div><span class="al-eye">ADVERTISING INTELLIGENCE · v4</span><h1>把广告报表变成可验证的运营决策</h1><p>沿用 Soju 的 SP / SB 搜索词、广告位结构，补上自动识别、利润边界、经营诊断、行动闭环和实战训练。默认只在本机解析原始报表。</p></div><div class="al-hero-side"><small>已导入的报表明细</small><strong>'+state.datasets.reduce(function(s,d){return s+(d.rows||[]).length},0).toLocaleString('en-US')+'</strong><span>'+state.datasets.length+' 份来源 · '+dataUser().products.length+' 个 ASIN</span></div></section>'}
function head(){return '<div class="al-title"><div><span class="al-eye">AD OPERATIONS WORKBENCH</span><h1>广告分析与运营实战中心</h1><p class="al-muted">导入真实报告 → 评估利润边界 → 找到问题 → 执行、复查与训练。不自动修改亚马逊广告账户。</p></div>'+btn('导入广告报告','tab','primary','data-tab="import"')+'</div>'+
 hi()+'<div class="al-tabs">'+TABS.map(function(t){return '<button type="button" data-al="tab" data-tab="'+t[0]+'" class="'+(state.tab===t[0]?'sel':'')+'">'+esc(t[1])+'</button>'}).join('')+'</div>'+
 (state.notice?'<div class="al-notice '+(state.error?'danger':'')+'">'+esc(state.notice)+btn('关闭','closeNotice','text')+'</div>':'')+
 (state.error&&!state.notice?'<div class="al-notice danger">'+esc(state.error)+'</div>':'');
}
function empty(msg){return '<div class="al-empty"><span>◎</span><h3>暂无可用于分析的数据</h3><p>'+esc(msg||'先导入一份亚马逊 SP 或 SB 搜索词/广告位原始报告。')+'</p>'+btn('导入报表','tab','primary','data-tab="import"')+'</div>'}
function kpi(label,value,sub,tone){return '<div class="al-kpi"><span>'+esc(label)+'</span><b class="'+(tone||'')+'">'+value+'</b><small>'+esc(sub||'')+'</small></div>'}
function filters(opts){
 opts=opts||{};var all=state.datasets,keys=kinds();
 return '<div class="al-filters"><div class="al-field"><label>报告类型（分别核算）</label><select data-al-input="kind">'+keys.map(function(k){return '<option value="'+k+'" '+(state.kind===k?'selected':'')+'>'+KN[k]+' · '+all.filter(function(x){return x.kind===k}).length+'份</option>'}).join('')+'</select></div>'+
 '<div class="al-field"><label>关联 ASIN</label><select data-al-input="asin"><option value="all">全部关联商品</option>'+dataUser().products.map(function(p){return '<option value="'+esc(p.asin)+'" '+(state.asin===p.asin?'selected':'')+'>'+esc(p.asin)+' / '+esc(p.name||'')+'</option>'}).join('')+'</select></div>'+
 '<div class="al-field"><label>币种</label><select data-al-input="currency">'+Array.from(new Set(activeDatasets().flatMap(function(d){return (d.rows||[]).map(function(r){return r.currency||'未注明'})}))).map(function(c){return '<option value="'+esc(c)+'" '+(state.currency===c?'selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></div>'+ 
 '<div class="al-field"><label>起始日期</label><input type="date" data-al-input="from" value="'+esc(state.from)+'"></div>'+
 '<div class="al-field"><label>结束日期</label><input type="date" data-al-input="to" value="'+esc(state.to)+'"></div>'+
 (opts.search?'<div class="al-field al-grow"><label>搜索活动或关键词</label><input id="alSearch" data-al-input="q" type="search" placeholder="筛选搜索词…" value="'+esc(state.q)+'"></div>':'')+
 '<div class="al-field al-grow"><label>广告活动筛选</label><input data-al-input="campaign" type="search" placeholder="输入活动名称" value="'+esc(state.campaign)+'"></div>'+ 
 '<div class="al-filter-actions">'+btn('重置筛选','resetFilters','soft')+'</div></div>';
}
function impactNote(){
 return '<div class="al-note">重要：搜索词报告与广告位报告通常是同一批广告表现的不同维度，绝不能互相累加。SP通常使用7天归因，SB模板使用14天归因。跨币种、跨归因窗口及缺失日期的数据不直接合并为经营总额。</div>';
}
function spark(rows){
 var x=E.group(rows.filter(function(r){return !!r.date}),'daily').sort(function(a,b){return a.key.localeCompare(b.key)}).slice(-28);
 if(x.length<2)return '<div class="al-muted">至少导入2个不同日期的数据，才能显示趋势。</div>';
 var w=720,h=170,top=12,bottom=145,max=Math.max(1,...x.map(function(r){return Math.max(r.sales,r.spend)}));
 function points(k){return x.map(function(r,i){var xx=30+i*(w-60)/Math.max(1,x.length-1),yy=bottom-(r[k]/max)*(bottom-top);return xx.toFixed(1)+','+yy.toFixed(1)}).join(' ')}
 var labels=[x[0].key,x[Math.floor((x.length-1)/2)].key,x[x.length-1].key];
 return '<div class="al-chart"><div class="al-chartlabel"><span><i class="blue"></i> 花费</span><span><i class="green"></i> 销售额</span></div>'+
 '<svg role="img" aria-label="最近日期内广告花费与销售额趋势图" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="30" x2="690" y1="145" y2="145" stroke="#dfe8f5"/>'+
 '<line x1="30" x2="690" y1="80" y2="80" stroke="#eef1f8" stroke-dasharray="4 4"/>'+
 '<polyline fill="none" stroke="#377bea" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="'+points('spend')+'"/>'+
 '<polyline fill="none" stroke="#0eab84" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="'+points('sales')+'"/></svg>'+
 '<div class="al-chartticks"><span>'+esc(labels[0])+'</span><span>'+esc(labels[1])+'</span><span>'+esc(labels[2])+'</span></div></div>';
}
function comparisonCard(d){
 var m=datasetSummary(d),days=Array.from(new Set(d.rows.map(function(x){return x.date}).filter(Boolean))).sort();
 return '<div class="al-source"><div class="al-between"><strong>'+esc(d.sheet||d.file)+'</strong>'+chip(KN[d.kind]||d.kind)+'</div>'+
 '<div class="al-source-meta">'+esc(d.file||'')+' · '+d.rows.length+'行 · '+esc(d.attr||'')+'</div><div class="al-minirow"><div><span>花费</span><b>'+usd(m.spend)+'</b></div><div><span>销售额</span><b>'+usd(m.sales)+'</b></div><div><span>ACOS</span><b>'+pct(m.acos)+'</b></div></div>'+
 '<small class="al-muted">'+(days.length?esc(days[0]+' 至 '+days[days.length-1]):'无有效日期')+'</small></div>';
}
function overview(){
 if(!state.datasets.length)return '<div class="al-grid two"><div class="al-panel al-pad"><h2>快速开始 · 3步</h2><div class="al-process">'+['导入亚马逊原始搜索词/广告位报告（CSV、XLSX）','在 ASIN 利润库录入费用，计算目标 CPA 与 ACOS','根据搜索词、广告位和活动分析生成优化行动'].map(function(s,i){return '<div><i>'+(i+1)+'</i>'+esc(s)+'</div>'}).join('')+'</div>'+btn('立即导入','tab','primary','data-tab="import"')+'</div><div class="al-panel al-pad"><h2>现有 Soju 模板怎样使用？</h2><p class="al-muted">SP、SB Excel 模板各有4张表，原始数据页有完整的报告字段，但目前没有有效广告明细。可以导入本系统识别结构；真正分析时请下载亚马逊后台的原始报告。</p>'+impactNote()+'</div></div>';
 var summary='<div class="al-grid four">'+kinds().map(function(k){var ds=state.datasets.filter(function(d){return d.kind===k});return kpi(KN[k],ds.length+'份',ds.reduce(function(a,d){return a+d.rows.length},0)+'行数据')}).join('')+'</div>';
 var a=uniqueRows(),m=E.metric(a.rows),t=targets();
 return summary+filters()+'<div class="al-grid four">'+
 kpi('广告花费',usd(m.spend),'所选报告类型及筛选范围')+kpi('归因销售额',usd(m.sales),'按该报表自身口径')+
 kpi('ACOS',pct(m.acos),'花费 / 广告归因销售额')+kpi('平均 CPA',usd(m.cpa),'花费 / 归因订单')+'</div>'+
 revenueSection(m)+
 '<div class="al-grid two"><section class="al-panel al-pad"><div class="al-between"><h2>每日广告趋势</h2>'+chip('所选报告：'+(KN[state.kind]||'未选择'))+'</div>'+spark(a.rows)+'</section>'+
 '<section class="al-panel al-pad"><h2>利润与可行动性</h2><div class="al-process">'+
 '<div><i>1</i><span>可承受 CPA：<b>'+usd(t.cpa)+'</b>（'+esc(t.from)+'）</span></div>'+
 '<div><i>2</i><span>当前平均 CPA：<b>'+usd(m.cpa)+'</b></span></div>'+
 '<div><i>3</i><span>已标记可复盘任务：<b>'+dataUser().actions.length+'</b> 条</span></div></div>'+
 btn('维护 ASIN 利润模型','tab','primary','data-tab="products"')+' '+btn('查看搜索词决策','tab','soft','data-tab="terms"')+
 '<div class="al-muted al-mt">只对选择的同一报告类型计算，避免重复统计。若报告没有 ASIN 字段，应在导入时手动关联商品。</div></section></div>'+
 '<section class="al-panel al-pad"><div class="al-between"><h2>已导入的报告来源</h2>'+btn('管理报表','tab','soft','data-tab="import"')+'</div><div class="al-grid two">'+state.datasets.slice(-8).map(comparisonCard).join('')+'</div></section>'+
 (a.duplicates?'<div class="al-note">发现'+a.duplicates+'条可能重复的报表维度记录，当前在所选视图中仅保留最新一条；请核对是否为重复下载或不同口径的原始报告。</div>':'')+impactNote();
}
function revenueSection(m){
 var r=dataUser().revenue||{},amount=num(r.amount),good=amount>0&&(!r.currency||r.currency===state.currency),actual=good?m.spend/amount:null;
 var match=(r.from||'')===(state.from||'')&&(r.to||'')===(state.to||'');
 return '<div class="al-panel al-pad"><div class="al-between"><div><span class="al-eye">FULL SALES PERFORMANCE</span><h2>总销售额 / TACOS 口径</h2></div>'+chip('人工录入营业额')+'</div>'+
 '<p class="al-muted">SP/SB 搜索词与广告位报表不含完整店铺自然销售额。要测 TACOS，请输入与所选广告报告相同期间、相同币种、相同店铺/商品范围的总销售额。若多个广告类型均有花费，需合计各类型不重复的实际花费才是完整 TACOS。</p>'+
 '<div class="al-formgrid"><div class="al-field"><label>所选范围总销售额（'+esc(state.currency||'币种')+'）</label><input data-al-revenue="amount" type="number" min="0" step="any" value="'+esc(r.amount||'')+'" placeholder="从业务报告填写"></div>'+
 '<div class="al-field"><label>总销售额币种</label><select data-al-revenue="currency"><option value="USD" '+(r.currency==='USD'?'selected':'')+'>USD</option><option value="GBP" '+(r.currency==='GBP'?'selected':'')+'>GBP</option><option value="EUR" '+(r.currency==='EUR'?'selected':'')+'>EUR</option><option value="JPY" '+(r.currency==='JPY'?'selected':'')+'>JPY</option><option value="CNY" '+(r.currency==='CNY'?'selected':'')+'>CNY</option></select></div>'+
 '<div class="al-field"><label>营业额起始日</label><input data-al-revenue="from" type="date" value="'+esc(r.from||'')+'"></div>'+
 '<div class="al-field"><label>营业额结束日</label><input data-al-revenue="to" type="date" value="'+esc(r.to||'')+'"></div></div>'+
 '<div class="al-between"><div><span class="al-muted">当前所选报告花费 / 已填总销售额：</span><strong style="font-size:21px;color:#225ca9">'+(match&&good?pct(actual):'—')+'</strong></div>'+btn('保存营业额','saveRevenue','primary')+'</div>'+
 (!match?'<div class="al-note">日期筛选与营业额日期不一致或未完整指定：不显示TACOS。请先设置相同的起止日期。</div>':'')+
 '<div class="al-note">这里显示的是所选报告花费占总销售额比例；只有确认它覆盖该期间全部广告花费后，才能称为全账户 TACOS。否则只是局部广告费用率。</div></div>';
}
function importer(){
 var d=state.datasets;
 return '<section class="al-grid two"><div class="al-panel al-pad"><span class="al-eye">LOCAL DATA IMPORT</span><h2>导入亚马逊真实广告报表</h2><p class="al-muted">支持 SP/SB 搜索词报告、SP/SB 广告位报告和 Soju 的两份 Excel 模板，自动跳过透视结果页，不重复计算。</p>'+
 '<div class="al-drop"><div class="al-drop-icon">⇪</div><strong>选择 CSV / XLSX / XLS 文件</strong><p class="al-muted">可一次选择多个文件，每份文件只解析本地浏览器，不传到 GitHub 或第三方分析服务器。</p>'+
 '<input id="alFiles" type="file" multiple accept=".xlsx,.xls,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div>'+
 '<div class="al-field"><label>手动关联 ASIN（可选）</label><select id="alImportAsin"><option value="">不关联 / 原始报表缺少 ASIN</option>'+
 dataUser().products.map(function(p){return '<option value="'+esc(p.asin)+'" '+(state.importAsin===p.asin?'selected':'')+'>'+esc(p.asin)+' / '+esc(p.name||'')+'</option>'}).join('')+'</select></div>'+
 '<div class="al-field"><label>上传相同报告类型时</label><select id="alImportMode"><option value="replace" '+(state.uploadMode==='replace'?'selected':'')+'>替换原有同类型数据（推荐，避免重叠）</option><option value="append" '+(state.uploadMode==='append'?'selected':'')+'>追加新期间报表（可能需要去重）</option></select></div>'+
 btn(state.importBusy?'正在解析…':'开始解析并保存','importFiles','primary',state.importBusy?'disabled':'')+
 '<p class="al-muted al-mt">导入后原始行保存在此浏览器 IndexedDB；跨设备不会自动同步广告原始报表。可以导出诊断结果和手动重新导入。</p></div>'+
 '<div class="al-panel al-pad"><h2>数据检查与模板说明</h2>'+
 '<div class="al-process"><div><i>✓</i>自动检查报告标题、列名和数值</div><div><i>✓</i>识别 SP / SB、搜索词 / 广告位</div><div><i>✓</i>保留 SP 7天、SB 14天独立归因口径</div><div><i>✓</i>缺少日期或混合币种会显示警告</div><div><i>✓</i>清空的透视表只显示“无明细”</div></div>'+
 '<div class="al-note">同一时间段不同维度的报告不能相加。上传后请检查币种、广告活动范围、日期及归因窗口是否一致。请勿上传账户密码或API密钥。</div></div></section>'+
 '<section class="al-panel al-pad"><div class="al-between"><h2>已导入数据 · '+d.length+'份</h2>'+btn('导出数据清单','exportManifest','soft')+'</div>'+
 (d.length?'<div class="al-tablewrap"><table class="al-table"><thead><tr><th>类型</th><th>报表 / 来源文件</th><th>行数</th><th>时间范围</th><th>归因</th><th>关联 ASIN</th><th>操作</th></tr></thead><tbody>'+
 d.map(function(x){var days=x.rows.map(function(r){return r.date}).filter(Boolean).sort();return '<tr><td>'+chip(KN[x.kind]||x.kind)+'</td><td><b>'+esc(x.sheet||'')+'</b><small class="al-muted al-block">'+esc(x.file)+'</small></td><td>'+f(x.rows.length,0)+'</td><td>'+esc(days[0]||'未知')+' 至 '+esc(days[days.length-1]||'未知')+'</td><td>'+esc(x.attr)+'</td><td>'+esc(x.asin||'未关联')+'</td><td>'+btn('删除','removeDataset','danger','data-id="'+esc(x.id)+'"')+'</td></tr>'}).join('')+'</tbody></table></div>':empty('这里会显示每个导入的真实报表及解析的行数。'))+'</section>';
}
function analysis(type){
 var need=type==='terms'?'search':type==='placements'?'placement':'campaign',selected=state.kind;
 if(need!=='campaign'&&(!selected||!selected.endsWith(need))){
  var alt=kinds().find(function(k){return k.endsWith(need)&&state.datasets.some(function(d){return d.kind===k})});
  if(alt){state.kind=alt;selected=alt}
 }
 var u=uniqueRows(),rows=u.rows;
 if(!rows.length)return filters({search:need==='search'})+empty('目前所选的 '+(KN[selected]||selected)+' 报告没有可用数据；请先导入该类原始报告。')+impactNote();
 var t=targets(),groups=groupData(need),keysearch=String(state.q||'').trim().toLowerCase();
 if(keysearch)groups=groups.filter(function(g){return g.key.toLowerCase().includes(keysearch)});
 var full=groups.length;
 groups=groups.slice(0,200);
 var meta=need==='search'?'搜索词分层与否定决策':need==='placement'?'广告位的成本与转化表现':'活动级预算与收益治理';
 return filters({search:need==='search'})+
 '<section class="al-panel al-pad"><div class="al-between"><div><span class="al-eye">DATA DIAGNOSIS</span><h2>'+esc(meta)+'</h2></div><div class="al-actions">'+chip(KN[selected]||'')+btn('导出分析CSV','exportAnalysis','soft','data-group="'+need+'"')+'</div></div>'+
 '<p class="al-muted">共 '+full+' 行分组结果（最多展示前200行），目标 CPA：'+usd(t.cpa)+'，目标 ACOS：'+pct(t.acos)+'。建议是辅助判断，不会自动修改广告。</p>'+
 '<div class="al-tablewrap"><table class="al-table"><thead><tr><th>'+esc(need==='search'?'客户搜索词':need==='placement'?'广告位':'广告活动')+'</th><th>曝光</th><th>点击</th><th>花费</th><th>订单</th><th>销售额</th><th>CTR</th><th>CVR</th><th>CPC</th><th>CPA</th><th>ACOS</th><th>行动判断</th><th>操作</th></tr></thead><tbody>'+
 groups.map(function(g,i){return '<tr><td class="al-key"><strong title="'+esc(g.key)+'">'+esc(g.key)+'</strong><small>'+esc(g.confidence)+'可信度</small></td>'+
 '<td>'+f(g.impressions,0)+'</td><td>'+f(g.clicks,0)+'</td><td>'+usd(g.spend)+'</td><td>'+f(g.orders,0)+'</td><td>'+usd(g.sales)+'</td>'+
 '<td>'+pct(g.ctr)+'</td><td>'+pct(g.cvr)+'</td><td>'+usd(g.cpc)+'</td><td>'+usd(g.cpa)+'</td><td>'+pct(g.acos)+'</td><td>'+chip(g.type,g.rank===1?'ok':g.rank===2?'warn':'')+'</td>'+
 '<td>'+btn('详情','detail','soft','data-idx="'+i+'" data-group="'+need+'"')+' '+btn('加入行动','addAction','primary','data-idx="'+i+'" data-group="'+need+'"')+'</td></tr>'}).join('')+'</tbody></table></div></section>'+
 (state.detail?detailView(need,groups):'')+impactNote();
}
function detailView(by,groups){
 var g=groups.find(function(x){return x.key===state.detail});
 if(!g)return '';
 return '<div class="al-panel al-pad"><div class="al-between"><h2>诊断依据：'+esc(g.key)+'</h2>'+btn('关闭详情','closeDetail','soft')+'</div><p class="al-muted">'+esc(g.evidence)+'</p>'+
 '<div class="al-grid four">'+kpi('CPC',usd(g.cpc),'')+kpi('CPA',usd(g.cpa),'')+kpi('CVR',pct(g.cvr),'')+kpi('样本可信度',esc(g.confidence),'')+'</div>'+
 '<div class="al-note">推荐的下一步：核对搜索词相关性、历史归因、商品可售库存与利润，单次只改少量变量，并在操作记录中设置复查日期。</div></div>';
}
function productEmpty(){
 return {asin:'',name:'',price:'',fx:'',procure:'',freight:'',fba:'',commission:'',returns:'',discount:'',other:'',target:'',inventory:''};
}
var PRODUCT_FIELDS=[
 ['asin','ASIN','text','B0XXXXXXXX'],['name','产品/变体名称','text','可选'],
 ['price','销售价格 USD','number','例如 16.99'],['fx','汇率 RMB/USD','number','例如 6.70'],
 ['procure','采购包装 RMB','number','实付成本'],['freight','头程 RMB/件','number','含分摊'],
 ['fba','FBA配送 USD','number','实际 Fee Preview'],['commission','佣金率 %','number','输入真实百分比'],
 ['other','其他单件费用 USD','number','仓储/促销等'],['returns','退货损耗预留 %','number','独立于佣金'],
 ['discount','折扣预留 %','number','实际折扣折损'],['target','目标广告后利润率 %','number','预期贡献利润'],
 ['inventory','可售库存','number','可选']
];
function productForm(){
 var p=state.productDraft||productEmpty(),m=E.products(p);
 return '<div class="al-panel al-pad"><div class="al-between"><h2>'+esc(state.editProduct?'编辑商品利润模型':'新增商品利润模型')+'</h2>'+btn('清空编辑','newProduct','soft')+'</div>'+
 '<p class="al-muted">请从亚马逊 Fee Preview 和真实成本台账填写；不使用虚构的 FBA、佣金或运费作为真实定价依据。</p>'+
 '<div class="al-formgrid">'+PRODUCT_FIELDS.map(function(a){return '<div class="al-field"><label>'+esc(a[1])+'</label><input data-al-product="'+a[0]+'" type="'+a[2]+'" '+(a[2]==='number'?'min="0" step="any"':'maxlength="140"')+' placeholder="'+esc(a[3])+'" value="'+esc(p[a[0]]||'')+'"></div>'}).join('')+'</div>'+
 '<div class="al-preview"><div><small>广告前贡献利润</small><b>'+usd(m.contribution)+'</b></div><div><small>盈亏平衡 ACOS</small><b>'+pct(m.breakEvenACOS)+'</b></div><div><small>目标 CPA</small><b>'+usd(m.targetCPA)+'</b></div><div><small>目标 ACOS</small><b>'+pct(m.targetACOS)+'</b></div></div>'+
 (m.valid&&m.targetCPA<=0?'<div class="al-note danger">目前售价/成本/利润目标下，目标CPA不大于0。不能按常规盈利型广告放量。</div>':'')+
 '<div class="al-actions">'+btn('保存商品','saveProduct','primary')+btn('取消','newProduct','soft')+'</div></div>';
}
function products(){
 var p=dataUser(),list=p.products;
 return '<div class="al-grid two"><div>'+productForm()+'</div><div class="al-panel al-pad"><h2>ASIN 利润库 · '+list.length+' 个</h2>'+
 (list.length?list.map(function(x){var m=E.products(x);return '<article class="al-product"><div class="al-between"><div><strong>'+esc(x.asin)+'</strong><small class="al-block al-muted">'+esc(x.name||'未命名产品')+'</small></div>'+chip(m.valid?'已核算':'信息未完善',m.valid?'ok':'')+'</div>'+
 '<div class="al-minirow"><div><span>贡献利润</span><b>'+usd(m.contribution)+'</b></div><div><span>目标 CPA</span><b>'+usd(m.targetCPA)+'</b></div><div><span>目标 ACOS</span><b>'+pct(m.targetACOS)+'</b></div></div>'+
 '<div class="al-actions">'+btn('编辑','editProduct','soft','data-asin="'+esc(x.asin)+'"')+' '+btn('以此 ASIN 分析','useProduct','soft','data-asin="'+esc(x.asin)+'"')+' '+btn('删除','deleteProduct','danger','data-asin="'+esc(x.asin)+'"')+'</div></article>'}).join(''):empty('创建第一个商品，后续搜索词建议会使用对应的单件贡献利润和目标 CPA。'))+'</div></div>'+
 '<section class="al-panel al-pad"><h2>全局默认广告目标</h2><p class="al-muted">当报表没有关联 ASIN 时使用；这不是系统推荐的行业标准，请按自己的利润表确定。</p>'+
 '<div class="al-formgrid"><div class="al-field"><label>目标 CPA（USD）</label><input data-al-target="cpa" type="number" min="0" step="any" value="'+esc(p.targets.cpa)+'"></div>'+
 '<div class="al-field"><label>目标 ACOS（%）</label><input data-al-target="acos" type="number" min="0" step="any" value="'+esc(p.targets.acos)+'"></div></div></section>';
}
function actions(){
 var x=dataUser().actions;
 var sorted=x.slice().sort(function(a,b){return String(b.created).localeCompare(String(a.created))});
 return '<section class="al-panel al-pad"><div class="al-between"><div><span class="al-eye">ACTION CYCLE</span><h2>优化执行与复盘记录</h2></div><div class="al-actions">'+btn('导出行动清单','exportActions','soft')+' '+btn('手动创建行动','manualAction','primary')+'</div></div>'+
 '<p class="al-muted">用证据、计划动作、复查日期和执行结果管理每一轮调整。新增行动不会发送到亚马逊账户。</p>'+
 (sorted.length?'<div class="al-tablewrap"><table class="al-table"><thead><tr><th>目标</th><th>依据与建议</th><th>行动状态</th><th>复查日期</th><th>复盘记录</th><th>操作</th></tr></thead><tbody>'+
 sorted.map(function(a){return '<tr><td class="al-key"><b>'+esc(a.label)+'</b><small>'+esc(a.kind||'手动')+' · '+esc(a.created||'')+'</small></td><td style="min-width:210px">'+esc(a.evidence||'')+'</td>'+
 '<td><select data-al-action-field="status" data-id="'+esc(a.id)+'">'+['待验证','计划执行','已执行','已复盘','不采用'].map(function(v){return '<option '+(a.status===v?'selected':'')+'>'+v+'</option>'}).join('')+'</select></td>'+
 '<td><input data-al-action-field="recheck" data-id="'+esc(a.id)+'" type="date" value="'+esc(a.recheck||'')+'"></td>'+
 '<td><textarea data-al-action-field="notes" data-id="'+esc(a.id)+'" placeholder="写下变更与结果…">'+esc(a.notes||'')+'</textarea></td>'+
 '<td>'+btn('删除','deleteAction','danger','data-id="'+esc(a.id)+'"')+'</td></tr>'}).join('')+'</tbody></table></div>':empty('在搜索词、广告位或活动诊断页点击“加入行动”，可以建立自己的执行复盘台账。'))+'</section>'+
 weeklyReview();
}
function weeklyReview(){
 var current=uniqueRows().rows.filter(function(r){return !!r.date}),dates=Array.from(new Set(current.map(function(r){return r.date}))).sort();
 if(dates.length<8)return '<div class="al-panel al-pad"><h2>自动周复盘</h2><p class="al-muted">导入包含至少8个不同日期的数据后，会对比最近7天与前7天（不足时显示实际覆盖范围）。</p></div>';
 var last=dates[dates.length-1],cut=new Date(last+'T00:00:00Z'),recent=[],past=[];
 current.forEach(function(r){var t=new Date(r.date+'T00:00:00Z'),delta=(cut-t)/86400000;if(delta>=0&&delta<7)recent.push(r);else if(delta>=7&&delta<14)past.push(r)});
 var a=E.metric(recent),b=E.metric(past);
 function change(a,b){return b>0?((a-b)/b*100).toFixed(1)+'%':'—'}
 return '<section class="al-panel al-pad"><div class="al-between"><h2>最近7日 vs 前7日（同类报告）</h2>'+btn('复制周复盘','copyReview','soft')+'</div>'+
 '<div class="al-grid four">'+kpi('广告花费',usd(a.spend),'环比 '+change(a.spend,b.spend))+kpi('广告订单',f(a.orders,0),'环比 '+change(a.orders,b.orders))+
 kpi('ACOS',pct(a.acos),'前期 '+pct(b.acos))+kpi('CPA',usd(a.cpa),'前期 '+usd(b.cpa))+'</div>'+
 '<p class="al-muted">时间截至 '+esc(last)+'；本分析仅使用当前筛选的 '+esc(KN[state.kind])+' 报表，并非全账户 TACOS。计算总销售额与 TACOS 还需另外导入业务报告或手动输入营业额。</p></section>';
}
function practice(){
 var by=state.kind.endsWith('placement')?'placement':'search',gs=groupData(by),t=targets();
 var tested=gs.filter(function(g){return g.clicks>=5||g.orders>=1}).sort(function(a,b){return b.spend-a.spend});
 if(!tested.length)return empty('请先上传有点击或订单的广告报表。系统将从你的真实数据生成决策训练。');
 var g=tested[state.practiceIndex%tested.length],answer=state.practiceReveal?E.decision(g,t.cpa,t.acos):null;
 return '<div class="al-grid two"><section class="al-panel al-pad"><span class="al-eye">REAL DATA CASE</span><h2>用你的真实报表练判断</h2><p class="al-muted">第 '+(state.practiceIndex%tested.length+1)+' / '+tested.length+' 题 · '+esc(KN[state.kind]||'')+'，本题来自已导入报告（非模拟账户数据）。</p>'+
 '<h3 style="margin:16px 0">'+esc(g.key)+'</h3>'+
 '<div class="al-grid four">'+kpi('点击',f(g.clicks,0),'')+kpi('广告花费',usd(g.spend),'')+kpi('订单',f(g.orders,0),'')+kpi('CPA',usd(g.cpa),'')+'</div>'+
 '<p class="al-muted">你会选择“放量、核查缩量、继续验证，还是暂不判断”？先写出依据，再揭晓参考判断。</p>'+
 '<textarea class="al-practice-answer" id="alPracticeReason" placeholder="我的判断、证据、计划动作、复查时间……"></textarea>'+
 '<div class="al-actions">'+btn('显示参考分析','showAnswer','primary')+' '+btn('换一道真实数据题','nextPractice','soft')+' '+btn('打开相关课程','courseLink','soft','data-course="'+(by==='placement'?'11':'07')+'"')+'</div>'+
 (answer?'<div class="al-explain"><b>参考分类：'+esc(answer.type)+'</b><p>'+esc(answer.evidence)+'</p><small>判断可信度：'+esc(answer.confidence)+' · 必须结合实际广告设置与归因核验</small></div>':'')+'</section>'+
 '<section class="al-panel al-pad"><h2>实操考核方式</h2><div class="al-process"><div><i>1</i>识别问题属于曝光、点击、转化或利润</div><div><i>2</i>记录报告期间、样本量与归因口径</div><div><i>3</i>根据目标 CPA 选择优先动作</div><div><i>4</i>设置复查日期，并解释可能的副作用</div></div>'+
 '<div class="al-note">“显示参考分析”只提供基于指标规则的初步判断，不代表真实产品相关性或自然排名已经核实。实操结果需要运营者最终判断。</div>'+
 btn('加入28天学习计划','goStudy','soft')+'</section></div>';
}
function overlap(){
 if(!state.datasets.some(function(d){return d.kind.endsWith('search')}))return empty('导入SP或SB搜索词原始报告后，才可检查相同搜索词在多个活动中重复出现的情况。');
 var searchKind=state.kind.endsWith('search')?state.kind:state.kind.replace('placement','search'),orig=state.kind;
 state.kind=searchKind;var rows=uniqueRows().rows;state.kind=orig;
 var by=new Map();
 rows.forEach(function(r){var k=(r.term||'').trim().toLowerCase();if(!k)return;
 if(!by.has(k))by.set(k,{term:r.term,terms:[],campaigns:new Set(),spend:0,clicks:0,orders:0,sales:0});
 var o=by.get(k);o.campaigns.add(r.campaign||'未标明');o.spend+=r.spend;o.clicks+=r.clicks;o.orders+=r.orders;o.sales+=r.sales;
 });
 var items=Array.from(by.values()).filter(function(x){return x.campaigns.size>1}).sort(function(a,b){return b.spend-a.spend});
 return '<section class="al-panel al-pad"><span class="al-eye">DUPLICATE TARGETING REVIEW</span><h2>搜索词重叠投放检查 · '+items.length+'个待核对词</h2>'+
 '<p class="al-muted">这里发现的是多个活动共享同一“实际客户搜索词”，不代表必然发生内部竞价或浪费。请结合匹配方式、分工、转化和归因做判断。</p>'+
 (items.length?'<div class="al-tablewrap"><table class="al-table"><thead><tr><th>搜索词</th><th>覆盖活动数</th><th>活动列表</th><th>累计花费</th><th>订单</th><th>ACOS</th><th>建议操作</th></tr></thead><tbody>'+
 items.slice(0,120).map(function(x){return '<tr><td class="al-key"><b>'+esc(x.term)+'</b></td><td>'+x.campaigns.size+'</td><td class="al-key">'+esc(Array.from(x.campaigns).join(' / '))+'</td><td>'+usd(x.spend)+'</td><td>'+f(x.orders,0)+'</td><td>'+pct(x.sales>0?x.spend/x.sales:null)+'</td><td>核对主推/探索角色和CPA，不要直接互相否定</td></tr>'}).join('')+'</tbody></table></div>':empty('当前未发现多个活动使用同一客户搜索词的记录，或报表未覆盖足够的活动。'))+
 '<div class="al-note">不同广告位、不同时间段、SP和SB之间可能出现重复归因，不能把这张检测结果当成实际自我竞价损失金额。</div></section>';
}
function rankRecord(r){
 var asin=String(r.asin||'').trim().toUpperCase(),keyword=String(r.keyword||'').trim(),date=String(r.date||stamp()),natural=num(r.natural),ad=num(r.ad);
 if(!/^[A-Z0-9]{10}$/.test(asin)||!keyword||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 if(natural<0||ad<0||natural>10000||ad>10000)return false;
 var key=asin+'|'+keyword.toLowerCase()+'|'+date,rs=dataUser().ranks;
 var x={asin:asin,keyword:keyword,date:date,natural:natural||null,ad:ad||null,source:r.source||'手动 / CSV',note:r.note||''};
 var i=rs.findIndex(function(a){return [a.asin,a.keyword.toLowerCase(),a.date].join('|')===key});
 if(i>=0)rs[i]=x;else rs.push(x);
 if(rs.length>2500)rs.splice(0,rs.length-2500);
 return true;
}
function rankHistory(){
 var list=dataUser().ranks,series=new Map();
 list.forEach(function(x){
  var k=x.asin+'|'+x.keyword.toLowerCase();
  if(!series.has(k))series.set(k,[]);
  series.get(k).push(x);
 });
 var rows=[];
 series.forEach(function(arr){arr.sort(function(a,b){return b.date.localeCompare(a.date)});
  var a=arr[0],b=arr[1],delta=a.natural!=null&&b&&b.natural!=null?b.natural-a.natural:null;
  rows.push(Object.assign({},a,{previous:b?b.natural:null,delta:delta,observations:arr.length}));
 });
 return rows.sort(function(a,b){return b.date.localeCompare(a.date)}).slice(0,200);
}
function ranks(){
 var list=rankHistory();
 return '<section class="al-grid two"><div class="al-panel al-pad"><span class="al-eye">ORGANIC RANKING MONITOR</span><h2>自然排名与广告位追踪</h2>'+
 '<p class="al-muted">手动录入或批量导入标准CSV，记录每个ASIN每个词的自然排名与广告排名。数值越小，表示搜索结果位置越靠前；没有排名不要填0。</p>'+
 '<div class="al-formgrid"><div class="al-field"><label>ASIN</label><input id="alRankAsin" placeholder="10位ASIN" maxlength="10"></div>'+
 '<div class="al-field"><label>日期</label><input id="alRankDate" type="date" value="'+stamp()+'"></div>'+
 '<div class="al-field"><label>客户搜索词</label><input id="alRankKeyword" placeholder="核心关键词"></div>'+
 '<div class="al-field"><label>自然排名</label><input id="alRankNatural" type="number" min="1" step="1" placeholder="1为前位"></div>'+
 '<div class="al-field"><label>广告排名（可选）</label><input id="alRankAd" type="number" min="1" step="1"></div>'+
 '<div class="al-field"><label>数据来源</label><input id="alRankSource" value="手动检查 / SIF导出"></div></div>'+
 btn('保存排名记录','saveRank','primary')+
 '<div class="al-note">网站不能直接查询 SIF 实时排名，也无法保证每个用户看到的排名一致；应在同一站点、同一关键词、尽量一致的设备或查询环境下比较。</div></div>'+
 '<div class="al-panel al-pad"><h2>批量导入排名 CSV / XLSX</h2><p class="al-muted">模板列：日期, ASIN, 关键词, 自然排名, 广告排名。支持导入统一格式数据；其他 SIF 导出格式需先映射列名。</p>'+
 '<input type="file" id="alRankFile" accept=".csv,.tsv,.xlsx,.xls" style="font-size:11px;max-width:100%">'+
 '<div class="al-actions" style="margin-top:15px">'+btn('批量导入','importRanks','primary')+' '+btn('下载标准模板','exportRanksTemplate','soft')+' '+btn('导出排名历史','exportRanks','soft')+'</div>'+
 '<div class="al-preview" style="margin-top:22px"><div><small>历史记录</small><b>'+dataUser().ranks.length+'</b></div><div><small>跟踪关键词</small><b>'+list.length+'</b></div></div>'+
 '<p class="al-muted">最多保留最近2500条排名快照。位置变化只是观测，不应直接归因于某一次广告调整。</p></div></section>'+
 '<section class="al-panel al-pad"><h2>关键词最近自然排名走势</h2>'+
 (list.length?'<div class="al-tablewrap"><table class="al-table"><thead><tr><th>ASIN</th><th>关键词</th><th>日期</th><th>当前自然位</th><th>上次自然位</th><th>位置变化</th><th>广告位</th><th>记录数</th></tr></thead><tbody>'+
 list.map(function(x){return '<tr><td>'+esc(x.asin)+'</td><td class="al-key"><b>'+esc(x.keyword)+'</b></td><td>'+esc(x.date)+'</td><td>'+f(x.natural,0)+'</td><td>'+f(x.previous,0)+'</td>'+
 '<td>'+((x.delta===null)?'—':(x.delta>0?'↑ 提升 '+x.delta:x.delta<0?'↓ 下降 '+Math.abs(x.delta):'不变'))+'</td><td>'+f(x.ad,0)+'</td><td>'+x.observations+'</td></tr>'}).join('')+'</tbody></table></div>':empty('添加一条关键词排名记录后，将在这里比较最新两次排名。'))+'</section>';
}
async function importRanks(){
 var input=document.getElementById('alRankFile'),file=input&&input.files[0];
 if(!file){notify('请先选择排名CSV或XLSX文件',true);return}
 try{
  var grid;
  if(window.XLSX){var wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});grid=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false})}
  else{
   if(!/\.csv$/i.test(file.name))throw Error('Excel解析组件尚未加载，先用CSV');
   var text=await file.text();grid=text.split(/\r?\n/).map(function(x){return x.split(',').map(function(v){return v.trim().replace(/^"|"$/g,'')})});
  }
  var hdr=(grid[0]||[]).map(function(x){return String(x).replace(/\s/g,'').toLowerCase()});
  function idx(alts){return hdr.findIndex(function(h){return alts.some(function(s){return h===s.toLowerCase()})})}
  var ix={date:idx(['日期','date']),asin:idx(['asin','商品asin']),keyword:idx(['关键词','搜索词','keyword','客户搜索词']),natural:idx(['自然排名','自然位','organicrank','naturalrank']),ad:idx(['广告排名','广告位','广告位置','adrank'])};
  if(ix.date<0||ix.asin<0||ix.keyword<0||ix.natural<0)throw Error('缺少日期、ASIN、关键词或自然排名列，请使用标准模板');
  var count=0;
  grid.slice(1,2502).forEach(function(row){if(rankRecord({date:E.date(row[ix.date]),asin:row[ix.asin],keyword:row[ix.keyword],natural:row[ix.natural],ad:ix.ad<0?'':row[ix.ad],source:file.name}))count++});
  dirty();notify('已导入 '+count+' 条有效排名记录。');
 }catch(e){notify('排名导入失败：'+e.message,true)}
}
function connect(){
 return '<div class="al-grid two"><section class="al-panel al-pad"><h2>数据连接与同步状态</h2>'+
 '<div class="al-connect"><strong>本地 SP/SB 报表解析</strong>'+chip('已支持','ok')+'<p>支持 CSV / Excel 原始报告。本地 IndexedDB 保存，不上传原始广告报表。</p></div>'+
 '<div class="al-connect"><strong>学习记录 / ASIN成本 / 行动计划</strong>'+chip('现有账户登录同步','ok')+'<p>沿用原网站的登录同步逻辑；可导出 JSON 备份。跨设备使用建议先备份再切换。</p></div>'+
 '<div class="al-connect"><strong>领星 API 自动拉取</strong>'+chip('尚未连接')+'<p>需要真实的领星授权、店铺/广告账户标识以及安全的服务端代理。不能把 API 密钥写进 GitHub 公共仓库。</p></div>'+
 '<div class="al-connect"><strong>SIF 自然排名自动获取</strong>'+chip('尚未连接')+'<p>需确定 SIF 官方可用的数据接口、授权与访问范围。目前支持手动记录与报表导入扩展，不能宣称已有实时排名。</p></div>'+
 '</section><section class="al-panel al-pad"><h2>安全与恢复</h2><p class="al-muted">原始广告报表仅在当前浏览器存储；清除浏览器网站数据会删除它们。CSV 结果文件与配置 JSON 可以下载本地备份。</p>'+
 '<div class="al-actions">'+btn('导出配置及任务备份','backupUser','primary')+' '+btn('下载报表清单','exportManifest','soft')+'</div>'+
 '<div class="al-note">自动跨设备同步原始报告、大量广告历史记录，或自动修改亚马逊竞价，需要额外的私有后端、授权、数据库权限和安全审计。当前版本不索取广告账户密码。</div>'+
 '</section></div>';
}
function render(ctx){init(ctx);return '<div class="ads-lab">'+head()+(state.loading?'<div class="al-panel al-pad">正在读取本机广告数据…</div>':
 state.tab==='overview'?overview():state.tab==='import'?importer():state.tab==='terms'?analysis('terms'):state.tab==='placements'?analysis('placements'):
 state.tab==='campaigns'?analysis('campaigns'):state.tab==='products'?products():state.tab==='actions'?actions():state.tab==='practice'?practice():state.tab==='overlap'?overlap():state.tab==='ranks'?ranks():connect())+'</div>'}
function refresh(){if(context)context.refresh()}
function selectedGroup(by,idx){var groups=groupData(by),q=state.q.toLowerCase();if(q)groups=groups.filter(function(g){return g.key.toLowerCase().includes(q)});return groups.slice(0,200)[idx]}
function addAction(a){dataUser().actions.push(a);dirty();notify('已加入优化行动；记得安排复查日期。')}
function actionFromGroup(by,idx){var g=selectedGroup(by,idx);if(!g)return;
 var x={id:'act_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),label:g.key,kind:KN[state.kind]||state.kind,created:stamp(),evidence:g.type+'：'+g.evidence,status:'待验证',recheck:'',notes:'',metrics:{spend:g.spend,clicks:g.clicks,orders:g.orders,acos:g.acos,cpa:g.cpa},source:by};
 addAction(x);
}
function download(name,txt,mime){var b=new Blob([txt],{type:mime||'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500)}
function csv(rows,cols){download('AmazonAds_'+state.kind+'_'+stamp()+'.csv',E.toCSV(rows,cols))}
function analysisExport(by){var rows=groupData(by).map(function(g){return Object.assign({},g,{ctr:pct(g.ctr),cvr:pct(g.cvr),cpc:f(g.cpc),cpa:f(g.cpa),acos:pct(g.acos)})});csv(rows,[['key','分组'],['impressions','曝光'],['clicks','点击'],['spend','花费'],['orders','订单'],['sales','销售额'],['ctr','CTR'],['cvr','CVR'],['cpc','CPC'],['cpa','CPA'],['acos','ACOS'],['type','建议分类'],['confidence','可信度'],['evidence','判断依据']])}
function exportManifest(){
 csv(state.datasets.map(function(d){return {file:d.file,sheet:d.sheet,kind:d.kind,attr:d.attr,rows:d.rows.length,asin:d.asin||'',importedAt:d.importedAt}}),[['file','源文件'],['sheet','报表页'],['kind','报告类型'],['attr','归因口径'],['rows','行数'],['asin','关联ASIN'],['importedAt','导入时间']]);
}
function exportActions(){csv(dataUser().actions,[['created','创建日期'],['label','目标'],['kind','报告类型'],['status','状态'],['evidence','判断依据'],['recheck','复查日期'],['notes','执行复盘']])}
function backupUser(){download('AmazonAds_Lab_Config_'+stamp()+'.json',JSON.stringify({version:1,at:new Date().toISOString(),adsLab:dataUser()},null,2),'application/json')}
function copyReview(){
 var m=E.metric(uniqueRows().rows),t=targets(),s='亚马逊广告运营复盘\n报表类型：'+(KN[state.kind]||'未选择')+'\n归因口径：'+(state.kind.startsWith('sb')?'SB 14天':'SP 7天')+
 '\n分析日期：'+stamp()+'\n广告花费：'+usd(m.spend)+'\n广告销售额：'+usd(m.sales)+'\n订单：'+f(m.orders,0)+'\nACOS：'+pct(m.acos)+'\nCPA：'+usd(m.cpa)+
 '\n目标CPA：'+usd(t.cpa)+'\n优化计划：\n执行后复查日期：\n风险及回滚条件：';
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(function(){state.notice='复盘已复制';refresh()}).catch(function(){window.prompt('复制复盘',s)});
 else window.prompt('复制复盘',s);
}
function confirmAction(message){return window.confirm(message)}
function tab(id){state.tab=id;state.detail='';refresh()}
function handleAction(z){
 var type=z.dataset.al,id=z.dataset.id,asin=z.dataset.asin;
 if(type==='tab'){tab(z.dataset.tab);return}
 if(type==='closeNotice'){state.notice='';state.error='';refresh();return}
 if(type==='resetFilters'){state.asin='all';state.from='';state.to='';state.q='';state.campaign='';refresh();return}
 if(type==='detail'){var group=z.dataset.group,g=selectedGroup(group,Number(z.dataset.idx));state.detail=g?g.key:'';refresh();return}
 if(type==='closeDetail'){state.detail='';refresh();return}
 if(type==='addAction'){actionFromGroup(z.dataset.group,Number(z.dataset.idx));return}
 if(type==='importFiles'){void importFiles();return}
 if(type==='removeDataset'){if(!confirmAction('确认永久删除该浏览器存储的广告报表吗？'))return;
  var before=state.datasets.slice(),d=before.find(function(x){return x.id===id});
  state.datasets=before.filter(function(x){return x.id!==id});E.remove(id).then(function(){state.notice='已删除 '+(d?d.file:'数据');refresh()}).catch(function(e){state.datasets=before;notify('删除失败：'+e.message,true)});refresh();return}
 if(type==='exportManifest'){exportManifest();return}
 if(type==='exportAnalysis'){analysisExport(z.dataset.group);return}
 if(type==='exportActions'){exportActions();return}
 if(type==='backupUser'){backupUser();return}
 if(type==='copyReview'){copyReview();return}
 if(type==='newProduct'){state.productDraft=productEmpty();state.editProduct='';refresh();return}
 if(type==='saveProduct'){saveProduct();return}
 if(type==='editProduct'){var model=productByAsin(asin);state.productDraft=Object.assign({},model);state.editProduct=asin;refresh();return}
 if(type==='useProduct'){state.asin=asin;state.tab='overview';refresh();return}
 if(type==='deleteProduct'){if(!confirmAction('删除该商品的费用模型？已关联的原始报告不会被删除。'))return;dataUser().products=dataUser().products.filter(function(p){return p.asin!==asin});if(state.asin===asin)state.asin='all';dirty();return}
 if(type==='deleteAction'){if(!confirmAction('确认删除这条优化行动记录？'))return;dataUser().actions=dataUser().actions.filter(function(a){return a.id!==id});dirty();return}
 if(type==='saveRevenue'){
 var r=dataUser().revenue;
 if(!(num(r.amount)>0)){notify('营业额必须大于0',true);return}
 if(!r.from||!r.to||r.from>r.to){notify('请选择正确的营业额日期范围',true);return}
 dirty();notify('已保存营业额；请核对广告报告筛选日期与币种。');return;
 }
 if(type==='saveRank'){
 var r={asin:document.getElementById('alRankAsin')?.value,date:document.getElementById('alRankDate')?.value,
  keyword:document.getElementById('alRankKeyword')?.value,natural:document.getElementById('alRankNatural')?.value,
  ad:document.getElementById('alRankAd')?.value,source:document.getElementById('alRankSource')?.value};
 if(!rankRecord(r)){notify('排名记录不完整：请填写10位ASIN、关键词、日期和有效排名',true);return}
 dirty();notify('排名记录已保存');return;
 }
 if(type==='importRanks'){void importRanks();return}
 if(type==='exportRanksTemplate'){download('AmazonAds_自然排名导入模板.csv','\ufeff日期,ASIN,关键词,自然排名,广告排名\r\n','','text/csv;charset=utf-8');return}
 if(type==='exportRanks'){csv(dataUser().ranks,[['date','日期'],['asin','ASIN'],['keyword','关键词'],['natural','自然排名'],['ad','广告排名'],['source','数据来源'],['note','备注']]);return}
 if(type==='manualAction'){addAction({id:'act_'+Date.now(),label:'自定义优化任务',kind:'手动创建',created:stamp(),evidence:'填写需要验证的假设与依据',status:'待验证',recheck:'',notes:''});return}
 if(type==='showAnswer'){state.practiceReveal=true;refresh();return}
 if(type==='nextPractice'){state.practiceIndex++;state.practiceReveal=false;refresh();return}
 if(type==='courseLink'){context.gotoChapter(z.dataset.course);return}
 if(type==='goStudy'){context.gotoStudy();return}
}
function saveProduct(){
 var p=Object.assign({},state.productDraft||productEmpty());
 p.asin=String(p.asin||'').trim().toUpperCase();
 if(!/^[A-Z0-9]{10}$/.test(p.asin)){notify('请输入10位ASIN（英文字母或数字）。',true);return}
 var m=E.products(p);if(!m.valid){notify('至少需要填写售价和有效人民币兑美元汇率。',true);return}
 var a=dataUser().products;
 if(state.editProduct){a=a.filter(function(x){return x.asin!==state.editProduct})}
 if(a.some(function(x){return x.asin===p.asin})){notify('商品库已存在该ASIN，请直接点击编辑。',true);return}
 a.push(p);dataUser().products=a;state.editProduct='';state.productDraft=productEmpty();dirty();notify('商品费用模型已保存；广告诊断可使用此产品的利润边界。');
}
async function readCSVFallback(file){
 var buf=await file.arrayBuffer(),raw=new TextDecoder('utf-8').decode(buf);
 if((raw.match(/\uFFFD/g)||[]).length>5&&window.TextDecoder)try{raw=new TextDecoder('gb18030').decode(buf)}catch(e){}
 return E.fromCSV(raw,file.name);
}
async function parseFile(file){
 if(window.XLSX){
  var buf=await file.arrayBuffer(),w=window.XLSX.read(buf,{type:'array',cellDates:false,raw:false});
  return E.fromWorkbook(w,file.name);
 }
 if(/\.csv$|\.tsv$/i.test(file.name))return readCSVFallback(file);
 throw new Error('Excel解析组件未加载，请确认网络可访问CDN，或先导出CSV报告。');
}
async function importFiles(){
 if(state.importBusy)return;
 var el=document.getElementById('alFiles'),files=Array.from(el&&el.files||[]);
 if(!files.length){notify('请先选择要导入的报表文件。',true);return}
 state.importAsin=document.getElementById('alImportAsin')?.value||'';
 state.uploadMode=document.getElementById('alImportMode')?.value||'replace';
 state.importBusy=true;state.notice='正在本地解析 '+files.length+' 个文件…';refresh();
 var errors=[],imported=0;
 try{
  for(var i=0;i<files.length;i++){
   try{
    var result=await parseFile(files[i]);errors.push.apply(errors,result.warnings||[]);
    for(var n=0;n<result.datasets.length;n++){
      var d=result.datasets[n];
      d.asin=state.importAsin;d.rows.forEach(function(r){r._asin=d.asin||''});
      if(state.uploadMode==='replace'){
        var old=state.datasets.filter(function(a){return a.kind===d.kind});
        for(var k=0;k<old.length;k++){await E.remove(old[k].id);state.datasets=state.datasets.filter(function(x){return x.id!==old[k].id})}
      }
      try{await E.put(d)}catch(e){errors.push('本机数据库保存失败：'+e.message+'；本次数据可能只能临时使用。')}
      state.datasets.push(d);state.kind=d.kind;imported++;
    }
   }catch(e){errors.push(files[i].name+': '+(e.message||e))}
  }
 }finally{state.importBusy=false}
 state.notice='解析完成：'+imported+'份有效报告。'+(errors.length?'注意：'+errors.slice(0,5).join('；'):'');
 state.error=imported===0?'没有有效的广告明细可以分析。':'';
 refresh();
}
document.addEventListener('click',function(e){var z=e.target.closest('[data-al]');if(z&&context){e.preventDefault();handleAction(z)}});
document.addEventListener('change',function(e){
 if(!context)return;var z=e.target;
 if(z.hasAttribute('data-al-input')){
  var field=z.getAttribute('data-al-input');state[field]=z.value;
  if(field==='kind'){state.detail='';state.practiceIndex=0;state.practiceReveal=false}
  refresh();return;
 }
 if(z.hasAttribute('data-al-target')){dataUser().targets[z.getAttribute('data-al-target')]=z.value;dirty();return}
 if(z.hasAttribute('data-al-revenue')){dataUser().revenue[z.getAttribute('data-al-revenue')]=z.value;context.save();return}
 if(z.hasAttribute('data-al-action-field')){
  var field=z.getAttribute('data-al-action-field'),a=dataUser().actions.find(function(a){return a.id===z.dataset.id});
  if(a){a[field]=z.value;context.save();}return;
 }
});
document.addEventListener('input',function(e){
 if(!context)return;var z=e.target;
 if(z.hasAttribute('data-al-product')){if(!state.productDraft)state.productDraft=productEmpty();state.productDraft[z.getAttribute('data-al-product')]=z.value;return}
 if(z.hasAttribute('data-al-action-field')&&z.tagName==='TEXTAREA'){var a=dataUser().actions.find(function(a){return a.id===z.dataset.id});if(a){a[z.getAttribute('data-al-action-field')]=z.value;context.save()}return}
 if(z.getAttribute('data-al-input')==='q'){
  state.q=z.value;clearTimeout(state.searchTimer);state.searchTimer=setTimeout(function(){var pos=z.selectionStart;refresh();var el=document.getElementById('alSearch');if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(e){}}},280);
 }
});
window.AdsLab={render:render,stats:function(){return {reports:state.datasets.length,rows:state.datasets.reduce(function(a,d){return a+d.rows.length},0)}},navigate:function(s){state.tab=s;refresh()}};
})();
