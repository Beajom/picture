// Packaging-material purchase orders are separate from finished-goods purchase orders.
// Inventory changes only upon an explicit, auditable receiving action.
const resp=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
const number=(v)=>Number.isFinite(Number(v))?Number(v):0;
const rows=async(db,sql,...params)=>(await db.prepare(sql).bind(...params).all()).results||[];
const first=async(db,sql,...params)=>await db.prepare(sql).bind(...params).first();
const validDate=(s)=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const shortText=(s,max=5000)=>String(s??"").trim().slice(0,max);
const finiteNonneg=(n)=>Number.isFinite(Number(n))&&Number(n)>=0;

async function ensureTables(db){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS material_purchase_orders(id TEXT PRIMARY KEY,order_no TEXT NOT NULL UNIQUE,supplier_id TEXT NOT NULL,order_date TEXT NOT NULL,delivery_date TEXT,delivery_address TEXT NOT NULL DEFAULT '',payment_terms TEXT NOT NULL DEFAULT '',quality_terms TEXT NOT NULL DEFAULT '',packaging_terms TEXT NOT NULL DEFAULT '',other_terms TEXT NOT NULL DEFAULT '',shipping_fee REAL NOT NULL DEFAULT 0,sign_location TEXT NOT NULL DEFAULT '浙江义乌',buyer_company TEXT NOT NULL DEFAULT '义乌市时盈电子商务有限公司',status TEXT NOT NULL DEFAULT '已下单',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS material_purchase_order_items(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES material_purchase_orders(id) ON DELETE CASCADE,material_id TEXT NOT NULL REFERENCES materials(id),quantity INTEGER NOT NULL,received_qty INTEGER NOT NULL DEFAULT 0,unit_price REAL NOT NULL DEFAULT 0,material_grade TEXT NOT NULL DEFAULT '',material_spec TEXT NOT NULL DEFAULT '',remarks TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_material_po_items_order ON material_purchase_order_items(order_id)")
  ]);
}
async function detail(db,id){
  const order=await first(db,"SELECT o.*,s.company_name supplier_name,s.company_address supplier_address,s.contact_name supplier_contact,s.phone supplier_phone,s.bank_name supplier_bank,s.bank_account supplier_account FROM material_purchase_orders o LEFT JOIN suppliers s ON s.id=o.supplier_id WHERE o.id=?",id);
  if(!order)return null;
  const items=await rows(db,"SELECT i.*,m.material_code,m.name material_name,m.unit,m.applicable_model,m.image_url,m.current_stock,(SELECT ir.public_url FROM image_refs ir WHERE ir.material_id=m.id AND ir.public_url IS NOT NULL ORDER BY ir.created_at DESC LIMIT 1) resolved_image_url FROM material_purchase_order_items i LEFT JOIN materials m ON m.id=i.material_id WHERE i.order_id=? ORDER BY i.rowid",id);
  const subtotal=items.reduce((sum,x)=>sum+number(x.quantity)*number(x.unit_price),0);
  return {...order,items,subtotal,total:subtotal+number(order.shipping_fee)};
}
export async function materialPurchaseHandler({request,env,path,method}){
  try{
    await ensureTables(env.DB);
    if(path==="/material-purchase-orders"&&method==="GET"){
      const list=await rows(env.DB,"SELECT o.*,s.company_name supplier_name,COUNT(i.id) line_count,COALESCE(SUM(i.quantity),0) total_qty,COALESCE(SUM(i.quantity*i.unit_price),0)+o.shipping_fee total_amount,COALESCE(SUM(i.received_qty),0) received_qty FROM material_purchase_orders o LEFT JOIN suppliers s ON s.id=o.supplier_id LEFT JOIN material_purchase_order_items i ON i.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 300");
      return resp({orders:list});
    }
    if(path==="/material-purchase-orders"&&method==="POST"){
      const d=await request.json();
      const no=shortText(d.order_no,80),date=shortText(d.order_date,10);
      if(!no||!validDate(date))return resp({error:"请填写采购单号和有效下单日期"},400);
      const supplier=await first(env.DB,"SELECT id FROM suppliers WHERE id=?",shortText(d.supplier_id,100));
      if(!supplier)return resp({error:"请选择已保存的供应商"},400);
      const items=Array.isArray(d.items)?d.items:[];
      if(!items.length||items.length>40)return resp({error:"请选择1至40项包材"},400);
      const inserts=[];
      for(const it of items){
        const mat=await first(env.DB,"SELECT id FROM materials WHERE id=?",shortText(it.material_id,100));
        if(!mat)return resp({error:"包材不存在，请刷新列表"},400);
        const qty=Number(it.quantity),price=Number(it.unit_price);
        if(!Number.isInteger(qty)||qty<=0||!finiteNonneg(price))return resp({error:"包材数量应为正整数，价格不能为负数"},400);
        inserts.push({mat:mat.id,qty,price,grade:shortText(it.material_grade,200),spec:shortText(it.material_spec,300),remark:shortText(it.remarks,300)});
      }
      const ship=Number(d.shipping_fee||0);if(!finiteNonneg(ship))return resp({error:"运费不能为负数"},400);
      const id=crypto.randomUUID();
      const orderDate=validDate(d.delivery_date)?String(d.delivery_date):null;
      const statement=env.DB.prepare("INSERT INTO material_purchase_orders(id,order_no,supplier_id,order_date,delivery_date,delivery_address,payment_terms,quality_terms,packaging_terms,other_terms,shipping_fee,sign_location,buyer_company,status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'已下单',?)").bind(
        id,no,supplier.id,date,orderDate,shortText(d.delivery_address,1000),shortText(d.payment_terms,2000),shortText(d.quality_terms,2000),shortText(d.packaging_terms,2000),shortText(d.other_terms,3000),ship,shortText(d.sign_location,100)||"浙江义乌",shortText(d.buyer_company,150)||"义乌市时盈电子商务有限公司",shortText(d.notes,1000)
      );
      await env.DB.batch([statement,...inserts.map(it=>env.DB.prepare("INSERT INTO material_purchase_order_items(id,order_id,material_id,quantity,unit_price,material_grade,material_spec,remarks) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,it.mat,it.qty,it.price,it.grade,it.spec,it.remark))]);
      return resp({ok:true,order:await detail(env.DB,id)},201);
    }
    const m=path.match(/^\/material-purchase-orders\/([^/]+)(?:\/(contract|receive))?$/);
    if(m){
      const id=m[1],action=m[2];
      if(method==="GET"&&!action){const result=await detail(env.DB,id);return result?resp({order:result}):resp({error:"采购单不存在"},404)}
      const order=await first(env.DB,"SELECT * FROM material_purchase_orders WHERE id=?",id);
      if(!order)return resp({error:"采购单不存在"},404);
      if(method==="PUT"&&action==="contract"){
        const d=await request.json();
        await env.DB.prepare("UPDATE material_purchase_orders SET delivery_date=?,delivery_address=?,payment_terms=?,quality_terms=?,packaging_terms=?,other_terms=?,sign_location=?,buyer_company=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
          validDate(d.delivery_date)?d.delivery_date:null,shortText(d.delivery_address,1000),shortText(d.payment_terms,2000),shortText(d.quality_terms,2000),shortText(d.packaging_terms,2000),shortText(d.other_terms,3000),shortText(d.sign_location,100)||"浙江义乌",shortText(d.buyer_company,150)||"义乌市时盈电子商务有限公司",shortText(d.notes,1000),id
        ).run();
        return resp({ok:true,order:await detail(env.DB,id)});
      }
      if(method==="POST"&&action==="receive"){
        const d=await request.json();
        const incoming=Array.isArray(d.items)?d.items:[];
        if(!incoming.length)return resp({error:"请选择需要入库的包材数量"},400);
        const prior=await detail(env.DB,id), byId=new Map(prior.items.map(x=>[x.id,x]));
        const toReceive=new Map();
        for(const it of incoming){
          const item=byId.get(String(it.id||"")),count=Number(it.quantity);
          if(!item||!Number.isInteger(count)||count<=0||toReceive.has(item.id)||count>number(item.quantity)-number(item.received_qty))return resp({error:"入库数量有误或超过剩余未到货数量，请刷新后重试"},400);
          toReceive.set(item.id,{item,count});
        }
        const batch=[];
        for(const {item,count} of toReceive.values()){
          const balance=number(item.current_stock)+count;
          batch.push(env.DB.prepare("UPDATE material_purchase_order_items SET received_qty=received_qty+? WHERE id=? AND received_qty+?<=quantity").bind(count,item.id,count));
          batch.push(env.DB.prepare("UPDATE materials SET current_stock=current_stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(count,item.material_id));
          batch.push(env.DB.prepare("INSERT INTO material_movements(id,material_id,purchase_order_id,movement_type,qty_change,balance_after,reference_no,notes) VALUES(?,?,NULL,'包材采购入库',?,?,?,?)").bind(crypto.randomUUID(),item.material_id,count,balance,order.order_no,shortText(d.notes,500)||"包材采购到货入库"));
        }
        await env.DB.batch(batch);
        const updated=await detail(env.DB,id);
        const full=updated.items.every(x=>number(x.received_qty)>=number(x.quantity));
        await env.DB.prepare("UPDATE material_purchase_orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(full?"已入库":"部分到货",id).run();
        return resp({ok:true,order:await detail(env.DB,id)});
      }
    }
    return resp({error:"Not found"},404);
  }catch(e){return resp({error:String(e&&e.message||e)},400)}
}
