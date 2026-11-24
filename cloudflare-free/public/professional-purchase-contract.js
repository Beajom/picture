/* Professional purchase contract, attached to existing Amazon Supply finished-goods POs. */
(function(){
'use strict';
const VERSION='20261124';
const fields=[
  ['contract_no','合同编号'],['contract_title','合同名称'],['sign_date','签约日期'],['sign_location','签约地点'],
  ['buyer_company','需方公司'],['buyer_address','需方地址'],['buyer_phone','需方电话'],['buyer_representative','需方代表'],
  ['supplier_company','供方公司'],['supplier_address','供方地址'],['supplier_phone','供方电话'],['supplier_representative','供方代表'],
  ['supplier_bank','供方开户行'],['supplier_account','供方收款账号'],
  ['delivery_address','交货地点'],['transport_terms','运输方式及费用'],['payment_terms','付款时间与方式'],
  ['quality_terms','质量标准'],['packaging_terms','包装及标识'],['acceptance_terms','检验与验收'],
  ['supplier_liability','供方责任'],['buyer_liability','需方责任'],['invoice_terms','单据及发票'],
  ['amendment_terms','合同变更'],['dispute_terms','争议解决'],['other_terms','其他条款'],
  ['signed_on_buyer','需方签署日期'],['signed_on_supplier','供方签署日期'],['sign_note','附件及补充约定']
];
const groups=[
 ['合同信息',['contract_no','contract_title','sign_date','sign_location']],
 ['需方（采购方）',['buyer_company','buyer_address','buyer_phone','buyer_representative']],
 ['供方（供应商）',['supplier_company','supplier_address','supplier_phone','supplier_representative','supplier_bank','supplier_account']],
 ['交付与付款',['delivery_address','transport_terms','payment_terms']],
 ['质量、责任与其他合同条款',['quality_terms','packaging_terms','acceptance_terms','supplier_liability','buyer_liability','invoice_terms','amendment_terms','dispute_terms','other_terms']],
 ['签署信息',['signed_on_buyer','signed_on_supplier','sign_note']]
];
const multi=new Set(['transport_terms','payment_terms','quality_terms','packaging_terms','acceptance_terms','supplier_liability','buyer_liability','invoice_terms','amendment_terms','dispute_terms','other_terms','sign_note']);
const wide=new Set(['buyer_company','buyer_address','supplier_company','supplier_address','supplier_bank','supplier_account','delivery_address','contract_title']);
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanCurrency=n=>'¥'+(Number(n)||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const readDate=s=>String(s||'').slice(0,10);
const dateCN=v=>{const m=readDate(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[1]+'年'+Number(m[2])+'月'+Number(m[3])+'日':String(v||'')};
const currencyUpper=v=>{
  const number=Math.round((Number(v)||0)*100)/100;
  if(number<0||!Number.isFinite(number))return '待确认';
  const d=['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'],u=['','拾','佰','仟'],big=['','万','亿','兆'];
  const group=num=>{let result='',zero=false;for(let i=3;i>=0;i--){const n=Math.floor(num/10**i)%10;if(n){if(zero&&result)result+='零';result+=d[n]+u[i];zero=false}else if(result)zero=true}return result};
  let int=Math.floor(number),segments=[],index=0;
  if(!int)segments=['零'];
  while(int>0){const n=int%10000;segments.unshift(n?group(n)+(big[index]||''):'零');int=Math.floor(int/10000);index++}
  let result=segments.join('').replace(/零+/g,'零').replace(/零$/,'')+'元';
  const jiao=Math.floor(Math.round(number*100)%100/10),fen=Math.round(number*100)%10;
  if(!jiao&&!fen)return result+'整';
  if(jiao)result+=d[jiao]+'角';else if(fen)result+='零';
  if(fen)result+=d[fen]+'分';
  return result;
};
async function getJSON(url,options){
  const response=await fetch(url,{cache:'no-store',...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'云端请求失败（HTTP '+response.status+'）');
  return body;
}
function defaults(order,profile){
  const day=readDate(order.order_date)||'';
  return {
    contract_no:'CGHT-'+String(order.order_no||'').replace(/^PO-/,''),
    contract_title:'出口产品购货合同',sign_date:day,sign_location:'',
    buyer_company:profile.company_name||'义乌市时盈电子商务有限公司',
    buyer_address:profile.address||'',buyer_phone:profile.phone||'',buyer_representative:profile.representative||'',
    supplier_company:order.supplier_name||'',supplier_address:order.company_address||'',
    supplier_phone:order.supplier_phone||'',supplier_representative:order.supplier_contact||'',
    supplier_bank:order.bank_name||'',supplier_account:order.bank_account||'',
    delivery_address:'',
    transport_terms:'货物运输方式、运费承担、运输保险及风险转移，以双方书面确认的发货安排为准。',
    payment_terms:order.payment_terms||'待双方书面确认付款比例、付款节点、收款账户及付款条件。',
    quality_terms:'按双方确认的样品、产品规格、技术要求和适用的产品质量标准生产。供方应对交付产品的质量负责。',
    packaging_terms:'内外包装、标签、条码、装箱数量和印刷样稿，以双方最终确认的包装文件为准；费用承担由双方书面约定。',
    acceptance_terms:'需方按双方确认的产品规格、数量及质量要求验收；如发现数量短缺、规格不符或质量问题，双方应及时核实并协商退换、补货或其他处理方式。',
    supplier_liability:'供方应按约定时间、质量和数量交货。因供方原因发生延期、缺货或质量问题，应及时采取合理补救措施，并依法承担相应责任。',
    buyer_liability:'需方应及时确认生产资料、指定收货安排并按约定付款；因需方变更产品或交付要求而产生的影响，由双方书面协商处理。',
    invoice_terms:'送货单、出库单、检验资料及发票类型、含税方式、税率和开票时间，以双方明确的书面约定为准。',
    amendment_terms:'合同变更、解除或补充，应经双方协商一致并以书面方式确认；双方最后确认的书面文件可作为本合同附件。',
    dispute_terms:'履行本合同发生争议，双方先协商解决；协商不成时，依法向有管辖权的人民法院提起诉讼。',
    other_terms:'本合同一式两份，供需双方各执一份。双方签字或依法加盖印章后生效；电子签署及其他签订方式按适用法律及双方约定办理。',
    signed_on_buyer:day,signed_on_supplier:day,sign_note:'',
    show_buyer_stamp:false
  };
}
function safeProductImage(value){
  const str=String(value||'');
  if(/^https:\/\//i.test(str)||str.startsWith('/api/images/'))return str;
  return '';
}
function renderContract(order,profile,f){
  const subtotal=(order.items||[]).reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.unit_price||0),0);
  const freight=Number(order.shipping_fee)||0,total=subtotal+freight;
  const colLabel=(label,text)=>'<div class="contract-party-detail"><label>'+escapeText(label)+'</label><span>'+escapeText(text||'')+'</span></div>';
  const pair=(title,name,address,rep,phone,date,bank,account,stamp)=>
    '<div class="party"><h4>'+title+'</h4>'+
    colLabel('单位名称：',name)+colLabel('单位地址：',address)+
    colLabel('委托代表：',rep)+colLabel('联系电话：',phone)+
    (bank?colLabel('开户银行：',bank):'')+(account?colLabel('收款账号：',account):'')+
    colLabel('签署日期：',dateCN(date))+
    '<div class="contract-signature-bottom">签字 / 盖章：</div>'+
    (stamp?'<img class="contract-stamp" alt="甲方已上传的公章" src="/api/material-contract-profile/stamp?v='+VERSION+'">':'')+'</div>';
  const clauses=[
    ['二、质量标准、验收方法',f.quality_terms+'\n'+f.acceptance_terms],
    ['三、包装要求及费用负担',f.packaging_terms],
    ['四、收货单位及交付地点',f.delivery_address||'交付地点待双方书面确认。'],
    ['五、运输方式及费用负担',f.transport_terms],
    ['六、付款时间及付款方式',f.payment_terms],
    ['七、供方经济责任',f.supplier_liability],
    ['八、需方经济责任',f.buyer_liability],
    ['九、交付文件及发票',f.invoice_terms],
    ['十、合同变更与解除',f.amendment_terms],
    ['十一、争议解决',f.dispute_terms],
    ['十二、其他条款及补充说明',f.other_terms+(f.sign_note?'\n补充约定：'+f.sign_note:'')]
  ];
  const items=(order.items||[]).map((item,index)=>{
    const image=safeProductImage(item.image_url||item.parent_image_url);
    const mdl=String(item.internal_code||'').split('-')[0],spec=[item.color,item.size].filter(Boolean).join(' / ');
    return '<tr><td class="center">'+(index+1)+'</td>'+
      '<td class="center">'+(image?'<img src="'+escapeText(image)+'" style="width:13mm;height:13mm;max-width:100%;object-fit:contain" alt="产品图片">':'—')+'</td>'+
      '<td>'+escapeText(mdl||'—')+'<div class="sku">'+escapeText(item.sku||'')+'</div></td>'+
      '<td>'+escapeText(item.product_name||'')+'</td>'+
      '<td>'+escapeText(spec||'—')+'</td>'+
      '<td class="center">'+Number(item.quantity||0).toLocaleString('zh-CN')+' 双</td>'+
      '<td class="money">'+cleanCurrency(item.unit_price)+'</td>'+
      '<td class="money">'+cleanCurrency(Number(item.quantity||0)*Number(item.unit_price||0))+'</td></tr>'
  }).join('');
  return '<header><div class="contract-company">'+escapeText(f.buyer_company||'需方单位')+'</div>'+
    '<h1 class="contract-document-title">'+escapeText(f.contract_title||'出口产品购货合同')+'</h1></header>'+
    '<div class="contract-head"><div class="contract-opening">根据《中华人民共和国民法典》及其他适用法律法规，供需双方本着平等、自愿和诚实信用原则，经友好协商，就下列产品采购事宜签订本合同，双方共同遵守。</div>'+
    '<div class="contract-head-meta">'+
    '<div><strong>合同编号：</strong><span>'+escapeText(f.contract_no)+'</span></div>'+
    '<div><strong>签约日期：</strong><span>'+escapeText(dateCN(f.sign_date))+'</span></div>'+
    '<div><strong>签约地点：</strong><span>'+escapeText(f.sign_location||'待双方确认')+'</span></div>'+
    '<div><strong>采购单号：</strong><span>'+escapeText(order.order_no||'')+'</span></div></div></div>'+
    '<h3 class="contract-section-title">一、品名、规格、数量、金额、交货日期</h3>'+
    '<table class="contract-line-table"><colgroup><col style="width:6%"><col style="width:10%"><col style="width:15%"><col style="width:19%"><col style="width:13%"><col style="width:13%"><col style="width:12%"><col style="width:12%"></colgroup>'+
    '<thead><tr><th>序号</th><th>图片</th><th>型号 / SKU</th><th>产品品名</th><th>颜色 / 尺码</th><th>数量</th><th>未税单价</th><th>未税金额</th></tr></thead>'+
    '<tbody>'+items+'</tbody></table>'+
    '<div class="contract-total-row"><span>预计交货日期：'+escapeText(dateCN(order.expected_date)||'待双方确认')+'　　货款小计：'+cleanCurrency(subtotal)+'　　运费：'+cleanCurrency(freight)+'</span><strong>合计：'+cleanCurrency(total)+'</strong></div>'+
    '<div class="contract-uppercase-row"><span>金额合计（人民币大写）：<strong>'+escapeText(currencyUpper(total))+'</strong></span><span>小写：<strong>'+cleanCurrency(total)+'</strong></span></div>'+
    '<div class="contract-clauses">'+clauses.map(([name,value])=>
      '<div class="contract-clause"><strong>'+escapeText(name)+'</strong><span>'+escapeText(value)+'</span></div>'
    ).join('')+'</div>'+
    '<div class="contract-signatures">'+
    pair('需方（采购方）',f.buyer_company,f.buyer_address,f.buyer_representative,f.buyer_phone,f.signed_on_buyer,'','',profile.has_stamp&&f.show_buyer_stamp)+
    pair('供方（供应商）',f.supplier_company,f.supplier_address,f.supplier_representative,f.supplier_phone,f.signed_on_supplier,f.supplier_bank,f.supplier_account,false)+
    '</div>'+
    '<p class="contract-print-note">本合同与采购单及双方确认的样品、技术文件、包装资料和补充协议共同使用；具体签署内容以双方最终确认的文件为准。</p>';
}
function formMarkup(f,profile){
  return '<h2>专业购货合同 · 编辑</h2><p>填写或修改条款，右侧 A4 预览会同步更新。保存后可在其他设备读取相同合同。</p>'+
  groups.map(([group,keys])=>
    '<h3>'+escapeText(group)+'</h3><div class="contract-edit-fields">'+keys.map(key=>{
      const info=fields.find(x=>x[0]===key),title=info?.[1]||key;
      return '<label class="'+(wide.has(key)||multi.has(key)?'wide':'')+'">'+escapeText(title)+
        (multi.has(key)?
          '<textarea data-field="'+key+'" rows="'+(key==='other_terms'?4:3)+'">'+escapeText(f[key]||'')+'</textarea>':
          '<input data-field="'+key+'" value="'+escapeText(f[key]||'')+'">')+'</label>'
    }).join('')+'</div>'
  ).join('')+
  '<h3>公章及合同保存</h3><div class="contract-edit-fields">'+
    '<label class="contract-checkbox wide"><input type="checkbox" data-field="show_buyer_stamp" '+(f.show_buyer_stamp?'checked':'')+' '+(profile.has_stamp?'':'disabled')+'>'+
    '<span>打印显示已上传的甲方真实公章'+(profile.has_stamp?'':'（尚未上传）')+'</span></label></div>'+
    '<p class="contract-editor-note">合同金额和产品明细直接读取采购单，不在合同里单独改价。未税单价、运费、交期等如需变更，请先核对原采购单。合同涉及法律责任，签署前应由双方审阅确认。</p>';
}
async function loadContract(id,windowHandle){
  const base='/api/purchase-orders/'+encodeURIComponent(id);
  const [order,contract,profResponse]=await Promise.all([
    getJSON(base),getJSON(base+'/contract'),
    getJSON('/api/material-contract-profile').catch(()=>({profile:{}}))
  ]);
  const profile=profResponse.profile||{};
  const fieldsValue=Object.assign(defaults(order,profile),contract.fields||{});
  if(!profile.has_stamp)fieldsValue.show_buyer_stamp=false;
  const w=windowHandle;
  if(w.closed)return;
  const stylesheet=new URL('/professional-purchase-contract.css?v='+VERSION,location.origin).href;
  const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><base href="'+location.origin+'/">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeText(fieldsValue.contract_no)+' 出口产品购货合同</title>'+
    '<link rel="stylesheet" href="'+stylesheet+'"></head><body>'+
    '<div class="contract-toolbar"><div class="contract-toolbar-title"><strong>出口产品购货合同 · '+escapeText(order.order_no)+'</strong>'+
    '<small>正式合同与普通采购单 PDF 独立保存</small></div>'+
    '<div class="contract-actions"><span class="contract-save-state '+(contract.saved?'saved':'')+'" id="contractSaveStatus">'+(contract.saved?'已读取云端合同':'尚未保存合同')+'</span>'+
    '<button id="contractShowPreview" class="contract-btn" type="button">只看 A4</button>'+
    '<button id="contractSave" class="contract-btn" type="button">保存到云端</button>'+
    '<button id="contractPrint" class="contract-btn primary" type="button">A4 打印 / 保存 PDF</button>'+
    '<button id="contractClose" class="contract-btn" type="button">关闭</button></div></div>'+
    '<div class="contract-layout"><aside class="contract-editor" id="contractEditor">'+formMarkup(fieldsValue,profile)+'</aside>'+
    '<div class="contract-document-wrap"><article class="contract-paper" id="contractPaper">'+renderContract(order,profile,fieldsValue)+'</article></div></div>'+
    '</body></html>';
  w.document.open();w.document.write(html);w.document.close();
  const doc=w.document,saveStatus=doc.getElementById('contractSaveStatus');
  const refresh=()=>{
    doc.getElementById('contractPaper').innerHTML=renderContract(order,profile,fieldsValue);
    doc.title=(fieldsValue.contract_no||order.order_no)+' 出口产品购货合同';
    saveStatus.textContent='有未保存修改';saveStatus.className='contract-save-state';
  };
  doc.querySelectorAll('[data-field]').forEach(input=>{
    input.addEventListener('input',()=>{
      const name=input.dataset.field;
      fieldsValue[name]=input.type==='checkbox'?input.checked:input.value;
      refresh();
    });
  });
  const persist=async()=>{
    const save=doc.getElementById('contractSave'),print=doc.getElementById('contractPrint');
    save.disabled=true;print.disabled=true;saveStatus.textContent='正在保存云端合同…';
    try{
      const result=await getJSON(base+'/contract',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:fieldsValue})});
      saveStatus.textContent='✓ 云端已保存'+(result.updated_at?' · '+result.updated_at.replace('T',' ').slice(0,19):'');
      saveStatus.className='contract-save-state saved';
      return true;
    }catch(e){
      saveStatus.textContent='保存失败：'+e.message;saveStatus.className='contract-save-state error';
      return false;
    }finally{save.disabled=false;print.disabled=false}
  };
  doc.getElementById('contractSave').addEventListener('click',persist);
  doc.getElementById('contractPrint').addEventListener('click',async()=>{
    if(!(await persist())){
      if(!w.confirm('合同尚未保存到云端。仍要打印当前草稿吗？'))return;
    }
    await Promise.all([...doc.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve})));
    w.focus();w.print();
  });
  doc.getElementById('contractShowPreview').addEventListener('click',()=>{
    const active=doc.body.classList.toggle('preview-only');
    doc.getElementById('contractShowPreview').textContent=active?'显示编辑区':'只看 A4';
  });
  doc.getElementById('contractClose').addEventListener('click',()=>w.close());
}
window.openProfessionalPurchaseContract=function(id){
  const popup=window.open('','_blank','width=1380,height=900');
  if(!popup){alert('请允许弹出窗口，以打开专业采购合同');return}
  popup.document.write('<!doctype html><meta charset="utf-8"><p style="font:14px Microsoft YaHei,Arial;padding:28px;color:#526783">正在读取采购单、供应商信息及云端合同…</p>');
  loadContract(id,popup).catch(err=>{
    if(popup.closed)return;
    popup.document.body.innerHTML='<p style="font:14px Microsoft YaHei,Arial;padding:30px;color:#b42318">合同打开失败：'+escapeText(err.message)+'</p>';
  });
};
// Keep the ordinary purchase-order PDF available; route “采购合同” to this professional template.
window.previewPurchaseContract=window.openProfessionalPurchaseContract;
})();