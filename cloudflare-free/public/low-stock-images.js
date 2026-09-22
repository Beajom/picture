(() => {
  if (window.__LOW_STOCK_IMAGES_PATCH__) return;
  window.__LOW_STOCK_IMAGES_PATCH__ = true;

  const style = document.createElement('style');
  style.textContent = `
    .low-stock-product-cell{width:72px;min-width:72px}
    .low-stock-thumb-wrap{width:56px;height:56px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:zoom-in}
    .low-stock-thumb-wrap img{width:100%;height:100%;object-fit:contain;display:block}
    .low-stock-thumb-placeholder{width:56px;height:56px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#94a3b8;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;line-height:1.25}
    #lowStockImagePreview{position:fixed;z-index:99999;display:none;width:260px;height:260px;padding:10px;border:1px solid #dbe1ea;border-radius:12px;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,.24);pointer-events:none}
    #lowStockImagePreview img{width:100%;height:100%;object-fit:contain;border-radius:8px;background:#fff}
    @media(max-width:800px){#lowStockImagePreview{display:none!important}.low-stock-thumb-wrap,.low-stock-thumb-placeholder{width:48px;height:48px}.low-stock-product-cell{width:62px;min-width:62px}}
  `;
  document.head.appendChild(style);

  const preview = document.createElement('div');
  preview.id = 'lowStockImagePreview';
  preview.innerHTML = '<img alt="产品大图预览">';
  document.body.appendChild(preview);

  window.showLowStockImagePreview = function (event, el) {
    const src = el?.dataset?.src || '';
    if (!src) return;
    const img = preview.querySelector('img');
    img.src = src;
    preview.style.display = 'block';
    window.moveLowStockImagePreview(event);
  };

  window.moveLowStockImagePreview = function (event) {
    if (preview.style.display !== 'block') return;
    const gap = 16;
    const w = 260;
    const h = 260;
    let left = event.clientX + gap;
    let top = event.clientY + gap;
    if (left + w > window.innerWidth - 10) left = event.clientX - w - gap;
    if (top + h > window.innerHeight - 10) top = window.innerHeight - h - 10;
    preview.style.left = Math.max(10, left) + 'px';
    preview.style.top = Math.max(10, top) + 'px';
  };

  window.hideLowStockImagePreview = function () {
    preview.style.display = 'none';
    const img = preview.querySelector('img');
    img.removeAttribute('src');
  };

  function imageUrlForProduct(p) {
    try {
      if (typeof bestColorImage === 'function') {
        const v = bestColorImage(p);
        if (v) return v;
      }
    } catch (_) {}
    return p?.resolved_image_url || p?.image_url || p?.resolved_parent_image_url || p?.parent_image_url || '';
  }

  function productImageHTML(p) {
    const src = imageUrlForProduct(p);
    if (!src) return '<span class="low-stock-thumb-placeholder">暂无<br>图片</span>';
    const safe = typeof esc === 'function' ? esc(src) : String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return '<span class="low-stock-thumb-wrap" data-src="'+safe+'" onmouseenter="showLowStockImagePreview(event,this)" onmousemove="moveLowStockImagePreview(event)" onmouseleave="hideLowStockImagePreview()" title="悬停查看大图"><img src="'+safe+'" loading="lazy" decoding="async" onerror="this.parentElement.outerHTML=\'<span class=&quot;low-stock-thumb-placeholder&quot;>暂无<br>图片</span>\'"></span>';
  }

  window.showLowStockModal = function () {
    const rows = typeof lowStockRows === 'function' ? lowStockRows() : [];
    if (!rows.length) {
      openModal('低库存SKU / 库存预警','<div class="empty">当前没有低库存SKU。</div>');
      return;
    }

    const body = rows.map(x => {
      const p = x.p;
      const suggest = x.suggested === null
        ? '<span class="muted">先设置安全库存</span>'
        : '<b>'+Number(x.suggested).toLocaleString()+' 双</b>';
      return '<tr>'+
        '<td class="low-stock-product-cell">'+productImageHTML(p)+'</td>'+
        '<td><b>'+esc(model(p))+'</b></td>'+
        '<td>'+esc(p.sku||'-')+'<div class="small muted">'+esc(p.child_asin||'')+'</div></td>'+
        '<td>'+esc(p.color||'-')+'</td>'+
        '<td>'+esc(p.size||'-')+'</td>'+
        '<td><b>'+x.qty.toLocaleString()+'</b> 双</td>'+
        '<td>'+x.safety.toLocaleString()+' 双</td>'+
        '<td><span style="font-size:11px;padding:4px 7px;border-radius:999px;background:'+x.alert.bg+';color:'+x.alert.color+'">'+esc(x.alert.label)+'</span></td>'+
        '<td>'+suggest+'</td>'+
        '<td style="white-space:nowrap"><button class="link" onclick="setSafetyStock(\''+p.id+'\')">设置预警</button><button class="link" onclick="closeModal();adjustStock(\''+p.id+'\')">调整库存</button></td>'+
      '</tr>';
    }).join('');

    openModal(
      '低库存SKU / 库存预警',
      '<div style="margin-bottom:12px;padding:10px 12px;border:1px solid #dbe5f0;border-radius:9px;background:#f8fafc;font-size:12px;color:#475467">'+
      '预警规则：当前库存 ≤ 安全库存即进入预警；0库存直接标记缺货。<b>建议采购量 = 安全库存 × 2 − 当前库存</b>。未设置安全库存的SKU可直接在此设置。'+
      '</div>'+
      '<div class="table" style="overflow:auto;max-height:62vh"><table style="min-width:1040px"><thead><tr>'+
      '<th>产品图片</th><th>型号</th><th>SKU / ASIN</th><th>颜色</th><th>尺码</th><th>当前库存</th><th>安全库存</th><th>库存预警</th><th>建议采购数量</th><th>操作</th>'+
      '</tr></thead><tbody>'+body+'</tbody></table></div>'
    );

    const modal = document.querySelector('#mb .modal');
    if (modal) modal.style.width = 'min(1120px,96vw)';
  };

  const originalOpenModal = typeof openModal === 'function' ? openModal : null;
  if (originalOpenModal) {
    window.openModal = function (title, html) {
      originalOpenModal(title, html);
      const modal = document.querySelector('#mb .modal');
      if (modal && title !== '低库存SKU / 库存预警') modal.style.width = '';
    };
  }
})();
