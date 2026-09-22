import fs from "node:fs/promises";

const file = new URL("../public/index.html", import.meta.url);
let html = await fs.readFile(file, "utf8");
const startMarker = "function showLowStockModal(){";
const endMarker = "function setSafetyStock(pid){";
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start + startMarker.length);

if (start < 0 || end < 0 || end <= start) {
  console.error("Could not locate showLowStockModal block in index.html");
  process.exit(2);
}

const replacement = `function showLowStockModal(){
  const rows=lowStockRows();
  if(!rows.length){
    openModal('低库存SKU / 库存预警','<div class="empty">当前没有低库存SKU。</div>');
    return
  }
  const body=rows.map(x=>{
    const p=x.p;
    const suggest=x.suggested===null?'<span class="muted">先设置安全库存</span>':'<b>'+Number(x.suggested).toLocaleString()+' 双</b>';
    const image=bestColorImage(p)||p.resolved_parent_image_url||p.parent_image_url||'';
    const imageCell=smartImg(image,'thumb','width:56px;height:56px;object-fit:contain;background:#fff','lazy');
    return '<tr><td style="width:76px">'+imageCell+'</td><td><b>'+esc(model(p))+'</b></td><td>'+esc(p.sku||'-')+'<div class="small muted">'+esc(p.child_asin||'')+'</div></td><td>'+esc(p.color||'-')+'</td><td>'+esc(p.size||'-')+'</td><td><b>'+x.qty.toLocaleString()+'</b> 双</td><td>'+x.safety.toLocaleString()+' 双</td><td><span style="font-size:11px;padding:4px 7px;border-radius:999px;background:'+x.alert.bg+';color:'+x.alert.color+'">'+esc(x.alert.label)+'</span></td><td>'+suggest+'</td><td style="white-space:nowrap"><button class="link" onclick="setSafetyStock(\\''+p.id+'\\')">设置预警</button><button class="link" onclick="closeModal();adjustStock(\\''+p.id+'\\')">调整库存</button></td></tr>'
  }).join('');
  openModal('低库存SKU / 库存预警','<div style="margin-bottom:12px;padding:10px 12px;border:1px solid #dbe5f0;border-radius:9px;background:#f8fafc;font-size:12px;color:#475467">预警规则：当前库存 ≤ 安全库存即进入预警；0库存直接标记缺货。<b>建议采购量 = 安全库存 × 2 − 当前库存</b>。未设置安全库存的SKU可直接在此设置。</div><div class="table" style="overflow:auto;max-height:62vh"><table style="min-width:1060px"><thead><tr><th>产品图片</th><th>型号</th><th>SKU / ASIN</th><th>颜色</th><th>尺码</th><th>当前库存</th><th>安全库存</th><th>库存预警</th><th>建议采购数量</th><th>操作</th></tr></thead><tbody>'+body+'</tbody></table></div>')
}
`;

html = html.slice(0, start) + replacement + html.slice(end);
await fs.writeFile(file, html, "utf8");
console.log("Low-stock product image column patched into index.html");
