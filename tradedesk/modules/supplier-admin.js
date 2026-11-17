export function installSupplierPortalAdmin(ctx){
  const {supabase,supplier,toast,niceError,loadCloud,render,esc}=ctx;
  const state=()=>ctx.getState();

  function statusLabel(s){return ({pending:'待绑定',active:'已启用',disabled:'已停用'})[s]||s||'未创建'}
  function inputStatusLabel(s){return ({pending:'未填写',submitted:'待审核',approved:'已通过',rejected:'需修改'})[s]||s||'-'}
  function portalLink(token=''){
    const base=location.origin+location.pathname.replace(/index\.html$/,'').replace(/\/$/,'');
    return base+'/supplier.html'+(token?'?invite='+encodeURIComponent(token):'');
  }
  async function copyText(id){
    const el=document.getElementById(id);if(!el)return;
    const value=el.value||el.textContent||'';
    try{await navigator.clipboard.writeText(value);toast('已复制','ok')}
    catch(e){try{el.select?.();document.execCommand?.('copy');toast('已复制','ok')}catch(_){}}
  }

  window.copySupplierPortalText=copyText;

  window.supplierPortalModal=async id=>{
    const sp=supplier(id);if(!sp)return;
    toast('正在读取供应商账号...','warn',sp.company);
    const [aRes,iRes,pRes]=await Promise.all([
      supabase.from('trade_supplier_accounts').select('*').eq('supplier_id',id).maybeSingle(),
      supabase.from('trade_supplier_invites').select('*').eq('supplier_id',id).order('created_at',{ascending:false}).limit(1),
      supabase.from('trade_supplier_product_inputs').select('*').eq('supplier_id',id).eq('is_active',true).order('sku',{ascending:true})
    ]);
    if(aRes.error||iRes.error||pRes.error)return toast('供应商账号读取失败','err',niceError(aRes.error||iRes.error||pRes.error));
    const acc=aRes.data,inv=Array.isArray(iRes.data)?iRes.data[0]:null,rows=pRes.data||[];
    const submitted=rows.filter(x=>x.status==='submitted').length;
    const lastLink=inv&&inv.accepted_at==null&&new Date(inv.expires_at)>new Date()?portalLink(inv.token):'';
    const accountInfo=acc
      ? '<div class="notice"><b>登录状态：</b>'+esc(statusLabel(acc.status))+'<br><b>登录邮箱：</b>'+esc(acc.email||'未绑定')+'<br><b>分配产品：</b>'+rows.length+' 个 · <b>待审核：</b>'+submitted+' 个</div>'
      : '<div class="notice">该供应商还没有登录账号。生成邀请链接后，把链接发给供应商注册或登录即可。</div>';

    const inviteBox='<div class="card" style="box-shadow:none;margin-top:12px"><div class="card-pad"><h4 style="margin:0 0 10px">供应商登录邀请</h4><div class="form-grid">'+
      '<div class="field"><label>登录邮箱（可留空）</label><input id="spPortalEmail" type="email" value="'+esc(acc?.email||sp.email||'')+'" placeholder="supplier@example.com"></div>'+
      '<div class="field full"><label>邀请链接</label><div class="row"><input id="spInviteLink" style="flex:1" readonly value="'+esc(lastLink)+'" placeholder="点击“生成邀请链接”">'+
      '<button class="btn" onclick="window.copySupplierPortalText(\'spInviteLink\')">复制</button>'+
      '<button class="btn primary" onclick="window.createSupplierPortalInvite(\''+id+'\')">生成邀请链接</button></div>'+
      '<div class="hint">邀请有效期 14 天；新生成链接会使之前未使用的链接失效。</div></div></div></div></div>';

    const accountActions=acc
      ? '<div class="row" style="margin-top:10px"><a class="btn" href="'+esc(portalLink())+'" target="_blank" rel="noopener">打开供应商入口 ↗</a>'+
        (acc.status==='active'
          ? '<button class="btn danger" onclick="window.setSupplierPortalStatus(\''+id+'\',\'disabled\')">停用账号</button>'
          : acc.status==='disabled'
            ? '<button class="btn primary" onclick="window.setSupplierPortalStatus(\''+id+'\',\'active\')">启用账号</button>'
            : '<span class="muted">等待供应商接受邀请并绑定账号</span>')+
        '</div>'
      : '';

    const reviewRows=rows.length
      ? '<div class="table-wrap" style="margin-top:14px"><table class="table"><tr><th>产品</th><th>采购价</th><th>重量 KG/箱</th><th>装箱</th><th>箱规 cm</th><th>CBM</th><th>MOQ</th><th>交期</th><th>状态</th><th>审核</th></tr>'+
        rows.map(r=>'<tr><td><b>'+esc(r.sku)+'</b><br><span class="muted">'+esc(r.product_name||'')+'</span></td>'+
          '<td>'+esc(r.purchase_currency)+' '+Number(r.purchase_price||0).toFixed(4)+'</td>'+
          '<td>NW '+Number(r.net_weight||0)+'<br>GW '+Number(r.gross_weight||0)+'</td>'+
          '<td>'+Number(r.pcs_carton||0)+' / 箱</td>'+
          '<td>'+Number(r.carton_length_cm||0)+' × '+Number(r.carton_width_cm||0)+' × '+Number(r.carton_height_cm||0)+'</td>'+
          '<td>'+Number(r.carton_cbm||0).toFixed(6)+'</td>'+
          '<td>'+Number(r.moq||0)+'</td><td>'+Number(r.lead_time_days||0)+' 天</td>'+
          '<td>'+esc(inputStatusLabel(r.status))+(r.review_note?'<br><span class="muted">'+esc(r.review_note)+'</span>':'')+'</td>'+
          '<td>'+(r.status==='submitted'
            ? '<button class="btn small primary" onclick="window.reviewSupplierPortalInput(\''+r.id+'\',true,\''+id+'\')">通过</button> <button class="btn small danger" onclick="window.reviewSupplierPortalInput(\''+r.id+'\',false,\''+id+'\')">驳回</button>'
            : '<span class="muted">—</span>')+'</td></tr>').join('')+
        '</table></div>'
      : '<div class="empty" style="padding:24px">暂无分配给该供应商的产品。请先在产品库设置默认供应商。</div>';

    state().modal='<div class="modal-bg"><div class="modal" style="max-width:1180px"><div class="modal-head"><div><h3>供应商账号 · '+esc(sp.company)+'</h3>'+
      '<div class="muted">供应商只能看到分配给自己的产品，不会看到客户、销售订单、销售价、利润或其他供应商资料。</div></div>'+
      '<button class="x" onclick="window.closeModal()">×</button></div><div class="modal-body">'+accountInfo+inviteBox+accountActions+
      '<div class="section-head" style="padding:18px 0 6px"><div><h3>供应商填报 / 审核</h3><p>供应商提交后先进入待审核；通过后才更新正式产品库。</p></div>'+
      '<span class="badge">'+rows.length+' 个产品 · '+submitted+' 待审核</span></div>'+reviewRows+
      '</div><div class="modal-foot"><span class="save-state">供应商权限由 Supabase RLS 隔离</span><button class="btn primary" onclick="window.closeModal()">关闭</button></div></div></div>';
    render();
  };

  window.createSupplierPortalInvite=async id=>{
    if(state().saving)return;
    const email=String(document.getElementById('spPortalEmail')?.value||'').trim();
    state().saving=true;
    const {data,error}=await supabase.rpc('create_trade_supplier_invite',{p_supplier_id:id,p_email:email||null});
    state().saving=false;
    if(error)return toast('邀请链接生成失败','err',niceError(error));
    const link=portalLink(data?.token||'');
    const el=document.getElementById('spInviteLink');if(el)el.value=link;
    try{await navigator.clipboard.writeText(link);toast('邀请链接已生成并复制','ok','可直接发给供应商')}
    catch(e){toast('邀请链接已生成','ok','点击复制按钮发送给供应商')}
  };

  window.setSupplierPortalStatus=async(id,status)=>{
    if(state().saving)return;
    state().saving=true;
    const {error}=await supabase.rpc('set_trade_supplier_account_status',{p_supplier_id:id,p_status:status});
    state().saving=false;
    if(error)return toast('账号状态更新失败','err',niceError(error));
    toast(status==='disabled'?'供应商账号已停用':'供应商账号已启用','ok');
    window.supplierPortalModal(id);
  };

  window.reviewSupplierPortalInput=async(inputId,approve,supplierId)=>{
    const note=approve?'':(prompt('请输入驳回原因（供应商登录后会看到）：','请核对后重新提交')||'');
    if(!approve&&!note)return;
    if(approve&&!confirm('确认通过这条供应商填报？\n通过后会更新产品库中的采购价、重量、装箱数量、箱规和 MOQ。'))return;
    if(state().saving)return;
    state().saving=true;
    const {error}=await supabase.rpc('review_trade_supplier_product_input',{p_input_id:inputId,p_approve:!!approve,p_review_note:note});
    state().saving=false;
    if(error)return toast('审核失败','err',niceError(error));
    await loadCloud();
    toast(approve?'供应商资料已审核并更新产品库':'已驳回，供应商可重新修改提交','ok');
    window.supplierPortalModal(supplierId);
  };
}
