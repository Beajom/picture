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
  const uploaded=purchaseOrders.filter(o=>n(o.returned_count)>0).length;
  const fileTotal=purchaseOrders.reduce((v,o)=>v+n(o.returned_count),0);
  const summary='<div class="mpo-kpis">'+
    '<div class="mpo-kpi"><small>包材采购单</small><strong>'+purchaseOrders.length+'</strong></div>'+
    '<div class="mpo-kpi"><small>合同金额</small><strong>'+yuan(total)+'</strong></div>'+
    '<div class="mpo-kpi"><small>未全部到货</small><strong>'+pending+'</strong><small>累计到货 '+received.toLocaleString()+' 件</small></div></div>'+
    '<section class="mpo-return-panel"><div class="mpo-return-head"><div><h2>回传合同归档</h2><p>供应商签字 / 盖章回传的原始文件，按采购单号归档保存，可随时查看和补传。</p></div>'+
    '<div class="mpo-return-counts"><span>已回传 <b>'+uploaded+'</b> 单</span><span>待回传 <b>'+(purchaseOrders.length-uploaded)+'</b> 单</span><span>有效文件 <b>'+fileTotal+'</b> 份</span></div></div>'+
    (purchaseOrders.length?'<div class="mpo-return-grid">'+purchaseOrders.slice(0,6).map(o=>
      '<div class="mpo-return-entry"><span class="mpo-return-label '+(n(o.returned_count)>0?'complete':'')+'">'+(n(o.returned_count)>0?'已回传':'待上传')+'</span>'+
      '<span class="mpo-return-entry-title"><strong>'+safe(o.order_no)+'</strong><small>'+safe(o.supplier_name||'未设置供应商')+' · '+n(o.returned_count)+' 份文件</small></span>'+
      '<button type="button" class="btn" onclick="manageReturnedContracts(\''+safe(o.id)+'\')">'+(n(o.returned_count)>0?'查看 / 补传':'上传回传合同')+'</button></div>'
    ).join('')+'</div>':'<p class="mpo-return-empty">创建采购单后即可归档供应商回传合同。</p>')+'</section>';
  const table=purchaseOrders.length?
    '<div class="mpo-listbox"><table class="mpo-table"><thead><tr><th>采购单号</th><th>日期 / 交期</th><th>供应商</th><th>采购数量</th><th>订单金额</th><th>已入库</th><th>回传合同</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
    purchaseOrders.map(o=>'<tr><td><b>'+safe(o.order_no)+'</b></td><td>'+safe(o.order_date)+'<div class="small muted">'+safe(o.delivery_date||'未填交期')+'</div></td><td>'+safe(o.supplier_name||'-')+'</td><td>'+n(o.total_qty).toLocaleString()+'</td><td>'+yuan(o.total_amount)+'</td><td>'+n(o.received_qty).toLocaleString()+'</td><td><button type="button" class="mpo-return-status '+(n(o.returned_count)>0?'complete':'')+'" onclick="manageReturnedContracts(\''+safe(o.id)+'\')">'+(n(o.returned_count)>0?'已回传 '+n(o.returned_count)+' 份':'＋ 上传回传')+'</button></td><td>'+statusTag(o.status)+'</td><td><div class="mpo-inline-actions">'+btn('查看合同',"previewMaterialPurchaseContract('"+safe(o.id)+"')")+btn('编辑合同',"editMaterialPurchaseContract('"+safe(o.id)+"')")+((o.status==='已入库')?'':btn('收货入库',"receiveMaterialPurchase('"+safe(o.id)+"')",true))+
    ((n(o.received_qty)>0||n(o.returned_count)>0||o.status!=='已下单')?
      '<button type="button" class="btn mpo-delete-disabled" disabled title="已发生入库或状态不允许删除">不可删除</button>':
      '<button type="button" class="btn danger mpo-delete-btn" onclick="deleteMaterialPurchaseOrder(\''+safe(o.id)+'\')">删除</button>')+'</div></td></tr>').join('')+
    '</tbody></table></div>':
    '<div class="panel" style="padding:32px;text-align:center;color:#64748b">尚无包材采购单。先在「辅料 / 包材」建立纸盒、标签、纸箱等物料，再点击右上角「新建包材采购单」。</div>';
  wrap.innerHTML=summary+table;
}
window.deleteMaterialPurchaseOrder=async function(id){
  const item=purchaseOrders.find(o=>String(o.id)===String(id));
  const no=item?.order_no||(currentOrder?.id===id?currentOrder?.order_no:'这张合同');
  const inPreview=currentOrder?.id===id?currentOrder:null;
  const received=n(item?.received_qty)||n(inPreview?.items?.reduce((total,it)=>total+n(it.received_qty),0));
  if(n(item?.returned_count)>0){toastMsg('已有回传合同的订单不能直接删除，请先核对归档文件');return}
  if(received>0||(['部分到货','已入库'].includes(item?.status)||['部分到货','已入库'].includes(inPreview?.status))){
    toastMsg('该合同已收货入库，不能直接删除，请先核对入库记录');return;
  }
  if(!confirm('确定删除包材采购合同「'+no+'」吗？\n\n仅删除未发生收货入库的合同及订单明细。\n不会删除包材档案，也不会改变成品或包材库存。\n系统会保留删除审计快照。'))return;
  const buttons=[...document.querySelectorAll('.mpo-delete-btn')];buttons.forEach(button=>button.disabled=true);
  try{
    await api('/material-purchase-orders/'+encodeURIComponent(id),{method:'DELETE'});
    if(currentOrder?.id===id){currentOrder=null;closeModal()}
    await loadPurchaseOrders();
    toastMsg('已删除错误的采购合同，库存未变');
  }catch(err){
    toastMsg('删除失败：'+err.message);
    buttons.forEach(button=>button.disabled=false);
  }
};

