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
    db.prepare("CREATE INDEX IF NOT EXISTS idx_material_po_items_order ON material_purchase_order_items(order_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS material_receipt_requests(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES material_purchase_orders(id),received_total INTEGER NOT NULL,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    // Database-level guard: a simultaneous receive or contract edit must never over-receive.
    db.prepare("CREATE TRIGGER IF NOT EXISTS trg_material_po_received_guard BEFORE UPDATE OF received_qty,quantity ON material_purchase_order_items WHEN NEW.received_qty < 0 OR NEW.received_qty > NEW.quantity BEGIN SELECT RAISE(ABORT,'received quantity exceeds ordered quantity'); END")
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
        const batch=[env.DB.prepare("UPDATE material_purchase_orders SET delivery_date=?,delivery_address=?,payment_terms=?,quality_terms=?,packaging_terms=?,other_terms=?,sign_location=?,buyer_company=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
          validDate(d.delivery_date)?d.delivery_date:null,shortText(d.delivery_address,1000),shortText(d.payment_terms,2000),shortText(d.quality_terms,2000),shortText(d.packaging_terms,2000),shortText(d.other_terms,3000),shortText(d.sign_location,100)||"浙江义乌",shortText(d.buyer_company,150)||"义乌市时盈电子商务有限公司",shortText(d.notes,1000),id
        )];
        if(Array.isArray(d.items)){
          const old=await detail(env.DB,id),items=new Map(old.items.map(x=>[x.id,x]));
          if(d.items.length!==items.size)return resp({error:"合同商品行数与采购单不一致"},400);
          const visited=new Set();
          for(const it of d.items){
            const prev=items.get(String(it.id||"")),qty=Number(it.quantity),price=Number(it.unit_price);
            if(!prev||visited.has(prev.id)||!Number.isInteger(qty)||qty<=0||qty<number(prev.received_qty)||!finiteNonneg(price))return resp({error:"合同数量或价格有误，或小于已入库数量"},400);
            visited.add(prev.id);
            batch.push(env.DB.prepare("UPDATE material_purchase_order_items SET quantity=?,unit_price=?,material_grade=?,material_spec=?,remarks=? WHERE id=? AND order_id=?").bind(
              qty,price,shortText(it.material_grade,200),shortText(it.material_spec,300),shortText(it.remarks,300),prev.id,id
            ));
          }
        }
        await env.DB.batch(batch);
        return resp({ok:true,order:await detail(env.DB,id)});
      }
      if(method==="POST"&&action==="receive"){
        const d=await request.json();
        const incoming=Array.isArray(d.items)?d.items:[];
        if(!incoming.length||incoming.length>40)return resp({error:"请选择1至40项需要入库的包材"},400);
        // Each client submission carries a stable UUID. A retry cannot be counted twice.
        const requestId=shortText(d.request_id||crypto.randomUUID(),100);
        if(!/^[a-zA-Z0-9-]{8,100}$/.test(requestId))return resp({error:"收货请求编号格式不正确"},400);
        if(await first(env.DB,"SELECT id FROM material_receipt_requests WHERE id=?",requestId))return resp({error:"该收货请求已处理，请刷新采购单核对库存和流水"},409);
        const prior=await detail(env.DB,id),byId=new Map(prior.items.map(x=>[x.id,x]));
        const toReceive=new Map();
        for(const it of incoming){
          const item=byId.get(String(it.id||"")),count=Number(it.quantity);
          if(!item||!Number.isSafeInteger(count)||count<=0||toReceive.has(item.id)||count>number(item.quantity)-number(item.received_qty))return resp({error:"入库数量有误或超过剩余未到货数量，请刷新后重试"},400);
          toReceive.set(item.id,{item,count});
        }
        const total=[...toReceive.values()].reduce((sum,x)=>sum+x.count,0);
        if(!Number.isSafeInteger(total))return resp({error:"本次入库数量超出范围"},400);
        const note=shortText(d.notes,500)||"包材采购到货入库";
        // D1 batch executes inside one transaction. Unique receipt id and quantity
        // guard roll back the stock and ledger writes if a competing request wins.
        const batch=[env.DB.prepare("INSERT INTO material_receipt_requests(id,order_id,received_total,notes) VALUES(?,?,?,?)").bind(requestId,id,total,note)];
        for(const {item,count} of toReceive.values()){
          batch.push(env.DB.prepare("UPDATE material_purchase_order_items SET received_qty=received_qty+? WHERE id=?").bind(count,item.id));
          batch.push(env.DB.prepare("UPDATE materials SET current_stock=current_stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(count,item.material_id));
          // Read balance AFTER updating material stock, never from an old page snapshot.
          batch.push(env.DB.prepare("INSERT INTO material_movements(id,material_id,purchase_order_id,movement_type,qty_change,balance_after,reference_no,notes) SELECT ?,id,NULL,'包材采购入库',?,current_stock,?,? FROM materials WHERE id=?").bind(crypto.randomUUID(),count,order.order_no,note,item.material_id));
        }
        batch.push(env.DB.prepare("UPDATE material_purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM material_purchase_order_items WHERE order_id=? AND received_qty<quantity) THEN '已入库' ELSE '部分到货' END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id,id));
        try{await env.DB.batch(batch)}catch(e){
          const msg=String(e&&e.message||e);
          if(/UNIQUE constraint|material_receipt_requests/i.test(msg))return resp({error:"该收货请求已处理，请刷新确认，系统没有重复入库"},409);
          if(/received quantity exceeds ordered quantity/i.test(msg))return resp({error:"收货期间数量已变化，请刷新采购单后重新核对"},409);
          throw e;
        }
        return resp({ok:true,receipt_id:requestId,order:await detail(env.DB,id)});
      }
    }
    return resp({error:"Not found"},404);
  }catch(e){return resp({error:String(e&&e.message||e)},400)}
}
