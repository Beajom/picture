import fs from "node:fs/promises";

const file = new URL("../public/index.html", import.meta.url);
let html = await fs.readFile(file, "utf8");
let changed = false;

// Add a purchase-contract action beside the existing PO actions.
const purchaseOld = "<button class=\"btn\" style=\"padding:5px 10px;margin:0 6px;color:#2563eb;border-color:#bfdbfe;background:#eff6ff\" onclick=\"previewPOPDF(\\'" + "+o.id+" + "\\')\">PDF预览</button><button class=\"link red\" onclick=\"delPO(\\'" + "+o.id+" + "\\')\">删除</button>";
const purchaseNew = "<button class=\"btn\" style=\"padding:5px 10px;margin:0 6px;color:#2563eb;border-color:#bfdbfe;background:#eff6ff\" onclick=\"previewPOPDF(\\'" + "+o.id+" + "\\')\">PDF预览</button><button class=\"btn\" style=\"padding:5px 10px;margin-right:6px;color:#7c3aed;border-color:#ddd6fe;background:#f5f3ff\" onclick=\"previewPurchaseContract(\\'" + "+o.id+" + "\\')\">采购合同</button><button class=\"link red\" onclick=\"delPO(\\'" + "+o.id+" + "\\')\">删除</button>";
if (!html.includes("onclick=\"previewPurchaseContract")) {
  if (!html.includes(purchaseOld)) {
    console.error("Could not locate purchase list action block");
    process.exit(2);
  }
  html = html.replace(purchaseOld, purchaseNew);
  changed = true;
}

// Add contract button in the purchase-order detail modal.
const detailOld = "<div class=\\\"actions\\\" style=\\\"margin-top:16px\\\"><button class=\\\"btn\\\" onclick=\\\"closeModal()\\\">关闭</button><button class=\\\"btn primary\\\" onclick=\\\"previewPOPDF(\\\\\\'" + "+o.id+" + "\\\\\\')\\\">PDF预览</button></div>";
const detailNew = "<div class=\\\"actions\\\" style=\\\"margin-top:16px\\\"><button class=\\\"btn\\\" onclick=\\\"closeModal()\\\">关闭</button><button class=\\\"btn\\\" style=\\\"color:#7c3aed;border-color:#ddd6fe;background:#f5f3ff\\\" onclick=\\\"previewPurchaseContract(\\\\\\'" + "+o.id+" + "\\\\\\')\\\">采购合同</button><button class=\\\"btn primary\\\" onclick=\\\"previewPOPDF(\\\\\\'" + "+o.id+" + "\\\\\\')\\\">PDF预览</button></div>";
if (!html.includes("采购合同</button><button class=\\\"btn primary\\\" onclick=\\\"previewPOPDF")) {
  if (html.includes(detailOld)) {
    html = html.replace(detailOld, detailNew);
    changed = true;
  } else {
    console.warn("Purchase detail action block not found; list action will still be available.");
  }
}