const returnedContractURL=(orderId,fileId)=>'/api/material-purchase-orders/'+encodeURIComponent(orderId)+'/returned-contracts/'+encodeURIComponent(fileId);
const returnedFileSize=bytes=>Number(bytes)>=1024*1024?(Number(bytes)/1024/1024).toFixed(2)+' MB':Math.max(1,Math.ceil(Number(bytes)/1024))+' KB';
let returnedSelectedFile=null,returnedSelectedOrderId=null,returnedPasteListener=null,returnedPreviewURL=null,returnedUploadNotice='';
const allowedReturnedExtensions=/\.(pdf|png|jpe?g|webp|docx)$/i;
const cleanReturnedPasteFile=file=>{
  if(!file)return null;
  if(file.name&&allowedReturnedExtensions.test(file.name))return file;
  if(file.type==='image/png')return new File([file],'粘贴截图-'+Date.now()+'.png',{type:'image/png'});
  if(file.type==='image/jpeg')return new File([file],'粘贴图片-'+Date.now()+'.jpg',{type:'image/jpeg'});
  if(file.type==='image/webp')return new File([file],'粘贴图片-'+Date.now()+'.webp',{type:'image/webp'});
  if(file.type==='application/pdf')return new File([file],'粘贴合同-'+Date.now()+'.pdf',{type:'application/pdf'});
  return file;
};
function clearReturnedPreview(){
  if(returnedPreviewURL){URL.revokeObjectURL(returnedPreviewURL);returnedPreviewURL=null}
}
function updateReturnedSelection(file,orderId){
  if(!file)return;
  file=cleanReturnedPasteFile(file);
  const status=el('mpoReturnedUploadStatus'),name=el('mpoReturnedSelected'),btn=el('mpoReturnedUploadSubmit');
  if(!allowedReturnedExtensions.test(file.name||'')){toastMsg('仅支持 PDF、JPG、PNG、WebP 和 DOCX 文件');return}
  if(file.size>20*1024*1024||file.size<1){toastMsg('文件必须小于20MB且不能为空');return}
  returnedSelectedFile=file;
  returnedSelectedOrderId=orderId;
  if(name){name.hidden=false;name.textContent='已选择：'+file.name+'（'+returnedFileSize(file.size)+'）'}
  if(status){status.textContent='文件已准备好，点击「上传并保存到云端」即可归档';status.dataset.state='ready'}
  if(btn){btn.disabled=false;btn.textContent='上传并保存到云端'}
  const drop=el('mpoReturnedDropzone');
  if(drop)drop.classList.add('is-ready');
}
async function verifyReturnedContract(orderId,fileId){
  const url=returnedContractURL(orderId,fileId)+'/verify';
  const response=await fetch(url,{cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.readable)throw Error(result.error||'原始文件暂时不可读取');
  return result;
}
async function showReturnedFileStatuses(orderId,files){
  const active=files.filter(f=>!Number(f.is_void)).slice(0,12);
  await Promise.all(active.map(async file=>{
    const indicator=document.querySelector('[data-returned-verify="'+file.id+'"]');
    if(!indicator)return;
    try{
      await verifyReturnedContract(orderId,file.id);
      if(!indicator.isConnected)return;
      indicator.textContent='✓ 云端保存成功 · 原件可读取';
      indicator.className='mpo-file-verification is-good';
    }catch(e){
      if(!indicator.isConnected)return;
      indicator.textContent='! 有文件记录，但原件读取未确认';
      indicator.className='mpo-file-verification is-warning';
      indicator.title=String(e.message||e);
    }
  }));
}
window.previewReturnedContract=async function(orderId,fileId){
  const container=el('mpoReturnedPreviewPane'),view=el('mpoReturnedPreviewBody');
  if(!container||!view)return;
  const file=(window.__mpoReturnedFiles||[]).find(f=>f.id===fileId);
  if(!file)return;
  container.hidden=false;
  view.innerHTML='<div class="mpo-return-preview-loading">正在读取原始合同，请稍候…</div>';
  try{
    const response=await fetch(returnedContractURL(orderId,fileId),{cache:'no-store'});
    if(!response.ok)throw Error('文件接口返回 '+response.status+'，无法读取');
    const blob=await response.blob();
    if(!blob.size)throw Error('云端文件内容为空');
    clearReturnedPreview();
    returnedPreviewURL=URL.createObjectURL(new Blob([blob],{type:file.content_type||blob.type||'application/octet-stream'}));
    if(file.content_type==='application/pdf'){
      view.innerHTML='<iframe class="mpo-return-pdf-viewer" title="回传合同 PDF 预览" src="'+returnedPreviewURL+'#toolbar=1"></iframe>'+
        '<p class="mpo-return-preview-tip">如果浏览器不支持内嵌 PDF，可使用「下载原件」或新窗口查看。</p>';
    }else if(String(file.content_type).startsWith('image/')){
      view.innerHTML='<img class="mpo-return-image-viewer" alt="回传合同原始扫描件" src="'+returnedPreviewURL+'">';
    }else{
      view.innerHTML='<p class="mpo-return-preview-tip">DOCX 不支持浏览器内直接预览，请下载原件使用 Word / WPS 打开。</p>';
    }
    const a=el('mpoReturnedPreviewDownload');
    if(a){a.href=returnedPreviewURL;a.download=file.original_name;a.hidden=false}
    const label=el('mpoReturnedPreviewTitle');
    if(label)label.textContent='预览：'+file.original_name;
    container.scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(err){
    view.innerHTML='<div class="mpo-return-preview-error">预览失败：'+safe(err.message)+'。请尝试下载原件，或检查云端文件状态。</div>';
  }
};
window.closeReturnedContractPreview=function(){
  clearReturnedPreview();
  const container=el('mpoReturnedPreviewPane');
  if(container)container.hidden=true;
};
window.manageReturnedContracts=async function(orderId){
  const order=purchaseOrders.find(o=>o.id===orderId)||(currentOrder?.id===orderId?currentOrder:null);
  if(!order){toastMsg('采购单不存在，请刷新列表');return}
  try{
    const response=await api('/material-purchase-orders/'+encodeURIComponent(orderId)+'/returned-contracts');
    const files=Array.isArray(response.files)?response.files:[],active=files.filter(f=>!Number(f.is_void));
    window.__mpoReturnedFiles=files;
    clearReturnedPreview();
    returnedSelectedFile=null;returnedSelectedOrderId=null;
    const successNotice=returnedUploadNotice;returnedUploadNotice='';
    const fileRows=files.length?files.map(file=>{
      const voided=!!Number(file.is_void),type=String(file.content_type||''),preview=!voided&&(/^(application\/pdf|image\/)/).test(type);
      return '<div class="mpo-return-file '+(voided?'is-void':'')+'">'+
        '<span class="mpo-return-icon">'+(type==='application/pdf'?'PDF':type.startsWith('image/')?'图像':'DOC')+'</span>'+
        '<div class="mpo-return-file-text"><strong>'+safe(file.original_name)+'</strong><span>'+
        returnedFileSize(file.byte_size)+' · '+safe(String(file.uploaded_at||'').replace('T',' ').slice(0,16))+
        (voided?' · 已作废':'')+'</span>'+
        (file.description?'<small>'+safe(file.description)+'</small>':'')+
        (voided?'<span class="mpo-file-verification">保留历史归档</span>':
          '<span class="mpo-file-verification" data-returned-verify="'+safe(file.id)+'">正在验证云端原件…</span>')+
        '</div>'+
        '<div class="mpo-return-file-actions">'+
        (preview?'<button type="button" class="btn" data-file-action="preview" data-file-id="'+safe(file.id)+'">直接预览</button>':'')+
        '<button type="button" class="btn" data-file-action="download" data-file-id="'+safe(file.id)+'">下载</button>'+
        (voided?'<span class="mpo-return-void">已作废</span>':
          '<button type="button" class="btn danger" data-file-action="void" data-file-id="'+safe(file.id)+'">标记作废</button>')+
        '</div></div>';
    }).join(''):'<p class="mpo-return-empty">暂无回传文件，请拖入供应商签字、盖章后的合同。</p>';
    openModal('回传合同归档 · '+order.order_no,
      '<div class="mpo-return-manager">'+
      '<div class="mpo-return-manager-title"><div><h3>供应商回传合同</h3><p>'+safe(order.supplier_name||'供应商未设置')+' · 采购单 '+safe(order.order_no)+'</p></div>'+
      '<span class="mpo-return-label '+(active.length?'complete':'')+'">'+(active.length?'已归档 '+active.length+' 份':'尚未回传')+'</span></div>'+
      (successNotice?'<div class="mpo-return-success" role="status">'+safe(successNotice)+'</div>':'')+
      '<form id="mpoReturnedUpload" class="mpo-return-upload">'+
      '<div class="mpo-return-dropzone" id="mpoReturnedDropzone" tabindex="0" role="button" aria-label="拖拽、粘贴或选择回传合同">'+
      '<div class="mpo-return-drop-icon">⇧</div><strong>拖拽合同到此处，或 Ctrl + V 粘贴</strong>'+
      '<span>可直接粘贴截图、复制的文件；也可点击选择 PDF / 图片 / DOCX</span>'+
      '<button type="button" class="btn" id="mpoReturnedChooseFile">选择本地文件</button>'+
      '<input type="file" name="file" id="mpoReturnedFile" tabindex="-1" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.docx">'+
      '<div id="mpoReturnedSelected" class="mpo-return-selected" hidden></div></div>'+
      '<label>上传备注（可选）<input type="text" class="field" name="description" maxlength="240" placeholder="例如：已盖章 / 双方已签字 / 第二次回传"></label>'+
      '<p class="mpo-return-help">支持 PDF / JPG / PNG / WebP / DOCX，单个文件最大20MB。拖入或粘贴后确认文件，再点击上传保存。</p>'+
      '<div class="mpo-return-upload-actions"><span id="mpoReturnedUploadStatus" aria-live="polite" data-state="idle">等待选择文件</span>'+
      '<button type="submit" id="mpoReturnedUploadSubmit" class="btn primary" disabled>上传并保存到云端</button></div></form>'+
      '<div class="mpo-return-list-title"><b>已回传合同原件</b><small>总计 '+files.length+' 份 · 有效 '+active.length+' 份</small></div>'+
      '<div id="mpoReturnedFiles" class="mpo-return-file-list">'+fileRows+'</div>'+
      '<section class="mpo-return-preview-pane" id="mpoReturnedPreviewPane" hidden>'+
      '<div class="mpo-return-preview-head"><b id="mpoReturnedPreviewTitle">合同预览</b>'+
      '<div><a class="btn" id="mpoReturnedPreviewDownload" href="#" download hidden>下载原件</a>'+
      '<button type="button" class="btn" id="mpoReturnedClosePreview">关闭预览</button></div></div>'+
      '<div id="mpoReturnedPreviewBody"></div></section>'+
      '<div class="mpo-return-warning">回传合同含公章、签字等敏感信息。目前系统尚未启用严格的登录访问控制，正式使用前建议配置 Cloudflare Access。</div>'+
      '</div>');
    const form=el('mpoReturnedUpload'),zone=el('mpoReturnedDropzone'),input=el('mpoReturnedFile');
    el('mpoReturnedChooseFile').addEventListener('click',e=>{e.stopPropagation();input.click()});
    zone.addEventListener('click',e=>{if(!e.target.closest('button'))input.click()});
    zone.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===zone){e.preventDefault();input.click()}});
    input.addEventListener('change',()=>{if(input.files?.[0])updateReturnedSelection(input.files[0],orderId)});
    for(const event of ['dragenter','dragover']){
      zone.addEventListener(event,e=>{e.preventDefault();e.stopPropagation();zone.classList.add('is-dragging')});
    }
    for(const event of ['dragleave','dragend']){
      zone.addEventListener(event,e=>{e.preventDefault();zone.classList.remove('is-dragging')});
    }
    zone.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();zone.classList.remove('is-dragging');
      const file=e.dataTransfer?.files?.[0];
      if(file)updateReturnedSelection(file,orderId);else toastMsg('未识别到可上传文件，请尝试点击选择');
    });
    if(returnedPasteListener)document.removeEventListener('paste',returnedPasteListener);
    returnedPasteListener=e=>{
      if(!mb.classList.contains('open')||!el('mpoReturnedDropzone'))return;
      const data=e.clipboardData;
      const file=data?.files?.[0]||[...(data?.items||[])].filter(x=>x.kind==='file').map(x=>x.getAsFile()).find(Boolean);
      if(!file)return;
      e.preventDefault();updateReturnedSelection(file,orderId);
    };
    document.addEventListener('paste',returnedPasteListener);
    el('mpoReturnedClosePreview').addEventListener('click',window.closeReturnedContractPreview);
    form.onsubmit=async e=>{
      e.preventDefault();
      const file=returnedSelectedOrderId===orderId?returnedSelectedFile:null;
      const status=el('mpoReturnedUploadStatus'),button=el('mpoReturnedUploadSubmit');
      if(!file){toastMsg('请先拖入、粘贴或选择文件');return}
      button.disabled=true;button.textContent='正在上传…';
      if(status){status.textContent='正在上传到云端，请不要关闭窗口';status.dataset.state='working'}
      try{
        const fd=new FormData();
        fd.append('file',file,file.name);
        fd.append('description',form.querySelector('[name="description"]').value||'');
        const res=await fetch('/api/material-purchase-orders/'+encodeURIComponent(orderId)+'/returned-contracts',{method:'POST',body:fd,cache:'no-store'});
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data.file?.id)throw Error(data.error||'上传失败，未收到云端确认');
        let readable=false;
        for(let attempt=0;attempt<3&&!readable;attempt++){
          try{await verifyReturnedContract(orderId,data.file.id);readable=true}
          catch(_){if(attempt<2)await new Promise(resolve=>setTimeout(resolve,450))}
        }
        returnedUploadNotice=readable?
          '✓ 上传成功！原始文件已保存到云端，并通过读取校验：'+file.name:
          '上传已写入云端记录，但原始文件读取尚待确认。请使用下方文件列表核验：'+file.name;
        await loadPurchaseOrders();
        await manageReturnedContracts(orderId);
        toastMsg(readable?'回传合同已上传并校验成功':'文件已归档，请再核验原始文件');
      }catch(err){
        if(status){status.textContent='保存失败：'+err.message;status.dataset.state='error'}
        toastMsg('上传失败：'+err.message);
        button.disabled=false;button.textContent='重试上传';
      }
    };
    el('mpoReturnedFiles').addEventListener('click',async e=>{
      const target=e.target.closest('button[data-file-action]');
      if(!target)return;
      const fileId=target.dataset.fileId,record=files.find(f=>f.id===fileId);
      if(!record)return;
      const action=target.dataset.fileAction;
      if(action==='preview'){await window.previewReturnedContract(orderId,fileId);return}
      if(action==='download'){
        try{
          const res=await fetch(returnedContractURL(orderId,fileId),{cache:'no-store'});
          if(!res.ok)throw Error('云端原始文件暂时无法读取');
          const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');
          a.href=url;a.download=record.original_name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),3000);
        }catch(err){toastMsg('下载失败：'+err.message)}
      }
      if(action==='void'){
        if(!confirm('将「'+record.original_name+'」标记作废？云端仍保留原始文件和历史记录。'))return;
        target.disabled=true;
        try{
          await api(returnedContractURL(orderId,fileId),{method:'DELETE'});
          await loadPurchaseOrders();await manageReturnedContracts(orderId);
          toastMsg('该版本已标记作废，原始文件仍保留');
        }catch(err){target.disabled=false;toastMsg('操作失败：'+err.message)}
      }
    });
    showReturnedFileStatuses(orderId,files);
  }catch(err){toastMsg('加载回传合同失败：'+err.message)}
};

