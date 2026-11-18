/* Packaging procurement interface. Uses existing D1/Workers API and never changes finished-goods inventory. */
(function(){
'use strict';
let purchaseOrders=[];
let currentOrder=null;
const yuan=n=>'¥'+Number(n||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const el=id=>document.getElementById(id);
const safe=s=>esc(s==null?'':s);
const n=v=>Number(v)||0;
const localDate=()=>{let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const statusClass=s=>s==='已入库'?'done':s==='部分到货'?'partial':'';
const matById=id=>cache.materials.find(x=>x.id===id)||{};
const supplierById=id=>cache.suppliers.find(x=>x.id===id)||{};
const opts=(items,key,name,selected)=>items.map(x=>'<option value="'+safe(x[key])+'"'+(x[key]===selected?' selected':'')+'>'+safe(x[name])+'</option>').join('');
const statusTag=s=>'<span class="mpo-status '+statusClass(s)+'">'+safe(s||'已下单')+'</span>';
const btn=(name,js,primary)=>'<button class="btn '+(primary?'primary':'')+'" type="button" onclick="'+js+'">'+name+'</button>';
function displayPurchaseList(){
  const wrap=el('materialPurchaseOrders');
  if(!wrap)return;
  const total=purchaseOrders.reduce((v,x)=>v+n(x.total_amount),0);
  const received=purchaseOrders.reduce((v,x)=>v+n(x.received_qty),0);
  const pending=purchaseOrders.filter(x=>x.status!=='已入库').length;
  const summary='<div class="mpo-kpis">'+
    '<div class="mpo-kpi"><small>包材采购单</small><strong>'+purchaseOrders.length+'</strong></div>'+
    '<div class="mpo-kpi"><small>合同金额</small><strong>'+yuan(total)+'</strong></div>'+
    '<div class="mpo-kpi"><small>未全部到货</small><strong>'+pending+'</strong><small>累计到货 '+received.toLocaleString()+' 件</small></div></div>';
  const table=purchaseOrders.length?
    '<div class="mpo-listbox"><table class="mpo-table"><thead><tr><th>采购单号</th><th>日期 / 交期</th><th>供应商</th><th>采购数量</th><th>订单金额</th><th>已入库</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    purchaseOrders.map(o=>'<tr><td><b>'+safe(o.order_no)+'</b></td><td>'+safe(o.order_date)+'<div class="small muted">'+safe(o.delivery_date||'未填交期')+'</div></td><td>'+safe(o.supplier_name||'-')+'</td><td>'+n(o.total_qty).toLocaleString()+'</td><td>'+yuan(o.total_amount)+'</td><td>'+n(o.received_qty).toLocaleString()+'</td><td>'+statusTag(o.status)+'</td><td><div class="mpo-inline-actions">'+btn('查看合同',"previewMaterialPurchaseContract('"+safe(o.id)+"')")+btn('编辑合同',"editMaterialPurchaseContract('"+safe(o.id)+"')")+((o.status==='已入库')?'':btn('收货入库',"receiveMaterialPurchase('"+safe(o.id)+"')",true))+'</div></td></tr>').join('')+
    '</tbody></table></div>':
    '<div class="panel" style="padding:32px;text-align:center;color:#64748b">尚无包材采购单。先在「辅料 / 包材」建立纸盒、标签、纸箱等物料，再点击右上角「新建包材采购单」。</div>';
  wrap.innerHTML=summary+table;
}
async function loadPurchaseOrders(){
  try{const result=await api('/material-purchase-orders');purchaseOrders=result.orders||[];displayPurchaseList()}
  catch(e){const w=el('materialPurchaseOrders');if(w)w.innerHTML='<div class="mpo-note">加载包材采购单失败：'+safe(e.message)+'。请点击刷新重试。</div>'}
}
views.materialPurchase=function(){
  setTimeout(loadPurchaseOrders,0);
  return '<div class="title"><div><h1>包装辅料采购</h1><p>包材采购单 → 订货合同 → 收货入库。与成品采购单独立管理。</p></div>'+
    '<div class="row" style="gap:8px;flex-wrap:wrap">'+btn('刷新列表','loadMaterialPurchaseOrders()')+btn('甲方资料 / 公章管理','editMaterialContractProfile()')+btn('管理包材',"go('materials')")+btn('＋ 新建包材采购单','newMaterialPO()',true)+'</div></div>'+
    '<div class="mpo-note" style="margin-bottom:12px">支持彩盒、白卡纸盒、包装袋、吊牌、贴纸、标签、纸箱等辅料；一个采购单可包含多种材料。合同可编辑材质、规格、数量、价格、交货和付款条款。只有确认到货时才增加包材库存，绝不会改变成品 SKU 库存。</div>'+
    '<div id="materialPurchaseOrders"><div class="panel" style="padding:24px">正在加载包材采购单…</div></div>'
};
window.loadMaterialPurchaseOrders=loadPurchaseOrders;
function selectedMat(row){
  const sel=row.querySelector('.mpo-mat');return matById(sel?.value)
}
function updateLine(row, resetPrice){
  const m=selectedMat(row);
  const img=row.querySelector('.mpo-line-thumb');
  if(img){img.src=m.resolved_image_url||m.image_url||'';img.style.display=img.src?'block':'none'}
  const stock=row.querySelector('.mpo-stock');
  if(stock)stock.textContent='现有库存：'+n(m.current_stock).toLocaleString()+' '+(m.unit||'个')+'；目标库存：'+n(m.target_stock).toLocaleString();
  if(resetPrice)row.querySelector('.mpo-price').value=n(m.purchase_price).toFixed(2);
  calculateTotal()
}
function calculateTotal(){
  let sum=0;
  document.querySelectorAll('#mpoLineRows .mpo-line').forEach(row=>{
    const cost=Math.max(0,n(row.querySelector('.mpo-qty').value))*Math.max(0,n(row.querySelector('.mpo-price').value));
    const label=row.querySelector('.mpo-line-value');if(label)label.textContent=yuan(cost);sum+=cost
  });
  const fee=Math.max(0,n(el('mpoShipping')?.value));
  if(el('mpoSubtotal'))el('mpoSubtotal').textContent=yuan(sum);
  if(el('mpoTotal'))el('mpoTotal').textContent=yuan(sum+fee)
}
window.addMaterialPOLine=function(materialId='',qty=1){
  const wrap=el('mpoLineRows');if(!wrap)return;
  const row=document.createElement('div');row.className='mpo-line';
  const first=matById(materialId),id=first.id||cache.materials[0]?.id;
  row.innerHTML='<div class="mpo-line-grid">'+
    '<label>包装辅料<select class="field mpo-mat">'+opts(cache.materials,'id','name',id)+'</select></label>'+
    '<label>采购数量<input class="field mpo-qty" type="number" min="1" step="1" required value="'+Math.max(1,n(qty))+'"></label>'+
    '<label>单价（元）<input class="field mpo-price" type="number" min="0" step="0.01" required value="0.00"></label>'+
    '<div><span class="small muted">小计</span><b class="mpo-line-value" style="display:block">'+yuan(0)+'</b></div></div>'+
    '<div class="line-additional"><label>材质<input class="field mpo-grade" placeholder="如 400g 白卡"></label>'+
    '<label>规格 / 尺寸<input class="field mpo-spec" placeholder="如 130×140×16.5 mm"></label>'+
    '<label>备注 / 印刷工艺<input class="field mpo-remark" placeholder="印刷色号、样稿等"></label>'+
    '<button type="button" class="btn" style="color:#b42318" onclick="this.closest(\'.mpo-line\').remove();calculateMaterialPOTotal()">移除</button></div>'+
    '<div class="row" style="gap:9px;margin-top:8px"><img class="mpo-line-thumb" alt="包材图片" style="display:none"><span class="small muted mpo-stock"></span></div>';
  wrap.appendChild(row);
  row.querySelector('.mpo-mat').addEventListener('change',()=>updateLine(row,true));
  row.querySelectorAll('input').forEach(x=>x.addEventListener('input',calculateTotal));
  updateLine(row,true);
};
window.calculateMaterialPOTotal=calculateTotal;
window.newMaterialPO=async function(materialId=''){
  if(!cache.materials.length){go('materials');toastMsg('请先新增辅料/包材，再建立采购单');return}
  if(!cache.suppliers.length){go('suppliers');toastMsg('请先添加供应商资料');return}
  let profile={company_name:'义乌市时盈电子商务有限公司'};
  try{profile=(await api('/material-contract-profile')).profile||profile}catch(e){}
  const now=localDate(),invoiceNo='MP-'+now.replaceAll('-','')+'-'+String(Date.now()).slice(-5);
  const form='<form id="materialPOForm" class="form">'+
    procurementTypeSwitch('material')+
    '<label>合同 / 采购单号<input class="field" name="order_no" value="'+invoiceNo+'" required></label>'+
    '<label>包装供应商<select class="field" name="supplier_id">'+opts(cache.suppliers,'id','company_name','')+'</select></label>'+
    '<label>订货日期<input class="field" type="date" name="order_date" value="'+now+'" required></label>'+
    '<label>交货日期<input class="field" type="date" name="delivery_date"></label>'+
    '<div class="full"><b>采购包材明细</b><div id="mpoLineRows" class="mpo-lines" style="margin-top:9px"></div>'+
    '<button type="button" class="btn" style="margin-top:9px" onclick="addMaterialPOLine()">＋ 添加一项包材</button></div>'+
    '<label>运费（元）<input id="mpoShipping" class="field" type="number" min="0" step="0.01" name="shipping_fee" value="0" oninput="calculateMaterialPOTotal()"></label>'+
    '<div class="mpo-total"><span>商品：<span id="mpoSubtotal">'+yuan(0)+'</span></span><span>含运费合计：<span id="mpoTotal">'+yuan(0)+'</span></span></div>'+
    '<label class="full">甲方 / 采购方<input class="field" name="buyer_company" value="'+safe(profile.company_name||'义乌市时盈电子商务有限公司')+'"></label>'+
    '<label>签约地点<input class="field" name="sign_location" value="浙江义乌"></label>'+
    '<label>交货地点<input class="field" name="delivery_address" placeholder="完整交货地址"></label>'+
    '<label class="full">付款条款<textarea class="field" name="payment_terms" rows="2">下单支付30%订金，余款验货确认后7日内结清，付款以双方最终约定为准。</textarea></label>'+
    '<label class="full">质量条款<textarea class="field" name="quality_terms" rows="2">按双方确认的材质、尺寸、印刷颜色和样稿生产；品质不符的处理方式由双方确认。</textarea></label>'+
    '<label class="full">包装及运输条款<textarea class="field" name="packaging_terms" rows="2">按双方确认的包装和运输方式交货，外箱保持完整。</textarea></label>'+
    '<label class="full">其他条款 / 违约责任<textarea class="field" name="other_terms" rows="3">未经双方书面确认不得擅自更换材质、规格和印刷图案。发生争议应先协商解决。</textarea></label>'+
    '<label class="full">内部备注<input class="field" name="notes" placeholder="订单内部记录，不影响库存"></label>'+
    '<div class="actions full"><button type="button" class="btn" onclick="closeModal()">取消</button><button type="submit" class="btn primary">保存采购单并生成合同</button></div></form>';
  openModal('新建包装辅料采购单',form);
  addMaterialPOLine(materialId);
  const f=el('materialPOForm');
  f.onsubmit=async e=>{
    e.preventDefault();
    const rows=[...f.querySelectorAll('.mpo-line')];
    const items=rows.map(row=>({
      material_id:row.querySelector('.mpo-mat').value,
      quantity:Number(row.querySelector('.mpo-qty').value),
      unit_price:Number(row.querySelector('.mpo-price').value),
      material_grade:row.querySelector('.mpo-grade').value,
      material_spec:row.querySelector('.mpo-spec').value,
      remarks:row.querySelector('.mpo-remark').value
    }));
    if(!items.length||items.some(x=>!Number.isInteger(x.quantity)||x.quantity<=0||!Number.isFinite(x.unit_price)||x.unit_price<0)){toastMsg('请检查包材数量和单价');return}
    const d=Object.fromEntries(new FormData(f).entries());
    d.items=items;d.shipping_fee=Number(d.shipping_fee||0);
    const submit=f.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='正在保存…';
    try{const result=await api('/material-purchase-orders',{method:'POST',body:JSON.stringify(d)});
      closeModal();go('materialPurchase');await previewMaterialPurchaseContract(result.order.id);
      toastMsg('包材采购单已保存，包材库存未变动')
    }catch(err){toastMsg('保存失败：'+err.message)}finally{submit.disabled=false;submit.textContent='保存采购单并生成合同'}
  };
};
function upperMoney(value){
  const digit=['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'],unit=['','拾','佰','仟'],parts=['','万','亿','兆'];
  const num=Math.round(Number(value||0)*100);if(!Number.isSafeInteger(num)||num<0)return '金额超出范围';
  const integer=Math.floor(num/100),jiao=Math.floor((num%100)/10),fen=num%10;
  if(integer===0)return '零元'+(jiao?digit[jiao]+'角':'')+(fen?digit[fen]+'分':'整');
  let valueLeft=integer,index=0,result='',pendingZero=false;
  while(valueLeft>0){
    let chunk=valueLeft%10000,txt='',zero=false;
    for(let i=0;i<4;i++){const x=chunk%10;chunk=Math.floor(chunk/10);if(x){txt=digit[x]+unit[i]+(zero?'零':'')+txt;zero=false}else if(txt){zero=true}}
    if(txt){if(pendingZero&&result)txt='零'+txt;result=txt+parts[index]+result;pendingZero=false}
    else if(result)pendingZero=true;
    valueLeft=Math.floor(valueLeft/10000);index++;
  }
  return result+'元'+(jiao?digit[jiao]+'角':'')+(fen?digit[fen]+'分':'')+(!jiao&&!fen?'整':'');
}
function paperMarkup(o){
  const items=o.items||[];
  const rows=items.map(it=>{
    const image=it.resolved_image_url||it.image_url||'';
    return '<tr class="mpo-product-row"><td class="mpo-name">'+safe(it.material_name||'')+
      (it.material_code?'<div class="mpo-material-code">'+safe(it.material_code)+'</div>':'')+'</td>'+
      '<td>'+safe(it.material_grade||'')+'</td><td>'+safe(it.material_spec||'')+'</td>'+
      '<td>'+n(it.quantity).toLocaleString('zh-CN')+' '+safe(it.unit||'个')+'</td>'+
      '<td>'+yuan(it.unit_price)+'</td><td>'+yuan(n(it.quantity)*n(it.unit_price))+'</td>'+
      '<td>'+(image?'<img class="mpo-material-thumb" src="'+safe(image)+'" alt="包材样品图片">':'')+
      (it.remarks?'<div class="mpo-remarks">'+safe(it.remarks)+'</div>':'')+'</td></tr>';
  }).join('');
  const seal=!!o.has_buyer_stamp&&o.seal_enabled!==false&&!!o.buyer_stamp_url;
  const line=(label,value)=>'<div class="mpo-sig-line"><strong>'+label+'</strong><span>'+safe(value||'')+'</span></div>';
  const buyerBlock=line('甲　方：',o.buyer_company)+line('地　址：',o.buyer_address)+
    line('电　话：',o.buyer_phone)+line('委托代表人：',o.buyer_representative)+
    line('日　期：',(o.buyer_sign_date||o.order_date||'').replaceAll('-','.'));
  const supplierBlock=line('乙　方：',o.supplier_name)+line('地　址：',o.supplier_address)+
    line('电　话：',o.supplier_phone)+line('委托代表人：',o.supplier_representative)+
    line('日　期：',(o.supplier_sign_date||o.order_date||'').replaceAll('-','.'));
  return '<article class="mpo-paper" id="materialContractPaper">'+
    '<header class="mpo-doc-title"><h2>订货合同</h2><p>（包装辅料采购）</p></header>'+
    '<div class="mpo-contract-meta"><div class="mpo-contract-parties">'+
      '<div><strong>甲　方：</strong><span>'+safe(o.buyer_company||'')+'</span></div>'+
      '<div><strong>乙　方：</strong><span>'+safe(o.supplier_name||'')+'</span></div></div>'+
    '<div class="mpo-contract-refs">'+
      '<div><strong>合同编号：</strong><span>'+safe(o.order_no)+'</span></div>'+
      '<div><strong>订货日期：</strong><span>'+safe(o.order_date)+'</span></div>'+
      '<div><strong>签约地点：</strong><span>'+safe(o.sign_location||'')+'</span></div></div></div>'+
    '<p class="mpo-intro">经甲乙双方协商一致，签订以下订货合同：</p>'+
    '<h3 class="mpo-section-heading">一、品名、材料、规格、数量、单价、金额</h3>'+
    '<table class="mpo-contract-table"><colgroup><col style="width:23%"><col style="width:12%"><col style="width:17%"><col style="width:11%"><col style="width:11%"><col style="width:13%"><col style="width:13%"></colgroup>'+
    '<thead><tr><th>品名</th><th>材质</th><th>产品规格<br>（cm / mm）</th><th>数量</th><th>单价（元）</th><th>金额（元）</th><th>备注 / 样图</th></tr></thead>'+
    '<tbody>'+rows+
      '<tr class="mpo-sum-row"><td colspan="5">货款小计</td><td colspan="2">'+yuan(o.subtotal)+'</td></tr>'+
      '<tr class="mpo-sum-row"><td colspan="5">运费</td><td colspan="2">'+yuan(o.shipping_fee)+'</td></tr>'+
      '<tr class="mpo-grand-total"><td colspan="5"><strong>合计</strong></td><td colspan="2"><strong>'+yuan(o.total)+'</strong></td></tr>'+
      '<tr class="mpo-money-words"><td colspan="7"><b>金额（大写）：</b>'+safe(upperMoney(o.total))+'</td></tr></tbody></table>'+
    '<div class="mpo-terms">'+
      '<div class="mpo-clause"><strong>二、交货日期：</strong><span>'+safe(o.delivery_date||'双方另行确认')+'</span></div>'+
      '<div class="mpo-clause"><strong>三、交货地点：</strong><span>'+safe(o.delivery_address||'双方另行确认')+'</span></div>'+
      '<div class="mpo-clause"><strong>四、付款方式：</strong><span>'+safe(o.payment_terms||'双方另行约定')+'</span></div>'+
      '<div class="mpo-clause"><strong>五、包装及质量：</strong><span>'+safe([o.quality_terms,o.packaging_terms].filter(Boolean).join('\n'))+'</span></div>'+
      '<div class="mpo-clause"><strong>六、其他条款：</strong><span>'+safe(o.other_terms||'双方另行约定')+'</span></div>'+
    '</div>'+
    '<div class="mpo-signatures">'+
      '<section class="mpo-sign-block mpo-buyer-block">'+buyerBlock+
        '<div class="mpo-seal-zone"><span>甲方盖章：</span>'+
        (seal?'<img class="mpo-buyer-seal" src="'+safe(o.buyer_stamp_url)+'" alt="甲方上传的公章" crossorigin="anonymous">':'<span class="mpo-empty-seal">（待盖章）</span>')+
        '</div></section>'+
      '<section class="mpo-sign-block">'+supplierBlock+
        '<div class="mpo-seal-zone"><span>乙方签字 / 盖章：</span></div></section>'+
    '</div>'+
    '<p class="mpo-document-footnote">本合同经双方核对并签署 / 盖章后使用；合同内容及印章以实际授权文件为准。</p>'+
  '</article>';
}
async function getOrder(id){const res=await api('/material-purchase-orders/'+encodeURIComponent(id));return res.order}
window.previewMaterialPurchaseContract=async function(id){
  try{
    currentOrder=await getOrder(id);
    openModal('包材订货合同 · '+currentOrder.order_no,
      '<div class="row" style="gap:9px;justify-content:flex-end;margin-bottom:12px">'+
      btn('甲方资料 / 公章管理','editMaterialContractProfile()')+
      btn('修改合同内容',"editMaterialPurchaseContract('"+safe(id)+"')")+
      btn('打印 / 保存 PDF','printMaterialPurchaseContract()',true)+'</div>'+
      paperMarkup(currentOrder));
  }catch(e){toastMsg('获取合同失败：'+e.message)}
};
window.printMaterialPurchaseContract=function(){
  if(!currentOrder)return;
  const w=window.open('','_blank');
  if(!w){toastMsg('请允许弹出窗口后再打印');return}
  const cssText=[...document.querySelectorAll('style')].map(x=>x.textContent||'').join('\n');
  const extra='<style>@page{size:A4;margin:12mm}html,body{background:white!important;margin:0;padding:0;font-family:"Microsoft YaHei","SimSun",sans-serif}.mpo-paper{box-sizing:border-box;max-width:none;width:100%;padding:0;border:0;box-shadow:none;margin:0}.mpo-material-thumb{max-height:17mm}.mpo-signatures{break-inside:avoid}.mpo-product-row{break-inside:avoid}</style>';
  w.document.open();
  w.document.write('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe(currentOrder.order_no)+' 订货合同</title><style>'+cssText+'</style>'+extra+'</head><body>'+paperMarkup(currentOrder)+'</body></html>');
  w.document.close();
  const printWhenReady=async()=>{
    try{await Promise.all([...w.document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve})));}catch(_){}
    w.focus();w.print();
  };
  if(w.document.readyState==='complete')printWhenReady();
  else w.addEventListener('load',printWhenReady,{once:true});
};
window.editMaterialPurchaseContract=async function(id){
  try{
    const o=await getOrder(id);
    const fields=[
      ['buyer_company','甲方公司','text'],['buyer_address','甲方地址','text'],
      ['buyer_phone','甲方电话','text'],['buyer_representative','甲方委托代表人','text'],
      ['buyer_sign_date','甲方签订日期','date'],['supplier_address','乙方地址','text'],
      ['supplier_phone','乙方电话','text'],['supplier_representative','乙方委托代表人','text'],
      ['supplier_sign_date','乙方签订日期','date'],['sign_location','签约地点','text'],
      ['delivery_date','交货日期','date'],['delivery_address','交货地点','text'],
      ['payment_terms','付款条款','textarea'],['quality_terms','质量要求','textarea'],
      ['packaging_terms','包装与运输','textarea'],['other_terms','违约及其他条款','textarea'],['notes','内部备注','textarea']
    ];
    const body=fields.map(([field,label,type])=>'<label class="'+(type==='textarea'?'full':'')+'">'+label+
      (type==='textarea'?'<textarea class="field" name="'+field+'" rows="3">'+safe(o[field])+'</textarea>':'<input class="field" name="'+field+'" type="'+type+'" value="'+safe(o[field])+'">')+'</label>').join('');
    const itemRows=(o.items||[]).map(it=>'<div class="mpo-line mpo-contract-item" data-id="'+safe(it.id)+'">'+
      '<b>'+safe(it.material_name)+'</b> <span class="small muted">已入库 '+n(it.received_qty)+' / '+n(it.quantity)+' '+safe(it.unit)+'</span>'+
      '<div class="mpo-line-grid" style="margin-top:8px"><label>数量<input type="number" class="field mpo-eqty" min="'+Math.max(1,n(it.received_qty))+'" step="1" value="'+n(it.quantity)+'"></label>'+
      '<label>未税单价 / 元<input type="number" class="field mpo-eprice" min="0" step="0.01" value="'+n(it.unit_price)+'"></label>'+
      '<label>材质<input class="field mpo-egrade" value="'+safe(it.material_grade)+'"></label>'+
      '<label>产品规格<input class="field mpo-espec" value="'+safe(it.material_spec)+'"></label></div>'+
      '<label>工艺 / 备注<input class="field mpo-eremarks" value="'+safe(it.remarks)+'"></label></div>').join('');
    openModal('编辑包材订货合同 · '+safe(o.order_no),'<div class="mpo-note" style="margin-bottom:12px">修改后需点击保存，修改内容保存在云端。已收货数量不会被修改；未入库时可以调整订货数量及价格。</div>'+
      '<form id="materialContractEditForm" class="form">'+
      '<div class="full"><b>材料明细</b><div class="mpo-lines" style="margin-top:8px">'+itemRows+'</div></div>'+
      '<div class="full mpo-note">甲方资料可在「甲方资料 / 公章管理」保存为今后采购单默认值；下方信息仅对当前合同生效。乙方资料默认读取供应商档案，也可为此合同单独修改。</div>'+
      body+
      '<label class="full mpo-stamp-toggle"><input type="checkbox" name="seal_enabled" '+(o.seal_enabled!==false?'checked':'')+'><span>打印此合同时显示已上传的甲方真实公章（'+(o.has_buyer_stamp?'已上传':'尚未上传')+'）</span></label>'+
      '<div class="actions full"><button type="button" class="btn" onclick="previewMaterialPurchaseContract(\''+safe(id)+'\')">取消</button><button class="btn primary">保存修改并预览</button></div></form>');
    el('materialContractEditForm').onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries());
      d.seal_enabled=!!f.querySelector('[name=seal_enabled]')?.checked;
      d.items=[...f.querySelectorAll('.mpo-contract-item')].map(row=>({
        id:row.dataset.id,quantity:Number(row.querySelector('.mpo-eqty').value),
        unit_price:Number(row.querySelector('.mpo-eprice').value),
        material_grade:row.querySelector('.mpo-egrade').value,
        material_spec:row.querySelector('.mpo-espec').value,
        remarks:row.querySelector('.mpo-eremarks').value
      }));
      if(d.items.some(x=>!Number.isInteger(x.quantity)||x.quantity<=0||x.unit_price<0||!Number.isFinite(x.unit_price))){toastMsg('合同数量、单价格式不正确');return}
      const submit=f.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='正在保存…';
      try{await api('/material-purchase-orders/'+encodeURIComponent(id)+'/contract',{method:'PUT',body:JSON.stringify(d)});
        await loadPurchaseOrders();await previewMaterialPurchaseContract(id);toastMsg('合同修改已保存到云端')
      }catch(err){toastMsg('保存失败：'+err.message);submit.disabled=false;submit.textContent='保存修改并预览'}
    };
  }catch(e){toastMsg('打开编辑器失败：'+e.message)}
};
window.editMaterialContractProfile=async function(){
  try{
    const response=await api('/material-contract-profile'),p=response.profile||{};
    const fields=[['company_name','甲方公司名称'],['address','甲方公司地址'],
      ['phone','甲方联系电话'],['representative','甲方委托代表人']];
    const formFields=fields.map(([field,label])=>'<label class="'+(field==='address'?'full':'')+'">'+label+
      '<input class="field" name="'+field+'" required value="'+safe(p[field]||'')+'"></label>').join('');
    openModal('甲方资料与公章管理',
      '<div class="mpo-note full" style="margin-bottom:12px">这里保存的是今后新建包材采购单的默认甲方信息。上传真实、已经授权使用的公章后可在合同预览中显示；未上传时保持空白盖章位。注意：当前系统尚未配置严格的登录权限，正式公章属于敏感文件，建议先设置 Cloudflare Access 访问保护。</div>'+
      '<form id="materialBuyerProfileForm" class="form">'+formFields+
      '<div class="actions full"><button type="button" class="btn" onclick="closeModal()">取消</button><button type="submit" class="btn primary">保存甲方资料</button></div></form>'+
      '<div class="mpo-stamp-manager"><b>甲方公章图片（仅接受上传的真实公章）</b>'+
      '<p class="small muted">支持PNG透明背景 / JPG / WebP，最大2MB。公章可能随合同打印输出，请确认用途和授权。</p>'+
      '<div id="mpoStampPreview">'+(p.has_stamp?'<img alt="已保存公章" class="mpo-stamp-manager-img" src="/api/material-contract-profile/stamp?v='+encodeURIComponent(p.updated_at||'')+'">':'<span class="muted small">尚未上传公章</span>')+'</div>'+
      '<div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn" style="cursor:pointer">选择公章图片<input type="file" accept="image/png,image/jpeg,image/webp" id="mpoStampFile" style="display:none"></label>'+
      '<button type="button" class="btn primary" id="mpoStampUpload" onclick="uploadMaterialContractStamp()">上传并保存公章</button>'+
      (p.has_stamp?'<button type="button" class="btn danger" onclick="deleteMaterialContractStamp()">删除已保存公章</button>':'')+'</div></div>');
    el('materialBuyerProfileForm').onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget,button=f.querySelector('button[type=submit]');
      button.disabled=true;
      try{await api('/material-contract-profile',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(f).entries()))});
        toastMsg('甲方资料已保存，今后新建合同自动引用');}
      catch(err){toastMsg('保存失败：'+err.message)}
      finally{button.disabled=false}
    };
  }catch(err){toastMsg('读取甲方资料失败：'+err.message)}
};
window.uploadMaterialContractStamp=async function(){
  const file=el('mpoStampFile')?.files?.[0];
  if(!file){toastMsg('请先选择真实公章图片');return}
  if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
    toastMsg('公章仅支持2MB以内PNG、JPG、WebP');return
  }
  if(!confirm('请确认此公章真实、已获授权，并知悉当前工作台未配置严格登录保护。确定上传到云端吗？'))return;
  const button=el('mpoStampUpload');if(button)button.disabled=true;
  try{
    const fd=new FormData();fd.append('file',file);
    const response=await fetch('/api/material-contract-profile/stamp',{method:'POST',body:fd,cache:'no-store'});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'上传失败');
    toastMsg('公章已保存，合同可选择显示');await editMaterialContractProfile()
  }catch(err){toastMsg('公章保存失败：'+err.message)}
  finally{if(button)button.disabled=false}
};
window.deleteMaterialContractStamp=async function(){
  if(!confirm('确定删除云端保存的甲方公章吗？此前合同打印也将不再自动显示该公章。'))return;
  try{await api('/material-contract-profile/stamp',{method:'DELETE'});toastMsg('云端公章已删除');await editMaterialContractProfile()}
  catch(err){toastMsg('删除失败：'+err.message)}
};
window.receiveMaterialPurchase=async function(id){
  try{
    const o=await getOrder(id);
    const openItems=o.items.filter(it=>n(it.quantity)>n(it.received_qty));
    if(!openItems.length){toastMsg('该采购单已经全部入库');return}
    const rows=openItems.map(it=>{
      const remain=n(it.quantity)-n(it.received_qty);
      return '<div class="mpo-line mpo-receive" data-id="'+safe(it.id)+'"><b>'+safe(it.material_name)+'</b>'+
        '<div class="small muted">已入库 '+n(it.received_qty).toLocaleString()+' / 订货 '+n(it.quantity).toLocaleString()+'；剩余 '+remain.toLocaleString()+'</div>'+
        '<label>本次收货（'+safe(it.unit)+'）<input class="field mpo-rqty" type="number" min="0" max="'+remain+'" step="1" value="'+remain+'"></label></div>'
    }).join('');
    openModal('确认包材到货 · '+safe(o.order_no),'<div class="mpo-note" style="margin-bottom:12px">这里是唯一会增加包材库存的操作。确认后自动生成包材库存流水，不会更改成品库存。</div>'+
      '<form id="materialReceiveForm" class="form"><div class="full mpo-lines">'+rows+'</div>'+
      '<label class="full">收货备注<input class="field" name="notes" placeholder="质检记录、送货单号等"></label>'+
      '<div class="actions full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary">确认收货并入库</button></div></form>');
    // Retain the same request ID across retries so a network timeout cannot double receive.
    const receiptRequestId=crypto.randomUUID();
    el('materialReceiveForm').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget;
      const items=[...form.querySelectorAll('.mpo-receive')].map(row=>({id:row.dataset.id,quantity:Number(row.querySelector('.mpo-rqty').value)})).filter(it=>it.quantity>0);
      if(!items.length){toastMsg('请填写至少一项入库数量');return}
      if(!confirm('确认将 '+items.reduce((s,x)=>s+x.quantity,0).toLocaleString()+' 件包装辅料计入库存并写入流水吗？'))return;
      const submit=form.querySelector('button[type=submit]');submit.disabled=true;
      try{await api('/material-purchase-orders/'+encodeURIComponent(id)+'/receive',{method:'POST',body:JSON.stringify({request_id:receiptRequestId,items,notes:form.querySelector('[name=notes]').value})});
        closeModal();await load(true);await loadPurchaseOrders();render();toastMsg('包材已入库，库存流水已记录')
      }catch(err){toastMsg('入库失败：'+err.message);submit.disabled=false}
    }
  }catch(e){toastMsg('读取收货明细失败：'+e.message)}
};
})();