if (!html.includes("function previewPurchaseContract(id){")) {
  const marker = "async function delPO(id){";
  const pos = html.indexOf(marker);
  if (pos < 0) {
    console.error("Could not locate delPO marker");
    process.exit(3);
  }

  const code = String.raw`
function cnUpperMoney(value){
  let n=Number(value||0);
  if(!Number.isFinite(n)||n<0)n=0;
  n=Math.round(n*100)/100;
  const d=['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'];
  const u=['','拾','佰','仟'];
  const big=['','万','亿','兆'];
  const integer=Math.floor(n);
  const jiao=Math.floor(n*10)%10,fen=Math.round(n*100)%10;
  const groupToCN=g=>{
    let out='',zero=false;
    for(let i=3;i>=0;i--){
      const v=Math.floor(g/Math.pow(10,i))%10;
      if(v){if(zero&&out)out+='零';out+=d[v]+u[i];zero=false}else if(out)zero=true
    }
    return out
  };
  let x=integer,parts=[],idx=0;
  if(x===0)parts=['零'];
  while(x>0){const g=x%10000;if(g)parts.unshift(groupToCN(g)+big[idx]);else if(parts.length&&!String(parts[0]).startsWith('零'))parts.unshift('零');x=Math.floor(x/10000);idx++}
  let s=parts.join('').replace(/零+/g,'零').replace(/零$/,'')+'元';
  if(!jiao&&!fen)return s+'整';
  if(jiao)s+=d[jiao]+'角';
  else if(fen)s+='零';
  if(fen)s+=d[fen]+'分';
  return s
}
function contractDateCN(v){
  const s=String(v||'').slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?(m[1]+'年'+Number(m[2])+'月'+Number(m[3])+'日'):s
}
function previewPurchaseContract(id){
  const w=window.open('','_blank','width=1180,height=900');
  if(!w){toastMsg('浏览器阻止了合同预览窗口，请允许弹窗');return}
  w.document.write('<p style="font-family:Arial;padding:24px">正在生成采购合同...</p>');
  api('/purchase-orders/'+id).then(o=>{
    const items=o.items||[];
    const shipping=Number(o.shipping_fee||0);
    const subtotal=items.reduce((s,i)=>s+Number(i.quantity||0)*Number(i.unit_price||0),0);
    const total=subtotal+shipping;
    const contractNo='CGHT-'+String(o.order_no||id).replace(/^PO-/i,'');
    const supplier=cache.suppliers.find(s=>s.id===o.supplier_id)||{};
    const supplierName=o.supplier_name||supplier.company_name||'供应方';
    const supplierAddress=o.company_address||supplier.company_address||'';
    const supplierContact=o.supplier_contact||supplier.contact_name||'';
    const supplierPhone=o.supplier_phone||supplier.phone||'';
    const rows=items.map((i,idx)=>'<tr>'+ 
      '<td>'+(idx+1)+'</td>'+ 
      '<td>'+esc(model(i)||'—')+'<div class="sub">'+esc(i.sku||'')+'</div></td>'+ 
      '<td>'+esc(i.product_name||'')+'</td>'+ 
      '<td>'+esc((i.color||'')+(i.size?(' / '+i.size):''))+'</td>'+ 
      '<td class="num">'+Number(i.quantity||0).toLocaleString()+'</td>'+ 
      '<td class="num">¥ '+Number(i.unit_price||0).toFixed(2)+'</td>'+ 
      '<td class="num">¥ '+(Number(i.quantity||0)*Number(i.unit_price||0)).toFixed(2)+'</td>'+ 
      '<td>'+esc(contractDateCN(o.expected_date)||'按约定')+'</td>'+ 
    '</tr>').join('');
    const payment=esc(o.payment_terms||'按双方确认的付款条件执行');
    const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>'+esc(contractNo)+' 采购合同</title><style>'+ 
      '@page{size:A4;margin:10mm 11mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;font-family:"Microsoft YaHei","SimSun",Arial,sans-serif;color:#111;font-size:12px;line-height:1.65}.toolbar{position:sticky;top:0;z-index:9;background:#111827;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px}.toolbar button{border:0;border-radius:7px;padding:8px 14px;cursor:pointer;background:#2563eb;color:#fff}.toolbar .hint{font-size:12px;color:#d1d5db}.paper{width:210mm;min-height:297mm;margin:18px auto;background:#fff;padding:10mm 12mm;box-shadow:0 8px 28px #0002}.company{text-align:center;font-size:24px;font-weight:800;letter-spacing:2px;margin-top:0}.contract-title{text-align:center;font-size:26px;font-weight:900;letter-spacing:6px;margin:2px 0 12px}.intro{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start}.meta{border:1px solid #111}.meta div{display:grid;grid-template-columns:82px 1fr;border-bottom:1px solid #111}.meta div:last-child{border-bottom:0}.meta b,.meta span{padding:4px 6px}.meta b{border-right:1px solid #111;background:#fafafa}.legal{padding:4px 0}.ctable{width:100%;border-collapse:collapse;margin:8px 0}.ctable th,.ctable td{border:1px solid #111;padding:5px 6px;vertical-align:middle}.ctable th{text-align:center;background:#fafafa}.num{text-align:right;white-space:nowrap}.sub{font-size:10px;color:#555}.totals{width:100%;border-collapse:collapse;margin-top:-1px}.totals td{border:1px solid #111;padding:5px 7px}.totals .label{width:120px;background:#fafafa;font-weight:700}.clauses{margin-top:8px}.clause{display:grid;grid-template-columns:105px 1fr;gap:4px;margin:4px 0}.clause b{font-weight:700}.parties{width:100%;border-collapse:collapse;margin-top:12px}.parties th,.parties td{border:1px solid #111;padding:5px 7px;vertical-align:top}.parties th{font-size:16px;width:50%;background:#fafafa}.party-line{display:grid;grid-template-columns:90px 1fr;min-height:27px;border-bottom:1px solid #ddd;align-items:center}.party-line:last-child{border-bottom:0}.seal{height:58px;padding-top:8px}.editable{outline:none}.editable:focus{box-shadow:inset 0 0 0 2px #bfdbfe}.note{font-size:10px;color:#666;margin-top:6px}@media print{body{background:#fff}.toolbar{display:none}.paper{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.editable:focus{box-shadow:none}}'+ 
      '</style></head><body><div class="toolbar"><div><b>采购合同预览</b><div class="hint">合同正文可直接点击修改；确认后点击右侧按钮打印或另存为 PDF</div></div><button onclick="window.print()">打印 / 保存PDF</button></div>'+ 
      '<div class="paper editable" contenteditable="true">'+ 
      '<div class="company">义乌市时盈电子商务有限公司</div><div class="contract-title">出口产品购货合同</div>'+ 
      '<div class="intro"><div class="legal">根据《中华人民共和国民法典》及其他相关法律法规，双方在平等、自愿、诚实信用的基础上，就本合同所列货物采购事宜达成一致，双方共同遵守。</div>'+ 
      '<div class="meta"><div><b>合同编号</b><span>'+esc(contractNo)+'</span></div><div><b>签约日期</b><span>'+esc(contractDateCN(o.order_date))+'</span></div><div><b>签约地点</b><span>浙江义乌</span></div><div><b>采购单号</b><span>'+esc(o.order_no||'')+'</span></div></div></div>'+ 
      '<table class="ctable"><thead><tr><th>序号</th><th>型号 / SKU</th><th>产品名称</th><th>颜色 / 尺码</th><th>数量</th><th>未税单价</th><th>金额</th><th>交货日期</th></tr></thead><tbody>'+rows+'</tbody></table>'+ 
      '<table class="totals"><tr><td class="label">货款小计</td><td>¥ '+subtotal.toFixed(2)+'</td><td class="label">运费</td><td>¥ '+shipping.toFixed(2)+'</td></tr><tr><td class="label">合同总金额</td><td colspan="3"><b>¥ '+total.toFixed(2)+'</b>　人民币大写：<b>'+esc(cnUpperMoney(total))+'</b></td></tr></table>'+ 
      '<div class="clauses">'+ 
      '<div class="clause"><b>一、产品及交期：</b><span>产品名称、规格、数量、单价、金额及交货日期以本合同上表及对应采购单为准；如需调整，应经双方书面确认。</span></div>'+ 
      '<div class="clause"><b>二、质量标准：</b><span>供方应按需方确认的样品、规格、工艺及质量要求生产。需方有权在收货后进行验收；如出现影响销售或使用的质量问题，供方应负责退换、补货或承担由此产生的合理损失。</span></div>'+ 
      '<div class="clause"><b>三、包装要求：</b><span>内外包装按需方确认要求执行，并应满足运输、仓储及亚马逊等渠道的包装需要。除双方另有书面约定外，包装及常规装卸费用由供方承担。</span></div>'+ 
      '<div class="clause"><b>四、收货地点：</b><span>由供方按需方指定地址交付；具体收货地址以需方最终书面通知或采购单信息为准。</span></div>'+ 
      '<div class="clause"><b>五、运输费用：</b><span>本合同登记运费为 ¥ '+shipping.toFixed(2)+'。具体运输方式、费用承担及风险转移，以双方确认的采购单、物流单据或补充约定为准。</span></div>'+ 
      '<div class="clause"><b>六、付款方式：</b><span>'+payment+'。</span></div>'+ 
      '<div class="clause"><b>七、供方责任：</b><span>供方应按期、按质、按量交货；因延期、数量短缺、规格不符或质量问题给需方造成损失的，应及时采取补救措施，并依法承担相应责任。</span></div>'+ 
      '<div class="clause"><b>八、需方责任：</b><span>需方应按约定及时提供确认资料并按约定付款；因需方原因变更产品、数量或交期的，应及时通知供方并协商处理相关费用。</span></div>'+ 
      '<div class="clause"><b>九、交付资料：</b><span>供方应随货提供双方约定的出库、检验、包装、标签或其他交付资料；如需特殊标签、条码或唛头，以需方确认版本为准。</span></div>'+ 
      '<div class="clause"><b>十、合同变更：</b><span>本合同依法成立并生效后，任何一方不得擅自变更或解除；确需变更的，应由双方协商一致并以书面方式确认。</span></div>'+ 
      '<div class="clause"><b>十一、争议解决：</b><span>履行过程中发生争议，双方应先协商解决；协商不成的，依法向有管辖权的人民法院提起诉讼。</span></div>'+ 
      '<div class="clause"><b>十二、备注：</b><span>本合同与采购单、双方确认的样品、图纸、聊天记录及补充协议等共同构成交易文件；不一致之处以双方最后书面确认内容为准。</span></div>'+ 
      '</div>'+ 
      '<table class="parties"><thead><tr><th>需方（采购方）</th><th>供方（供应商）</th></tr></thead><tbody><tr><td>'+ 
      '<div class="party-line"><b>单位名称：</b><span>义乌市时盈电子商务有限公司</span></div><div class="party-line"><b>单位地址：</b><span>浙江省义乌市</span></div><div class="party-line"><b>需方代表：</b><span>陈紫飞</span></div><div class="party-line"><b>电话：</b><span>13357098556</span></div><div class="seal"><b>盖章 / 签字：</b></div>'+ 
      '</td><td><div class="party-line"><b>单位名称：</b><span>'+esc(supplierName)+'</span></div><div class="party-line"><b>单位地址：</b><span>'+esc(supplierAddress||'')+'</span></div><div class="party-line"><b>供方代表：</b><span>'+esc(supplierContact||'')+'</span></div><div class="party-line"><b>电话：</b><span>'+esc(supplierPhone||'')+'</span></div><div class="seal"><b>盖章 / 签字：</b></div></td></tr></tbody></table>'+ 
      '<div class="note">说明：本页面根据采购单自动生成，合同正文可在打印前直接点击修改。打印时可选择“另存为 PDF”。</div></div></body></html>';
    w.document.open();w.document.write(html);w.document.close();w.focus()
  }).catch(e=>{w.document.body.innerHTML='<p style="font-family:Arial;padding:24px">生成采购合同失败：'+esc(e.message)+'</p>'})
}
`;

  html = html.slice(0, pos) + code + html.slice(pos);
  changed = true;
}

if (changed) {
  await fs.writeFile(file, html, "utf8");
  console.log("Purchase contract generator patched into index.html");
} else {
  console.log("Purchase contract generator already present; no changes needed");
}
