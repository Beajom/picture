const BASE="https://amazon-supply-workbench-free.chongyu0502.workers.dev";

async function api(path,opt={}){
  const r=await fetch(BASE+"/api"+path,{headers:{"content-type":"application/json"},...opt});
  const t=await r.text();
  let j={}; try{j=JSON.parse(t)}catch{}
  if(!r.ok) throw new Error(path+" failed: "+r.status+" "+t);
  return j;
}

const target = {
  "肤色": {S:0,M:200,L:0,XL:0},
  "黑色": {S:640,M:200,L:840,XL:600}
};

const data=await api("/bootstrap?ts="+Date.now());
const products=(data.products||[]).filter(p=>String(p.parent_asin||"")==="B08BWZRMYJ");
const inv=new Map((data.inventory||[]).map(x=>[x.product_id,Number(x.available_qty||0)]));

let changed=[];
for(const [color,sizes] of Object.entries(target)){
  for(const [size,want] of Object.entries(sizes)){
    const p=products.find(x=>String(x.color||"")===color&&String(x.size||"").toUpperCase()===size);
    if(!p) throw new Error("Missing 3037 "+color+" "+size);
    const have=inv.get(p.id)||0;
    const delta=want-have;
    if(delta!==0){
      await api("/inventory/adjust",{method:"POST",body:JSON.stringify({
        product_id:p.id,
        qty_change:delta,
        business_type:"库存校正",
        notes:"恢复3037已确认库存；仅修正本SKU，不影响其他型号"
      })});
      changed.push({color,size,sku:p.sku,from:have,to:want,delta});
    }
  }
}

const after=await api("/bootstrap?ts="+Date.now());
const p3037=(after.products||[]).filter(p=>String(p.parent_asin||"")==="B08BWZRMYJ");
const inv2=new Map((after.inventory||[]).map(x=>[x.product_id,Number(x.available_qty||0)]));
const rows=p3037.map(p=>({color:p.color,size:p.size,sku:p.sku,qty:inv2.get(p.id)||0}));
const total=rows.reduce((s,x)=>s+x.qty,0);
console.log("CHANGED",JSON.stringify(changed));
console.log("3037",JSON.stringify(rows));
console.log("TOTAL",total);
if(total!==2480) throw new Error("3037 total verification failed: "+total);
