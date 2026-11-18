// One-time, user-authorized inventory reconciliation for 2026-11-18.
// Before applying changes, validates all referenced SKUs and snapshots quantity differences.
// Repeat-safe: compares current quantity with the stated target before writing any ledger entry.
import {writeFile} from 'node:fs/promises';
const API='https://amazon-supply-workbench-free.chongyu0502.workers.dev/api';
const TARGET={
  '3036':{
    '肤色':{S:2400,M:0,L:5200,XL:3000,'2XL':400},
    '黑色':{S:400,M:400,L:400,XL:500,'2XL':400}
  },
  '3037':{
    '肤色':{S:0,M:200,L:0,XL:0},
    '黑色':{S:640,M:200,L:840,XL:600}
  },
  '1697':{
    '肤色':{S:1300,M:4600,L:4200,XL:3100,'2XL':1000},
    '黑色':{S:1800,M:2000,L:1400,XL:800,'2XL':1000}
  }
};
const PARENTS={'3036':'B0927KVX9K','3037':'B08BWZRMYJ','1697':'B0D45D9TWK'};
async function request(path,method='GET',body=null){
  const r=await fetch(API+path+(method==='GET'?'?ts='+Date.now():''),{
    method,headers:{'content-type':'application/json','cache-control':'no-store'},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const raw=await r.text();let data={};
  try{data=JSON.parse(raw)}catch{}
  if(!r.ok)throw new Error(method+' '+path+' HTTP '+r.status+' '+raw.slice(0,600));
  return data;
}
const initial=await request('/bootstrap');
const products=initial.products||[],inventory=initial.inventory||[];
const inv=new Map(inventory.map(x=>[x.product_id,x]));
const changes=[],seen=new Set();
const totals={};let expectedAll=0,actualAll=0;
for(const [model,colors] of Object.entries(TARGET)){
  let before=0,expected=0;
  const relevant=products.filter(p=>p.parent_asin===PARENTS[model]);
  for(const [color,sizes] of Object.entries(colors))for(const [size,target] of Object.entries(sizes)){
    const matches=relevant.filter(p=>p.color===color&&String(p.size).toUpperCase()===size.toUpperCase());
    if(matches.length!==1)throw new Error('Aborting without writes: expected exactly one '+model+' '+color+' '+size+' product, got '+matches.length);
    const p=matches[0],stock=inv.get(p.id);
    if(!stock)throw new Error('Aborting without writes: missing inventory row for '+p.sku);
    const beforeQty=Number(stock.available_qty||0);
    if(!Number.isInteger(beforeQty)||beforeQty<0)throw new Error('Invalid starting quantity for '+p.sku);
    const id=p.id;seen.add(id);
    before+=beforeQty;expected+=target;
    changes.push({model,color,size,sku:p.sku,product_id:id,before:beforeQty,target,delta:target-beforeQty});
  }
  const extra=relevant.filter(p=>!seen.has(p.id)).map(p=>({sku:p.sku,color:p.color,size:p.size,qty:Number(inv.get(p.id)?.available_qty||0)}));
  const activeExtra=extra.filter(x=>x.qty>0);
  if(activeExtra.length)throw new Error('Aborting without writes: non-target variant stock must be reviewed before reconciliation '+model+': '+JSON.stringify(activeExtra));
  totals[model]={before,expected,extra_rows:extra.length};
  expectedAll+=expected;actualAll+=before;
}
if(expectedAll!==36780)throw new Error('Unexpected approved target total: '+expectedAll);
if(actualAll!== (initial.inventory||[]).reduce((n,row)=>n+Number(row.available_qty||0),0)){
  throw new Error('Aborting without writes: inventory contains additional stock outside the three confirmed parent models');
}
console.log('READ_ONLY_PREFLIGHT',JSON.stringify({totals,expectedAll,actualAll,changes:changes.filter(x=>x.delta!==0).length}));
await writeFile('/tmp/stock-reconciliation-20261118.json',JSON.stringify({verified_at:new Date().toISOString(),totals,changes},null,2),'utf8');
if(process.env.APPLY_STOCK_RECONCILIATION!=='yes'){
  console.log('READ_ONLY_MODE: no quantity changes applied');process.exit(0);
}
for(const change of changes){
  if(!change.delta)continue;
  const result=await request('/inventory/adjust','POST',{
    product_id:change.product_id,qty_change:change.delta,
    business_type:'人工盘点校正',notes:'依据2026-11-18用户确认的尺码库存盘点表校正；原数量 '+change.before+'，目标数量 '+change.target
  });
  if(Number(result.balance_after)!==change.target)throw new Error('Balance mismatch after '+change.sku+': '+result.balance_after+' expected '+change.target);
  console.log('ADJUSTED '+change.model+' '+change.color+' '+change.size+' '+change.before+' -> '+change.target+' ('+(change.delta>=0?'+':'')+change.delta+')');
}
const final=await request('/bootstrap');
const newInv=new Map((final.inventory||[]).map(x=>[x.product_id,Number(x.available_qty||0)]));
for(const ch of changes){
  const got=newInv.get(ch.product_id);
  if(got!==ch.target)throw new Error('Postcondition failed: '+ch.sku+' expected '+ch.target+' got '+got);
}
const finalTotal=(final.inventory||[]).reduce((n,row)=>n+Number(row.available_qty||0),0);
if(finalTotal!==36780)throw new Error('Final all-stock total mismatch '+finalTotal);
const finalGroups={};
for(const ch of changes){finalGroups[ch.model]??={};finalGroups[ch.model][ch.color]=(finalGroups[ch.model][ch.color]||0)+ch.target}
console.log('RECONCILIATION_VERIFIED',JSON.stringify({grand_total:finalTotal,groups:finalGroups,changed:changes.filter(x=>x.delta!==0).length}));
