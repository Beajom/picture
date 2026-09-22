function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}})}
function err(e,status=400){return json({error:e instanceof Error?e.message:String(e)},status)}
const id=()=>crypto.randomUUID();
const modelOf=(code='')=>String(code).split('-')[0]||'';
async function enrichProductionOrders(env,orders){
  return await Promise.all((orders||[]).map(async o=>{
    const items=await all(env.DB,`SELECT i.quantity,p.internal_code
      FROM production_order_items i
      JOIN products p ON p.id=i.product_id
      WHERE i.production_order_id=?`,o.id);
    const grouped={};
    for(const it of items){
      const mdl=modelOf(it.internal_code||'');
      if(!mdl)continue;
      grouped[mdl]=(grouped[mdl]||0)+num(it.quantity);
    }
    const material_requirements=[];
    for(const [mdl,qty] of Object.entries(grouped)){
      const mats=await all(env.DB,'SELECT id,material_code,name,unit,finished_units_per_material FROM materials WHERE applicable_model=? ORDER BY material_code',mdl);
      for(const mat of mats){
        const pairsPerMaterial=Math.max(num(mat.finished_units_per_material)||2,0.0001);
        const need=Math.ceil(qty/pairsPerMaterial);
        material_requirements.push({
          material_id:mat.id,
          material_code:mat.material_code||'',
          name:mat.name||mat.material_code||'耗材',
          unit:mat.unit||'个',
          model:mdl,
          finished_pairs:qty,
          consumed:need,
          pairs_per_material:pairsPerMaterial
        });
      }
    }
    return {...o,material_requirements};
  }));
}
async function all(db,sql,...args){return (await db.prepare(sql).bind(...args).all()).results||[]}
async function one(db,sql,...args){return await db.prepare(sql).bind(...args).first()}
async function exec(db,sql,...args){return await db.prepare(sql).bind(...args).run()}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
async function createDailyBackup(env){
  try{
    const day=new Date().toISOString().slice(0,10);
    const key='system-backups/'+day+'.json';
    const exists=await env.IMAGES.get(key);
    if(exists)return;
    const tables=['products','inventory','suppliers','materials','purchase_orders','purchase_order_items','production_orders','production_order_items','outbound_orders','outbound_order_items','inventory_ledger','material_movements','image_refs'];
    const snapshot={created_at:new Date().toISOString(),version:1,tables:{}};
    for(const t of tables)snapshot.tables[t]=await all(env.DB,'SELECT * FROM '+t);
    const body=JSON.stringify(snapshot);
    await Promise.all([
      env.IMAGES.put(key,body,{metadata:{contentType:'application/json'}}),
      env.IMAGES.put('system-backups/latest.json',body,{metadata:{contentType:'application/json'}})
    ]);
  }catch(e){}
}

