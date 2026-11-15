/* Amazon Ads Academy · ASIN master and portfolio matching, no raw data in public source */
window.AdsAsin=(function(){
'use strict';
function norm(x){return String(x==null?'':x).trim().replace(/\s+/g,'').toLowerCase()}
function number(x){if(x==null||x==='')return null;var n=Number(String(x).replace(/[,￥¥$]/g,''));return Number.isFinite(n)?n:null}
function cell(row,i){return i<0?'':String(row&&row[i]!=null?row[i]:'').trim()}
function groupCode(s){
 var match=String(s||'').trim().match(/^(\d{4})(?=$|[-_\s]|[^\d])/);
 return match?match[1]:'';
}
function parse(book,XLSX){
 var products=[],warnings=[],recognized=[],seen=new Set(),skipped=0,possible=0;
 var required=['父ASIN','子ASIN','内部编码','商品名称','单件采购成本RMB','单件头程成本RMB','单件其他成本RMB','单件总成本RMB'];
 (book.SheetNames||[]).forEach(function(name){
  var sheet=book.Sheets[name];if(!sheet)return;
  var grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:false});
  var headerAt=-1,heads=[];
  for(var i=0;i<Math.min(12,grid.length);i++){
    var cols=(grid[i]||[]).map(norm);
    if(cols.includes(norm('子ASIN'))&&cols.includes(norm('父ASIN'))&&cols.includes(norm('内部编码'))){headerAt=i;heads=cols;break}
  }
  if(headerAt<0)return;
  possible++;
  var ix={};required.concat(['父SKU','子SKU','图片文件名','产品类目','颜色','尺码','备注']).forEach(function(n){ix[n]=heads.indexOf(norm(n))});
  recognized.push(name+'（ASIN商品资料）');
  for(var j=headerAt+1;j<grid.length;j++){
    var row=grid[j]||[],asin=cell(row,ix['子ASIN']).toUpperCase(),parent=cell(row,ix['父ASIN']).toUpperCase();
    if(!asin&&!parent)continue;
    if(!/^[A-Z0-9]{10}$/.test(asin)||!/^[A-Z0-9]{10}$/.test(parent)){skipped++;continue}
    if(seen.has(asin)){warnings.push('重复子ASIN '+asin+'，忽略后面的重复行');skipped++;continue}
    seen.add(asin);
    var internal=cell(row,ix['内部编码']),code=groupCode(internal);
    if(!code)warnings.push(asin+' 未找到4位内部产品系列编码，只能使用ASIN/SKU关联');
    var procure=number(cell(row,ix['单件采购成本RMB']));
    var freight=number(cell(row,ix['单件头程成本RMB']));
    var otherRMB=number(cell(row,ix['单件其他成本RMB']));
    var totalRMB=number(cell(row,ix['单件总成本RMB']));
    var calcTotal=(procure||0)+(freight||0)+(otherRMB||0);
    if(totalRMB!==null&&Math.abs(totalRMB-calcTotal)>.021){
      warnings.push(asin+' 成本核对不一致：表内总成本 '+totalRMB+'，各项合计 '+calcTotal.toFixed(2)+'，请检查原表');
    }
    products.push({
      asin:asin,parentAsin:parent,internal:internal,code:code,parentSKU:cell(row,ix['父SKU']),
      sku:cell(row,ix['子SKU']),name:cell(row,ix['商品名称']),imageFile:cell(row,ix['图片文件名']),
      category:cell(row,ix['产品类目']),color:cell(row,ix['颜色']),size:cell(row,ix['尺码']),
      remark:cell(row,ix['备注']),procure:procure===null?'':procure,freight:freight===null?'':freight,
      otherRMB:otherRMB===null?'':otherRMB,totalRMB:totalRMB===null?'':totalRMB,
      source:'ASIN基础资料',costVerified:totalRMB!==null&&Math.abs(totalRMB-calcTotal)<=.021
    });
  }
 });
 if(possible===0)return {recognized:false,products:[],warnings:[],skipped:0};
 if(!products.length)warnings.push('识别到ASIN表格，但未找到有效的子ASIN资料。');
 return {recognized:true,products:products,warnings:warnings,skipped:skipped,sheets:recognized};
}
function merge(existing,incoming){
 var map=new Map(),added=0,updated=0;
 (existing||[]).forEach(function(p){if(p&&p.asin)map.set(p.asin,Object.assign({},p))});
 (incoming||[]).forEach(function(x){
  var old=map.get(x.asin)||{},was=map.has(x.asin);
  var preserve=['price','fx','fba','commission','returns','discount','other','target','inventory','notes'];
  var p=Object.assign({},old,x);
  preserve.forEach(function(k){if(old[k]!==undefined&&old[k]!==null&&old[k]!=='')p[k]=old[k]});
  map.set(x.asin,p);if(was)updated++;else added++;
 });
 return {products:Array.from(map.values()),added:added,updated:updated};
}
function families(products){
 var m=new Map();
 (products||[]).forEach(function(p){
   var code=p.code||groupCode(p.internal),parent=p.parentAsin||'';
   if(!code)return;
   if(!m.has(code))m.set(code,{code:code,products:[],parents:new Set(),names:new Set()});
   var v=m.get(code);v.products.push(p);if(parent)v.parents.add(parent);if(p.name)v.names.add(p.name);
 });
 return Array.from(m.values()).map(function(x){return {code:x.code,products:x.products,parents:Array.from(x.parents),names:Array.from(x.names),count:x.products.length}}).sort(function(a,b){return a.code.localeCompare(b.code)});
}
function categoryForPortfolio(portfolio,products){
 var code=groupCode(portfolio),match=families(products).find(function(x){return x.code===code});
 return {portfolio:portfolio||'',code:code,family:match||null,status:match?'product-family-only':'unmatched'};
}
function coverage(products,datasets){
 var unique=new Map(),fl=families(products),fm=new Map(fl.map(function(x){return [x.code,x]}));
 (datasets||[]).filter(function(d){return !/^DEMO_/.test(d.file||'')}).forEach(function(d){
  var byPortfolio=new Map();
  (d.rows||[]).forEach(function(r){
   var portfolio=String(r.portfolio||'').trim()||'（未填写广告组合）';
   if(!byPortfolio.has(portfolio))byPortfolio.set(portfolio,{rows:0,spend:0,sales:0,orders:0,earliest:'',latest:''});
   var a=byPortfolio.get(portfolio);a.rows++;a.spend+=Number(r.spend)||0;a.sales+=Number(r.sales)||0;a.orders+=Number(r.orders)||0;
   if(r.date){if(!a.earliest||r.date<a.earliest)a.earliest=r.date;if(!a.latest||r.date>a.latest)a.latest=r.date}
  });
  byPortfolio.forEach(function(m,portfolio){
   var code=groupCode(portfolio),key=d.id+'|'+portfolio,match=fm.get(code);
   unique.set(key,{
    dataset:d.kind,filename:d.file,portfolio:portfolio,code:code,matched:!!match,
    parentAsins:match?match.parents:[],children:match?match.count:0,
    rows:m.rows,spend:m.spend,sales:m.sales,orders:m.orders,earliest:m.earliest,latest:m.latest
   });
  });
 });
 return Array.from(unique.values()).sort(function(a,b){return (a.dataset+'|'+a.code).localeCompare(b.dataset+'|'+b.code)});
}
return {parse:parse,merge:merge,groupCode:groupCode,families:families,categoryForPortfolio:categoryForPortfolio,coverage:coverage};
})();
