/* Amazon Ads Analytics Engine v1 | Local-only report parsing and metrics */
window.AdsEngine=(function(){
'use strict';
var S = {
date:['日期','报告日期','date','report date','start date'],
portfolio:['广告组合名称','广告组合','portfolio name','portfolio'],
campaign:['广告活动名称','活动名称','campaign name','campaign'],
adgroup:['广告组名称','广告组','ad group name','ad group'],
term:['客户搜索词','搜索词','customer search term','search term','search query'],
target:['投放','定位','targeting','target','keyword'],
match:['匹配类型','match type'],
placement:['放置','广告位','placement','placement name'],
strategy:['竞价策略','bidding strategy'],
country:['国家/地区','country'],
currency:['货币','currency'],
impressions:['展示量','展现量','曝光','impressions'],
clicks:['点击量','点击','clicks'],
spend:['花费','spend','cost'],
sales:['7天总销售额','14天总销售额','总销售额','7 day total sales','14 day total sales','sales'],
orders:['7天总订单数(#)','14天总订单数(#)','7天总订单数','14天总订单数','7 day total orders','14 day total orders','total orders','purchases','orders'],
units:['7天总销售量(#)','14天总销售量(#)','7天总销售量','14天总销售量','units'],
skuSales:['7天内广告sku销售额','advertised sku sales'],
otherSkuSales:['7天内其他sku销售额','other sku sales'],
clickSales:['14 天内总销售额 -（点击）','14天内总销售额-（点击）','14 days total sales (click)','click-attributed sales'],
clickOrders:['14 天内订单总量 (#) -（点击）','14天内订单总量(#)-（点击）','click-attributed orders'],
videoComplete:['完整视频观看次数','video complete'],
videoFive:['5 秒观看次数','5 second views'],
brandSearch:['14 天内品牌搜索量','brand searches'],
newBrandOrders:['14天内“品牌新买家”订单数量(#)','14天品牌新买家订单数','new-to-brand orders'],
newBrandSales:['14天内“品牌新买家”销售额','14天品牌新买家销售额','new-to-brand sales']
};
function normalize(t){return String(t==null?'':t).trim().toLowerCase().replace(/[\s\u00a0（()）_:：#\-—]/g,'').replace(/sku/g,'sku').replace(/\uFEFF/g,'')}
function locate(headers, opts){
 var a=headers.map(normalize), m={};
 Object.keys(S).forEach(function(k){var pos=-1;for(var i=0;i<S[k].length;i++){pos=a.indexOf(normalize(S[k][i]));if(pos>=0)break}if(pos>=0)m[k]=pos});
 return m;
}
function number(v){if(typeof v==='number')return Number.isFinite(v)?v:0;var s=String(v==null?'':v).trim();if(!s||s==='—'||s==='-')return 0;s=s.replace(/[$£€￥¥,%\s,]/g,'');var neg=/^\(.*\)$/.test(s);s=s.replace(/[()]/g,'');var n=Number(s);return Number.isFinite(n)?(neg?-n:n):0}
function date(v){
 if(v===null||v===undefined||v==='')return '';
 function format(y,m,d){
  y=Number(y);m=Number(m);d=Number(d);
  if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1900||y>2100||m<1||m>12||d<1||d>31)return '';
  var t=new Date(Date.UTC(y,m-1,d));
  if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d)return '';
  return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 }
 if(v instanceof Date){return Number.isFinite(v.getTime())?format(v.getUTCFullYear(),v.getUTCMonth()+1,v.getUTCDate()):''}
 // SheetJS may return a serial number or a formatted string for the same Excel date cell.
 var s=String(v).trim().replace(/\uFEFF/g,'');
 if(!s)return '';
 if(/^\d{5}(?:\.\d+)?$/.test(s)&&Number(s)>30000&&Number(s)<100000){
  var t=new Date(Date.UTC(1899,11,30)+Math.floor(Number(s))*86400000);
  return format(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate());
 }
 s=s.replace(/\s+/g,' ').trim();
 // ISO, Chinese, slash and dot-separated year-first dates.
 var m=s.match(/^(\d{4})[-\/.\u5e74](\d{1,2})[-\/.\u6708](\d{1,2})(?:\u65e5)?(?:\b|$|[ T])/);
 if(m)return format(m[1],m[2],m[3]);
 // US Amazon reports commonly use "Sep 05, 2026" or "September 5, 2026".
 var months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
 var en=s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:\b|$)/);
 if(en){var mo=months[en[1].slice(0,3).toLowerCase()];return mo?format(en[3],mo,en[2]):''}
 // Some exports render the day before the English month ("05 Sep 2026").
 en=s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{4})(?:\b|$)/);
 if(en){var mo=months[en[2].slice(0,3).toLowerCase()];return mo?format(en[3],mo,en[1]):''}
 // Digit-first dates: U.S. mm/dd/yyyy unless the first component is >12.
 m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:\b|$)/);
 if(m){var first=Number(m[1]),second=Number(m[2]);return first>12?format(m[3],second,first):format(m[3],first,second)}
 return '';
}
function text(row,idx){return idx===undefined?'':String(row[idx]==null?'':row[idx]).trim()}
function num(row,idx){return idx===undefined?0:number(row[idx])}
function kindFrom(h,name,filename){
 var hs=h.map(normalize).join(' '),s=(name+' '+filename).toLowerCase();
 var b=/品牌推广|品牌广告|sponsored brands|\bsb\b|14天|14day/i.test(s+' '+hs);
 var p=/广告位|放置|placement/.test(s)||h.some(function(x){return /放置|placement/i.test(String(x))});
 return (b?'sb':'sp')+'_'+(p?'placement':'search');
}
function extract(sheetName,matrix,filename){
 var first=-1,map={},headers=[];
 for(var i=0;i<Math.min(18,matrix.length);i++){
  var h=(matrix[i]||[]).map(function(v){return String(v==null?'':v).trim()}),candidate=locate(h);
  if(candidate.campaign!==undefined&&candidate.spend!==undefined&&(candidate.term!==undefined||candidate.placement!==undefined||candidate.target!==undefined||candidate.clicks!==undefined)){
   first=i;map=candidate;headers=h;break;
  }
 }
 if(first<0)return null;
 var kind=kindFrom(headers,sheetName,filename);
 if(kind.endsWith('search')&&map.term===undefined&&map.target===undefined)return null;
 if(kind.endsWith('placement')&&map.placement===undefined)return null;
 var out=[],currencies=new Set(),distinctDates=new Set();
 for(var j=first+1;j<matrix.length;j++){
  var line=matrix[j]||[];
  if(!line.length||!line.some(function(x){return x!==null&&x!==undefined&&x!==''}))continue;
  var campaign=text(line,map.campaign),term=text(line,map.term),p=text(line,map.placement);
  if(/^(总计|grand total|合计)$/i.test(campaign)||/^(总计|grand total|合计)$/i.test(term))continue;
  var spend=num(line,map.spend),impressions=num(line,map.impressions),clicks=num(line,map.clicks),sales=num(line,map.sales),orders=num(line,map.orders);
  if(!(spend||impressions||clicks||sales||orders))continue;
  var currency=text(line,map.currency)||'';
  var d=date(map.date===undefined?'':line[map.date]);
  if(currency)currencies.add(currency);if(d)distinctDates.add(d);
  out.push({
    date:d,rawDate:map.date===undefined?'':String(line[map.date]??''),portfolio:text(line,map.portfolio),campaign:campaign,adgroup:text(line,map.adgroup),
    term:term,target:text(line,map.target),match:text(line,map.match),placement:p,
    strategy:text(line,map.strategy),country:text(line,map.country),currency:currency,
    impressions:impressions,clicks:clicks,spend:spend,sales:sales,orders:orders,units:num(line,map.units),
    skuSales:num(line,map.skuSales),otherSkuSales:num(line,map.otherSkuSales),
    clickSales:num(line,map.clickSales),clickOrders:num(line,map.clickOrders),
    videoComplete:num(line,map.videoComplete),videoFive:num(line,map.videoFive),
    brandSearch:num(line,map.brandSearch),newBrandOrders:num(line,map.newBrandOrders),newBrandSales:num(line,map.newBrandSales)
  });
 }
 return {sheet:sheetName,kind:kind,headers:headers,rows:out,attr:kind.startsWith('sb')?'14天总归因':'7天总归因',currencies:Array.from(currencies),dateCount:distinctDates.size};
}
function fromWorkbook(book,filename){
 var result={datasets:[],warnings:[],recognized:[]};
 (book.SheetNames||[]).forEach(function(name){
  var sheet=book.Sheets[name];if(!sheet)return;
  var matrix=window.XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:false});
  if(/透视表|pivot\s*table/i.test(name)){result.recognized.push(name+'（透视结果页跳过，防止重复计数）');return}
  var found=extract(name,matrix,filename);
  if(!found)return;
  var dates=found.rows.map(function(r){return r.date}).filter(Boolean).sort();
  var range=dates.length?dates[0]+' 至 '+dates[dates.length-1]:'未识别出日期';
  result.recognized.push(name+'（'+found.kind+'，'+found.rows.length+'行，日期：'+range+'）');
  if(!found.rows.length){result.warnings.push(name+'：识别到报表字段，但没有广告明细行。请导入亚马逊后台导出的真实报告。');return}
  if(found.currencies.length>1)result.warnings.push(name+'：检测到多种币种，系统不会进行自动汇率换算。');
  if(found.dateCount===0)result.warnings.push(name+'：缺少可识别日期，无法用于日期对比。原始日期示例：'+String(found.rows.find(function(r){return r.rawDate})?.rawDate||'空白')+'。');
  else {var invalid=found.rows.filter(function(r){return !r.date});
    if(invalid.length)result.warnings.push(name+'：'+invalid.length+'行日期无法识别，其他行可参与日期分析。示例：'+String(invalid[0].rawDate||'空白'))}
  found.file=filename;found.importedAt=new Date().toISOString();
  found.id='ad_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
  result.datasets.push(found);
 });
 if(!result.datasets.length&&!result.warnings.length)result.warnings.push('没有识别到 SP/SB 搜索词或广告位原始报告。请检查是否导入了透视结果页，而不是原始报告。');
 return result;
}
function fromCSV(raw,filename){
 var lines=[],row=[],cur='',quotes=false;
 for(var i=0;i<raw.length;i++){var c=raw[i];
  if(quotes){if(c==='"'&&raw[i+1]==='"'){cur+='"';i++}else if(c==='"')quotes=false;else cur+=c}
  else if(c==='"')quotes=true;
  else if(c===','||c==='\t'){row.push(cur);cur=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cur);lines.push(row);row=[];cur=''}
  else cur+=c;
 }
 if(cur||row.length){row.push(cur);lines.push(row)}
 var f=extract(filename,lines,filename);
 return {datasets:f&&f.rows.length?[Object.assign(f,{id:'ad_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),file:filename,importedAt:new Date().toISOString()})]:[],
  warnings:f?(f.rows.length?[]:['报告只有表头，没有可分析的数据行']):['无法识别报告字段'],recognized:f?[filename+'（'+f.kind+'）']:[]};
}
function sum(rows){return rows.reduce(function(o,r){['spend','sales','clicks','impressions','orders','units','skuSales','otherSkuSales','clickSales','clickOrders','videoComplete','videoFive','newBrandOrders','newBrandSales','brandSearch'].forEach(function(k){o[k]=(o[k]||0)+(Number(r[k])||0)});return o},{})}
function div(a,b){return b>0?a/b:null}
function metric(x){var s=sum(x),den=Object.assign({},s,{ctr:div(s.clicks,s.impressions),cvr:div(s.orders,s.clicks),cpc:div(s.spend,s.clicks),cpa:div(s.spend,s.orders),acos:div(s.spend,s.sales),roas:div(s.sales,s.spend)});return den}
function group(rows,by){
 var map=new Map();
 rows.forEach(function(r){
  var k=by==='search'?(r.term||r.target||'（无搜索词）'):by==='placement'?(r.placement||'（未注明广告位）'):by==='daily'?(r.date||'无日期'):(r.campaign||'（未注明活动）');
  if(!map.has(k))map.set(k,[]);map.get(k).push(r);
 });
 return Array.from(map.entries()).map(function(p){var m=metric(p[1]);return Object.assign({key:p[0],rows:p[1].length},m)}).sort(function(a,b){return b.spend-a.spend});
}
function unique(rows){
 // Deduplicate overlapping daily report snapshots, never combine search and placement views.
 var keys=new Map(),duplicates=0,ambiguous=0;
 rows.forEach(function(r,i){
  var k=[r.date,r.country,r.portfolio,r.campaign,r.adgroup,r.term,r.target,r.match,r.placement,r.currency,r._asin].join('\u0001');
  if(!r.date){k+='\u0001unknown_'+i;ambiguous++}
  if(keys.has(k))duplicates++;
  keys.set(k,r);
 });
 return {rows:Array.from(keys.values()),duplicates:duplicates,undated:ambiguous};
}
function products(p){
 var price=number(p.price),fx=number(p.fx)||0,proc=number(p.procure),freight=number(p.freight),otherRMB=number(p.otherRMB),fba=number(p.fba),
 commission=number(p.commission)/100,returns=number(p.returns)/100,discount=number(p.discount)/100,
 other=number(p.other),target=number(p.target)/100;
 var valid=price>0&&fx>0,base=valid?price*(1-commission-returns-discount)-(proc+freight+otherRMB)/fx-fba-other:null;
 return {valid:valid,contribution:base,breakEvenCPA:base,breakEvenACOS:valid?base/price:null,targetCPA:valid?base-price*target:null,targetACOS:valid?(base/price-target):null};
}
function decision(m,cpaTarget,acosTarget){
 if(cpaTarget===null||cpaTarget===undefined||!Number.isFinite(cpaTarget)||cpaTarget<=0)return {type:'待设利润目标',rank:4,evidence:'请先设定目标 CPA；不使用固定的行业阈值替代你的实际利润。',confidence:'未评估'};
 var clicks=m.clicks||0,orders=m.orders||0,spend=m.spend||0, cpa=m.cpa, ac=m.acos;
 var baseSamples=clicks>=30||orders>=3,high=orders>=5&&clicks>=50;
 var conf=high?'较高':baseSamples?'中等':'较低';
 if(orders>=3&&cpa!==null&&cpa<=cpaTarget&&(!Number.isFinite(acosTarget)||acosTarget<=0||ac===null||ac<=acosTarget*1.1))
  return {type:'优先评估放量',rank:1,evidence:'已有多笔订单，CPA='+cpa.toFixed(2)+'，不高于目标 '+cpaTarget.toFixed(2)+'；仍需核对利润、库存与边际表现。',confidence:conf};
 if((orders===0&&clicks>=15&&spend>=cpaTarget*1.5)||(orders>0&&clicks>=20&&cpa!==null&&cpa>cpaTarget*1.6&&spend>=cpaTarget*2))
  return {type:'高消耗待核查',rank:2,evidence:'当前消耗相对目标 CPA 较高，先核查相关性、归因滞后和周期，再考虑降价、暂停或否定。',confidence:conf};
 if(orders>=1&&cpa!==null&&cpa<=cpaTarget*1.3)
  return {type:'潜力待验证',rank:3,evidence:'已产生订单，CPA接近目标，继续检查相关性、更多样本及竞价空间。',confidence:conf};
 return {type:'继续观察',rank:4,evidence:'数据尚不足以判断是否放量或否定；应结合搜索意图、样本和归因窗口。',confidence:conf};
}
function report(rows,groupBy,opts){
 opts=opts||{};
 var r=group(rows,groupBy).map(function(g){
  var d=decision(g,opts.targetCPA,opts.targetACOS);
  return Object.assign(g,d);
 });
 return r;
}
function csvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'}
function toCSV(rows,columns){
 return '\ufeff'+[columns.map(function(c){return csvCell(c[1])}).join(',')].concat(rows.map(function(r){return columns.map(function(c){return csvCell(r[c[0]])}).join(',')})).join('\r\n');
}
var db=null;
function openDB(){
 if(!window.indexedDB)return Promise.reject(new Error('浏览器禁用了本地数据库'));
 if(db)return Promise.resolve(db);
 return new Promise(function(resolve,reject){
  var req=window.indexedDB.open('amazon-ads-lab-v1',1);
  req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains('reports'))d.createObjectStore('reports',{keyPath:'id'})};
  req.onsuccess=function(){db=req.result;resolve(db)};req.onerror=function(){reject(req.error||new Error('IndexedDB错误'))};
 });
}
function transaction(mode,fn){
 return openDB().then(function(d){return new Promise(function(resolve,reject){
  var tr=d.transaction('reports',mode),st=tr.objectStore('reports');
  var req=fn(st);
  req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)};
  tr.onerror=function(){reject(tr.error)};
 })});
}
function load(){return transaction('readonly',function(store){return store.getAll()})}
function put(d){return transaction('readwrite',function(store){return store.put(d)})}
function remove(id){return transaction('readwrite',function(store){return store.delete(id)})}
return {fromWorkbook:fromWorkbook,fromCSV:fromCSV,extract:extract,locate:locate,number:number,date:date,metric:metric,group:group,unique:unique,products:products,decision:decision,report:report,toCSV:toCSV,load:load,put:put,remove:remove};
})();