export async function onRequest(ctx){
  const {request,env}=ctx, url=new URL(request.url), p=url.pathname.replace(/^\/api/,'')||'/', method=request.method;
  try{
    if(p==='/bootstrap'&&method==='GET'){
      const [products,inventory,suppliers,materials,purchase_orders,production_orders,outbound_orders,ledger]=await Promise.all([
        all(env.DB,`SELECT p.*,
          COALESCE(NULLIF(p.image_url,''),(SELECT ir.public_url FROM image_refs ir WHERE ((ir.product_id=p.id) OR (ir.parent_asin=p.parent_asin AND ir.color=p.color)) AND ir.public_url IS NOT NULL ORDER BY ir.created_at DESC LIMIT 1)) AS resolved_image_url,
          COALESCE(NULLIF(p.parent_image_url,''),(SELECT ir.public_url FROM image_refs ir WHERE ir.parent_asin=p.parent_asin AND ir.kind='parent' AND ir.public_url IS NOT NULL ORDER BY ir.created_at DESC LIMIT 1)) AS resolved_parent_image_url
          FROM products p ORDER BY parent_asin,color,
          CASE size WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN '2XL' THEN 5 WHEN '3XL' THEN 6 WHEN '4XL' THEN 7 ELSE 99 END`),
        all(env.DB,'SELECT * FROM inventory'),
        all(env.DB,'SELECT * FROM suppliers ORDER BY company_name'),
        all(env.DB,`SELECT m.*,
          COALESCE(NULLIF(m.image_url,''),(SELECT ir.public_url FROM image_refs ir WHERE ir.material_id=m.id AND ir.public_url IS NOT NULL ORDER BY ir.created_at DESC LIMIT 1)) AS resolved_image_url
          FROM materials m ORDER BY material_code`),
        all(env.DB,`SELECT po.*,s.company_name supplier_name,
          COALESCE((SELECT SUM(quantity) FROM purchase_order_items x WHERE x.purchase_order_id=po.id),0) total_qty
          FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id ORDER BY po.created_at DESC`),
        all(env.DB,`SELECT pr.*,po.order_no purchase_order_no,s.company_name supplier_name,
          COALESCE((SELECT SUM(quantity) FROM production_order_items x WHERE x.production_order_id=pr.id),0) total_qty
          FROM production_orders pr LEFT JOIN purchase_orders po ON po.id=pr.purchase_order_id
          LEFT JOIN suppliers s ON s.id=pr.supplier_id ORDER BY pr.created_at DESC`),
        all(env.DB,'SELECT o.*,200 AS units_per_carton,CAST((o.total_qty+199)/200 AS INTEGER) AS box_count FROM outbound_orders o ORDER BY created_at DESC'),
        all(env.DB,`SELECT l.*,p.sku FROM inventory_ledger l LEFT JOIN products p ON p.id=l.product_id ORDER BY l.created_at DESC LIMIT 500`)
      ]);
      ctx.waitUntil?.(createDailyBackup(env));
      const production_orders_enriched=await enrichProductionOrders(env,production_orders);
      return json({products,inventory,suppliers,materials,purchase_orders,production_orders:production_orders_enriched,outbound_orders,ledger});
    }

    if(p==='/backup-status'&&method==='GET'){
      const latest=await env.IMAGES.getWithMetadata('system-backups/latest.json','text');
      return json({ok:!!latest.value,metadata:latest.metadata||null,size:latest.value?latest.value.length:0});
    }

    if(p==='/products'&&method==='POST'){
      const d=await request.json(), pid=id();
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO products(id,parent_asin,child_asin,sku,internal_code,product_name,color,size,untaxed_price,tax_rate,taxed_price,safety_stock)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(pid,d.parent_asin,d.child_asin||'',d.sku,d.internal_code,d.product_name,d.color,d.size,num(d.untaxed_price),num(d.tax_rate),num(d.taxed_price),num(d.safety_stock)),
        env.DB.prepare('INSERT INTO inventory(id,product_id,available_qty,safety_stock) VALUES(?,?,0,?)').bind(id(),pid,num(d.safety_stock))
      ]);
      return json({id:pid});
    }
    let m=p.match(/^\/products\/([^/]+)$/);
    if(m&&method==='PUT'){
      const d=await request.json();
      await exec(env.DB,`UPDATE products SET parent_asin=?,child_asin=?,sku=?,internal_code=?,product_name=?,color=?,size=?,untaxed_price=?,tax_rate=?,taxed_price=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        d.parent_asin,d.child_asin||'',d.sku,d.internal_code,d.product_name,d.color,d.size,num(d.untaxed_price),num(d.tax_rate),num(d.taxed_price),m[1]);
      return json({id:m[1]});
    }
    if(m&&method==='DELETE'){
      const refs=await one(env.DB,'SELECT COUNT(*) c FROM purchase_order_items WHERE product_id=?',m[1]);
      const refs2=await one(env.DB,'SELECT COUNT(*) c FROM outbound_order_items WHERE product_id=?',m[1]);
      if(num(refs?.c)+num(refs2?.c)>0) throw new Error('该SKU已有业务单据记录，为保证账目可追溯不能直接删除。请停用或保留。');
      await exec(env.DB,'DELETE FROM products WHERE id=?',m[1]);
      return json({ok:true});
    }

    if(p==='/suppliers'&&method==='POST'){
      const d=await request.json(), sid=id();
      await exec(env.DB,`INSERT INTO suppliers(id,company_name,website,company_address,contact_name,phone,payment_method,bank_type,account_name,bank_name,bank_account,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,sid,d.company_name,d.website||'',d.company_address||'',d.contact_name||'',d.phone||'',d.payment_method||'',d.bank_type||'',d.account_name||'',d.bank_name||'',d.bank_account||'',d.notes||'');
      return json({id:sid});
    }
    m=p.match(/^\/suppliers\/([^/]+)$/);
    if(m&&method==='PUT'){
      const d=await request.json();
      await exec(env.DB,`UPDATE suppliers SET company_name=?,website=?,company_address=?,contact_name=?,phone=?,payment_method=?,bank_type=?,account_name=?,bank_name=?,bank_account=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        d.company_name,d.website||'',d.company_address||'',d.contact_name||'',d.phone||'',d.payment_method||'',d.bank_type||'',d.account_name||'',d.bank_name||'',d.bank_account||'',d.notes||'',m[1]);
      return json({id:m[1]});
    }

    if(p==='/materials'&&method==='POST'){
      const d=await request.json(), mid=String(d.id||id());
      await exec(env.DB,`INSERT INTO materials(id,material_code,name,unit,applicable_model,purchase_price,current_stock,safety_stock,target_stock,finished_units_per_material,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`,mid,d.material_code,d.name,d.unit||'个',d.applicable_model||'',num(d.purchase_price),num(d.current_stock),num(d.safety_stock),num(d.target_stock),Math.max(num(d.finished_units_per_material),0.0001),d.notes||'');
      return json({id:mid});
    }
    m=p.match(/^\/materials\/([^/]+)$/);
    if(m&&method==='PUT'){
      const d=await request.json();
      await exec(env.DB,`UPDATE materials SET material_code=?,name=?,unit=?,applicable_model=?,purchase_price=?,current_stock=?,safety_stock=?,target_stock=?,finished_units_per_material=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        d.material_code,d.name,d.unit||'个',d.applicable_model||'',num(d.purchase_price),num(d.current_stock),num(d.safety_stock),num(d.target_stock),Math.max(num(d.finished_units_per_material),0.0001),d.notes||'',m[1]);
      return json({id:m[1]});
    }

    if(p==='/images'&&method==='POST'){
      const fd=await request.formData(), file=fd.get('file');
      if(!(file instanceof File))throw new Error('没有选择图片');
      const type=String(fd.get('type')||'color'), parent=String(fd.get('parent_asin')||''), color=String(fd.get('color')||'');
      const productId=String(fd.get('product_id')||''), materialId=String(fd.get('material_id')||'');
      const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();
      const key=`${type}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const contentType=file.type||'image/jpeg';
      const bytes=await file.arrayBuffer();
      await env.IMAGES.put(key, bytes, {metadata:{contentType}});
      const publicUrl='/api/image/'+encodeURIComponent(key);
      try{
        const absolute=new URL(publicUrl,request.url).href;
        const resp=new Response(bytes.slice(0),{headers:{
          'content-type':contentType,
          'cache-control':'public,max-age=31536000,s-maxage=31536000,immutable',
          'etag':'"'+key+'"'
        }});
        ctx.waitUntil?.(caches.default.put(new Request(absolute,{method:'GET'}),resp));
      }catch(e){}
      await exec(env.DB,'INSERT INTO image_refs(id,kind,parent_asin,color,product_id,material_id,r2_key,public_url) VALUES(?,?,?,?,?,?,?,?)',id(),type,parent,color,productId||null,materialId||null,key,publicUrl);
      if(type==='parent'&&parent)await exec(env.DB,'UPDATE products SET parent_image_url=? WHERE parent_asin=?',publicUrl,parent);
      if(type==='color'&&parent&&color)await exec(env.DB,'UPDATE products SET image_url=? WHERE parent_asin=? AND color=?',publicUrl,parent,color);
      if(type==='material'&&materialId)await exec(env.DB,'UPDATE materials SET image_url=? WHERE id=?',publicUrl,materialId);
      return json({url:publicUrl});
    }
    m=p.match(/^\/image\/(.+)$/);
    if(m&&method==='GET'){
      const cacheApi=caches.default, cacheKey=new Request(request.url,{method:'GET'});
      const hit=await cacheApi.match(cacheKey);
      if(hit)return hit;
      const key=decodeURIComponent(m[1]), obj=await env.IMAGES.getWithMetadata(key,'arrayBuffer');
      if(!obj.value)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
      const h=new Headers({
        'content-type':obj.metadata?.contentType||'application/octet-stream',
        'cache-control':'public,max-age=31536000,s-maxage=31536000,immutable',
        'etag':'"'+key+'"'
      });
      const resp=new Response(obj.value,{headers:h});
      ctx.waitUntil?.(cacheApi.put(cacheKey,resp.clone()));
      return resp;
    }

    if(p==='/migrate-images'&&method==='POST'){
      const limit=Math.max(1,Math.min(10,Math.trunc(num(url.searchParams.get('limit')||6))));
      const rows=await all(env.DB,"SELECT image_url,parent_image_url FROM products WHERE (image_url LIKE 'http%') OR (parent_image_url LIKE 'http%')");
      const mats=await all(env.DB,"SELECT image_url FROM materials WHERE image_url LIKE 'http%'");
      const urls=[...new Set([...rows.flatMap(r=>[r.image_url,r.parent_image_url]),...mats.map(r=>r.image_url)].filter(u=>/^https?:\/\//i.test(u)))];
      const batchUrls=urls.slice(0,limit), updates=[];let moved=0,failed=0;
      for(const oldUrl of batchUrls){
        try{
          const rr=await fetch(oldUrl,{cf:{cacheEverything:true,cacheTtl:86400}});
          if(!rr.ok){failed++;continue}
          const ct=rr.headers.get('content-type')||'image/jpeg';
          if(!ct.startsWith('image/')){failed++;continue}
          const ext=(ct.split('/')[1]||'jpg').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'')||'jpg';
          const key='migrated/'+crypto.randomUUID()+'.'+ext;
          await env.IMAGES.put(key,await rr.arrayBuffer(),{metadata:{contentType:ct}});
          const nu='/api/image/'+encodeURIComponent(key);
          updates.push(env.DB.prepare('UPDATE products SET image_url=? WHERE image_url=?').bind(nu,oldUrl));
          updates.push(env.DB.prepare('UPDATE products SET parent_image_url=? WHERE parent_image_url=?').bind(nu,oldUrl));
          updates.push(env.DB.prepare('UPDATE materials SET image_url=? WHERE image_url=?').bind(nu,oldUrl));
          moved++;
        }catch(e){failed++}
      }
      if(updates.length)await env.DB.batch(updates);
      const remaining=Math.max(0,urls.length-moved);
      return json({ok:true,moved,failed,remaining,total_external:urls.length});
    }
    if(p==='/inventory/adjust'&&method==='POST'){
      const d=await request.json(), q=Math.trunc(num(d.qty_change));
      if(!q)throw new Error('调整数量不能为0');
      const inv=await one(env.DB,'SELECT available_qty FROM inventory WHERE product_id=?',d.product_id);
      if(!inv)throw new Error('库存记录不存在');
      const after=num(inv.available_qty)+q;if(after<0)throw new Error('库存不足，不能调整为负数');
      await env.DB.batch([
        env.DB.prepare('UPDATE inventory SET available_qty=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(after,d.product_id),
        env.DB.prepare('INSERT INTO inventory_ledger(id,business_type,reference_no,product_id,qty_change,balance_after,notes) VALUES(?,?,?,?,?,?,?)')
          .bind(id(),d.business_type||'库存调整','ADJ-'+Date.now(),d.product_id,q,after,d.notes||'')
      ]);
      return json({balance_after:after});
    }

    if(p==='/purchase-orders'&&method==='POST'){
      const d=await request.json(), poid=id(), prdid=id(), piid=id(), priid=id();
      const prod=await one(env.DB,'SELECT * FROM products WHERE id=?',d.product_id);if(!prod)throw new Error('商品不存在');
      const quantity=Math.trunc(num(d.quantity));if(quantity<=0)throw new Error('采购数量必须大于0');
      const model=modelOf(prod.internal_code);
      const mats=await all(env.DB,'SELECT * FROM materials WHERE applicable_model=?',model);
      const batch=[
        env.DB.prepare('INSERT INTO purchase_orders(id,order_no,supplier_id,order_date,expected_date,payment_terms,shipping_fee,status) VALUES(?,?,?,?,?,?,?,?)')
          .bind(poid,d.order_no,d.supplier_id||null,d.order_date,d.expected_date||null,d.payment_terms||'',num(d.shipping_fee),'已下单'),
        env.DB.prepare('INSERT INTO purchase_order_items(id,purchase_order_id,product_id,quantity,unit_price) VALUES(?,?,?,?,?)')
          .bind(piid,poid,d.product_id,quantity,num(d.unit_price)),
        env.DB.prepare('INSERT INTO production_orders(id,production_no,purchase_order_id,supplier_id,planned_finish_date,status) VALUES(?,?,?,?,?,?)')
          .bind(prdid,'PRD-'+Date.now().toString().slice(-8),poid,d.supplier_id||null,d.expected_date||null,'待生产'),
        env.DB.prepare('INSERT INTO production_order_items(id,production_order_id,product_id,quantity) VALUES(?,?,?,?)')
          .bind(priid,prdid,d.product_id,quantity)
      ];
      await env.DB.batch(batch);
      const material_requirements=mats.map(mat=>{
        const pairsPerMaterial=Math.max(num(mat.finished_units_per_material)||2,0.0001);
        const need=Math.ceil(quantity/pairsPerMaterial),stock=num(mat.current_stock),shortage=Math.max(0,need-stock);
        return {id:mat.id,name:mat.name,material_code:mat.material_code,unit:mat.unit||'个',need,stock,shortage,pairs_per_material:pairsPerMaterial,sets:Math.ceil(quantity/2)}
      });
      return json({
        id:poid,
        material_requirements,
        material_shortages:material_requirements.filter(x=>x.shortage>0).map(x=>x.name)
      });
    }
    m=p.match(/^\/purchase-orders\/([^/]+)$/);
    if(m&&method==='GET'){
      const po=await one(env.DB,`SELECT po.*,s.company_name supplier_name,s.company_address,s.website supplier_website,s.contact_name supplier_contact,
        s.phone supplier_phone,s.payment_method supplier_payment_method,s.bank_type,s.account_name,s.bank_name,s.bank_account
        FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=?`,m[1]);
      if(!po)return err('采购单不存在',404);
      po.items=await all(env.DB,`SELECT i.*,p.sku,p.internal_code,p.product_name,p.color,p.size,p.image_url,p.parent_image_url
        FROM purchase_order_items i JOIN products p ON p.id=i.product_id WHERE i.purchase_order_id=?`,m[1]);
      return json(po);
    }
    if(m&&method==='DELETE'){
      const po=await one(env.DB,'SELECT * FROM purchase_orders WHERE id=?',m[1]);if(!po)return err('采购单不存在',404);
      const inbound=await one(env.DB,`SELECT COUNT(*) c FROM production_orders WHERE purchase_order_id=? AND status='已入库'`,m[1]);
      if(num(inbound?.c)>0)throw new Error('该采购单已完成生产入库，不能直接删除');
      const moves=await all(env.DB,'SELECT material_id,SUM(qty_change) net FROM material_movements WHERE purchase_order_id=? GROUP BY material_id',m[1]);
      const batch=[];
      for(const mv of moves){if(num(mv.net)!==0)batch.push(env.DB.prepare('UPDATE materials SET current_stock=current_stock-? WHERE id=?').bind(num(mv.net),mv.material_id))}
      batch.push(env.DB.prepare('DELETE FROM purchase_orders WHERE id=?').bind(m[1]));
      await env.DB.batch(batch);
      return json({ok:true});
    }

    m=p.match(/^\/production-orders\/([^/]+)\/advance$/);
    if(m&&method==='POST'){
      const o=await one(env.DB,'SELECT * FROM production_orders WHERE id=?',m[1]);if(!o)return err('生产单不存在',404);
      const seq=['待生产','生产中','待质检','生产完成','已入库'], i=seq.indexOf(o.status);
      if(i<0||i===seq.length-1)return json({status:o.status});
      const next=seq[i+1];
      const material_consumptions=[];
      if(next==='已入库'){
        const items=await all(env.DB,'SELECT * FROM production_order_items WHERE production_order_id=?',o.id),batch=[];
        for(const it of items){
          const inv=await one(env.DB,'SELECT available_qty FROM inventory WHERE product_id=?',it.product_id), after=num(inv?.available_qty)+num(it.quantity);
          batch.push(env.DB.prepare('UPDATE inventory SET available_qty=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(after,it.product_id));
          batch.push(env.DB.prepare('INSERT INTO inventory_ledger(id,business_type,reference_no,product_id,qty_change,balance_after,notes) VALUES(?,?,?,?,?,?,?)')
            .bind(id(),'生产入库',o.production_no,it.product_id,num(it.quantity),after,'生产完成验收入库'));
        }

        // New rule: packaging/material inventory is consumed when finished goods are actually received.
        // Legacy protection: old purchase orders may already have negative material movements from the previous "purchase reservation" rule.
        // If such movement exists for this PO, do not deduct a second time.
        const legacy=await one(env.DB,'SELECT COUNT(*) c FROM material_movements WHERE purchase_order_id=? AND qty_change<0',o.purchase_order_id);
        if(num(legacy?.c)===0){
          const grouped={};
          for(const it of items){
            const prod=await one(env.DB,'SELECT internal_code FROM products WHERE id=?',it.product_id);
            const mdl=modelOf(prod?.internal_code||'');
            if(!mdl)continue;
            grouped[mdl]=(grouped[mdl]||0)+num(it.quantity);
          }
          const po=await one(env.DB,'SELECT order_no FROM purchase_orders WHERE id=?',o.purchase_order_id);
          for(const [mdl,qty] of Object.entries(grouped)){
            const mats=await all(env.DB,'SELECT * FROM materials WHERE applicable_model=?',mdl);
            for(const mat of mats){
              const pairsPerMaterial=Math.max(num(mat.finished_units_per_material)||2,0.0001);
              const need=Math.ceil(qty/pairsPerMaterial);
              const before=num(mat.current_stock), after=before-need;
              material_consumptions.push({material_id:mat.id,name:mat.name,material_code:mat.material_code,model:mdl,finished_pairs:qty,sets:Math.ceil(qty/2),consumed:need,before,after,unit:mat.unit||'个'});
              batch.push(env.DB.prepare('UPDATE materials SET current_stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(after,mat.id));
              batch.push(env.DB.prepare('INSERT INTO material_movements(id,material_id,purchase_order_id,movement_type,qty_change,balance_after,reference_no,notes) VALUES(?,?,?,?,?,?,?,?)')
                .bind(id(),mat.id,o.purchase_order_id,'成品入库消耗',-need,after,o.production_no,'成品入库时按2双=1套、每套1个包材自动扣减；关联采购单 '+(po?.order_no||'')));
            }
          }
        }

        batch.push(env.DB.prepare("UPDATE production_orders SET status='已入库',inbound_at=CURRENT_TIMESTAMP WHERE id=?").bind(o.id));
        batch.push(env.DB.prepare("UPDATE purchase_orders SET status='已入库',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(o.purchase_order_id));
        await env.DB.batch(batch);
      }else{
        await exec(env.DB,'UPDATE production_orders SET status=?,production_completed_at=CASE WHEN ?=\'生产完成\' THEN CURRENT_TIMESTAMP ELSE production_completed_at END WHERE id=?',next,next,o.id);
        await exec(env.DB,'UPDATE purchase_orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',next==='生产完成'?'生产完成':'生产中',o.purchase_order_id);
      }
      return json({status:next,material_consumptions});
    }

    if(p==='/outbound-orders'&&method==='POST'){
      const d=await request.json(), q=Math.trunc(num(d.quantity)), inv=await one(env.DB,'SELECT available_qty FROM inventory WHERE product_id=?',d.product_id);
      if(!inv)throw new Error('库存不存在');if(q<=0)throw new Error('出库数量必须大于0');if(num(inv.available_qty)<q)throw new Error('库存不足');
      const after=num(inv.available_qty)-q, oid=id(), unitsPerCarton=200, box=Math.ceil(q/unitsPerCarton);
      await env.DB.batch([
        env.DB.prepare('INSERT INTO outbound_orders(id,outbound_no,outbound_date,destination,carrier,total_qty,units_per_carton,box_count,status) VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(oid,d.outbound_no,d.outbound_date,d.destination||'',d.carrier||'',q,unitsPerCarton,box,'已出库'),
        env.DB.prepare('INSERT INTO outbound_order_items(id,outbound_order_id,product_id,quantity) VALUES(?,?,?,?)').bind(id(),oid,d.product_id,q),
        env.DB.prepare('UPDATE inventory SET available_qty=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(after,d.product_id),
        env.DB.prepare('INSERT INTO inventory_ledger(id,business_type,reference_no,product_id,qty_change,balance_after,notes) VALUES(?,?,?,?,?,?,?)')
          .bind(id(),'出库',d.outbound_no,d.product_id,-q,after,'出库单扣减库存')
      ]);
      return json({id:oid,box_count:box});
    }
    m=p.match(/^\/outbound-orders\/([^/]+)$/);
    if(m&&method==='GET'){
      const o=await one(env.DB,'SELECT * FROM outbound_orders WHERE id=?',m[1]);if(!o)return err('出库单不存在',404);o.units_per_carton=200;o.box_count=Math.ceil(num(o.total_qty)/200);
      o.items=await all(env.DB,`SELECT i.*,p.sku,p.internal_code,p.product_name,p.color,p.size,p.image_url,p.parent_asin,p.child_asin
        FROM outbound_order_items i JOIN products p ON p.id=i.product_id WHERE i.outbound_order_id=? ORDER BY p.internal_code`,m[1]);
      return json(o);
    }
    if(m&&method==='DELETE'){
      const o=await one(env.DB,'SELECT * FROM outbound_orders WHERE id=?',m[1]);if(!o)return err('出库单不存在',404);
      const items=await all(env.DB,'SELECT * FROM outbound_order_items WHERE outbound_order_id=?',o.id),batch=[];
      for(const it of items){
        const inv=await one(env.DB,'SELECT available_qty FROM inventory WHERE product_id=?',it.product_id),after=num(inv?.available_qty)+num(it.quantity);
        batch.push(env.DB.prepare('UPDATE inventory SET available_qty=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?').bind(after,it.product_id));
        batch.push(env.DB.prepare('INSERT INTO inventory_ledger(id,business_type,reference_no,product_id,qty_change,balance_after,notes) VALUES(?,?,?,?,?,?,?)')
          .bind(id(),'撤销出库',o.outbound_no,it.product_id,num(it.quantity),after,'删除错误出库单，自动恢复库存'));
      }
      batch.push(env.DB.prepare('DELETE FROM outbound_orders WHERE id=?').bind(o.id));
      await env.DB.batch(batch);
      return json({ok:true});
    }

    return err('Not found',404);
  }catch(e){return err(e,400)}
}