async function loadPurchaseOrders(){
  try{const result=await api('/material-purchase-orders');purchaseOrders=result.orders||[];displayPurchaseList()}
  catch(e){const w=el('materialPurchaseOrders');if(w)w.innerHTML='<div class="mpo-note">加载包材采购单失败：'+safe(e.message)+'。请点击刷新重试。</div>'}
}
views.materialPurchase=function(){
  setTimeout(loadPurchaseOrders,0);
  return '<div class="title"><div><h1>包装辅料采购</h1><p>包材采购单 → 订货合同 → 收货入库。与成品采购单独立管理。</p></div>'+
    '<div class="row" style="gap:8px;flex-wrap:wrap">'+btn('刷新列表','loadMaterialPurchaseOrders()')+btn('甲方资料 / 公章管理','editMaterialContractProfile()')+btn('管理包材',"go('materials')")+btn('＋ 新建包材采购单','newMaterialPO()',true)+'</div></div>'+
    '<div class="mpo-note" style="margin-bottom:12px">支持彩盒、白卡纸盒、包装袋、吊牌、贴纸、标签、纸箱等辅料；一个采购单可包含多种材料。合同可编辑材质、规格、数量、价格、交货和付款条款。只有确认到货时才增加包材库存，绝不会改变成品 SKU 库存。未发生收货、也未保存回传文件的错误合同可删除，已归档或入库订单不能直接删除。</div>'+
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
  if(resetPrice){
    row.querySelector('.mpo-price').value=n(m.purchase_price).toFixed(2);
    // Default from the materials master record; users may override per purchase order.
    const grade=row.querySelector('.mpo-grade'),spec=row.querySelector('.mpo-spec');
    if(grade)grade.value=m.material_grade||'';
    if(spec)spec.value=m.material_spec||'';
  }
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
function materialContractSealSize(){
  try{
    const size=Number(localStorage.getItem('mpoSealPrintSize'));
    return [38,42,45].includes(size)?size:42;
  }catch(_){return 42}
}
window.changeMaterialContractSealSize=function(value){
  const size=Number(value);
  if(![38,42,45].includes(size))return;
  try{localStorage.setItem('mpoSealPrintSize',String(size))}catch(_){}
  const documentView=document.getElementById('materialContractPaper');
  if(documentView&&currentOrder)documentView.outerHTML=paperMarkup(currentOrder);
};
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
  const sealSize=materialContractSealSize();
  const line=(label,value)=>'<div class="mpo-sig-line"><strong>'+label+'</strong><span>'+safe(value||'')+'</span></div>';
  const buyerBlock=line('甲　方：',o.buyer_company)+line('地　址：',o.buyer_address)+
    line('电　话：',o.buyer_phone)+line('委托代表人：',o.buyer_representative)+
    line('日　期：',(o.buyer_sign_date||o.order_date||'').replaceAll('-','.'));
  const supplierBlock=line('乙　方：',o.supplier_name)+line('地　址：',o.supplier_address)+
    line('电　话：',o.supplier_phone)+line('委托代表人：',o.supplier_representative)+
    line('日　期：',(o.supplier_sign_date||o.order_date||'').replaceAll('-','.'));
  return '<article class="mpo-paper'+(items.length<=2?' mpo-short-contract':'')+'" id="materialContractPaper" style="--mpo-preview-seal:'+Math.round(sealSize*3)+'px;--mpo-print-seal:'+sealSize+'mm">'+
    '<div class="mpo-doc-title"><h2>订货合同</h2><p>（包装辅料采购）</p></div>'+
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
      '<div class="row" style="gap:9px;justify-content:flex-end;flex-wrap:wrap;margin-bottom:12px">'+
      '<label class="mpo-seal-size-picker">公章尺寸 <select class="field" aria-label="公章打印尺寸" onchange="changeMaterialContractSealSize(this.value)">'+
      [38,42,45].map(size=>'<option value="'+size+'"'+(materialContractSealSize()===size?' selected':'')+'>'+({38:'小 · 38mm',42:'标准 · 42mm',45:'大 · 45mm'}[size])+'</option>').join('')+'</select></label>'+
      btn('甲方资料 / 公章管理','editMaterialContractProfile()')+
      btn('回传合同 / 归档',"manageReturnedContracts('"+safe(id)+"')")+
      btn('修改合同内容',"editMaterialPurchaseContract('"+safe(id)+"')")+
      (n(currentOrder.returned_count)===0&&n(currentOrder.items?.reduce((q,it)=>q+n(it.received_qty),0))===0&&currentOrder.status==='已下单'?
        '<button type="button" class="btn danger mpo-delete-btn" onclick="deleteMaterialPurchaseOrder(\''+safe(id)+'\')">删除合同</button>':'')+
      btn('A4打印 / 保存PDF','printMaterialPurchaseContract()',true)+'</div>'+
      paperMarkup(currentOrder));
  }catch(e){toastMsg('获取合同失败：'+e.message)}
};
window.printMaterialPurchaseContract=function(){
  if(!currentOrder)return;
  const popup=window.open('','_blank');
  if(!popup){toastMsg('浏览器阻止了打印窗口，请允许此网站打开弹出窗口');return}
  const cssURL=new URL('/material-contract-print.css?v=a4-20261119-v4',location.origin).href;
  const home=new URL('/',location.origin).href;
  const toolbar='<div class="mpo-print-toolbar" id="mpoPrintToolbar">'+
    '<div class="mpo-print-toolbar-info"><strong>订货合同 · A4打印</strong><span id="mpoPrintStatus">正在加载打印样式…</span></div>'+
    '<div class="mpo-print-toolbar-actions">'+
    '<button type="button" id="mpoPrintNow" class="mpo-print-primary">打印 / 保存为 PDF</button>'+
    '<button type="button" id="mpoPrintClose" class="mpo-print-secondary">关闭</button>'+
    '</div></div>';
  popup.document.open();
  popup.document.write('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<base href="'+safe(home)+'"><title>'+safe(currentOrder.order_no)+' 订货合同（A4）</title>'+
    '<link id="contractPrintCSS" rel="stylesheet" href="'+safe(cssURL)+'"></head><body>'+
    toolbar+paperMarkup(currentOrder)+'</body></html>');
  popup.document.close();
  const status=popup.document.getElementById('mpoPrintStatus');
  const printNow=()=>{
    if(popup.closed)return;
    popup.focus();
    popup.print();
  };
  popup.document.getElementById('mpoPrintNow').addEventListener('click',printNow);
  popup.document.getElementById('mpoPrintClose').addEventListener('click',()=>popup.close());
  const link=popup.document.getElementById('contractPrintCSS');
  const styleReady=new Promise(resolve=>{
    let done=false;
    const finish=ok=>{if(done)return;done=true;resolve(ok)};
    if(link.sheet){finish(true);return}
    link.addEventListener('load',()=>finish(true),{once:true});
    link.addEventListener('error',()=>finish(false),{once:true});
    popup.setTimeout(()=>finish(!!link.sheet),15000);
  });
  (async()=>{
    try{
      const loaded=await styleReady;
      if(!loaded){
        if(status)status.textContent='打印样式加载失败，请检查网络后点击刷新';
        return;
      }
      if(status)status.textContent='A4纵向 · 单页排版 · 公章42mm · 可打印或保存PDF';
      if(popup.document.fonts?.ready)await popup.document.fonts.ready;
      await Promise.all([...popup.document.images].map(img=>img.complete?Promise.resolve():
        new Promise(resolve=>{img.onload=resolve;img.onerror=resolve})));
      if(popup.closed)return;
      const paper=popup.document.querySelector('.mpo-paper');
      if(paper&&paper.classList.contains('mpo-short-contract')){
        paper.style.height='297mm';
        paper.style.minHeight='297mm';
        paper.style.overflow='hidden';
      }
      // Open the native print dialog after the stylesheet and all images are ready.
      popup.setTimeout(printNow,250);
    }catch(err){
      if(status)status.textContent='打印准备失败：'+(err?.message||err);
    }
  })();
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
      '<div id="mpoStampPreview">'+(p.has_stamp?'<img alt="已保存公章" class="mpo-stamp-manager-img" src="/api/material-contract-profile/stamp?v='+encodeURIComponent(p.updated_at||'')+'" onerror="this.style.display=\'none\';document.getElementById(\'mpoStampStatus\').textContent=\'公章记录存在，但图片读取失败，请重新选择上传\'">':'')+'</div>'+
      '<div id="mpoStampStatus" class="mpo-stamp-status '+(p.has_stamp?'is-saved':'')+'">'+(p.has_stamp?'✓ 公章已保存到云端，无需再次保存。需要更换时直接选择新图片。':'尚未保存公章，点击下方选择图片即可上传。')+'</div>'+
      '<div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn primary" style="cursor:pointer">'+(p.has_stamp?'更换公章图片':'选择公章图片并上传')+
      '<input type="file" accept="image/png,image/jpeg,image/webp" id="mpoStampFile" style="display:none" onchange="uploadMaterialContractStamp()"></label>'+
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
  const input=el('mpoStampFile'),file=input?.files?.[0];
  if(!file)return;
  if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
    toastMsg('公章仅支持2MB以内PNG、JPG、WebP');input.value='';return
  }
  if(!confirm('请确认已获授权，并知悉当前工作台尚未配置严格登录保护。确认将此公章保存到云端吗？')){
    input.value='';return
  }
  const status=el('mpoStampStatus');
  input.disabled=true;
  if(status)status.textContent='正在上传和保存公章，请勿关闭窗口…';
  try{
    const fd=new FormData();fd.append('file',file);
    const response=await fetch('/api/material-contract-profile/stamp',{method:'POST',body:fd,cache:'no-store'});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'上传失败');
    await editMaterialContractProfile();
    toastMsg('公章已保存到云端，无需再次操作');
  }catch(err){
    if(status)status.textContent='上传未成功：'+err.message;
    toastMsg('公章保存失败：'+err.message)
  }finally{
    input.disabled=false;
    input.value='';
  }
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
