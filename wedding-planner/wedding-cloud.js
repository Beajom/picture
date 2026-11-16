/* 婚礼家庭共享 V2：publishable key 可公开，真正的访问权限由 PostgreSQL RLS 控制 */
(function(){
"use strict";
var app=window.WeddingApp,root=document.getElementById("cloudPanel");
var db=null,session=null,spaces=[],mine=[],base=null,pending=null,busy=false,loading=false,channel=null,notice="",authMode="login";
var api="https://waiyncvhkzdaeitlmxdk.supabase.co";
var key="sb_publishable_k4uukhu-jjAdOwm__C8BKA_vjHC0vuE";
var c=window.WeddingCloud={active:false,role:null,spaceId:null,members:[],onSave:onSave,refresh:load};
if(!app||!root)return;
var st=document.createElement("style");st.textContent=".cloud-card{border:1px solid #eaded7;background:#fffaf7;border-radius:15px;padding:14px;margin:12px 0}.cloud-card h3{margin:0 0 10px}.cloud-card p{font-size:12px;color:#8b7770;line-height:1.7}.cloud-stack{display:grid;gap:9px}.cloud-in{width:100%;padding:12px;border:1px solid #eaded7;background:#fff;border-radius:10px;font-size:15px}.cloud-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.cloud-actions>*{flex:1}.cloud-member{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #eee;padding:10px 0;gap:6px}.cloud-chip{font-size:12px;background:#f5ede7;border-radius:99px;padding:4px 8px}.cloud-error{color:#ad4242}";document.head.appendChild(st);
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(x){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]})}
function copy(s){return JSON.parse(JSON.stringify(s))}
function label(s){return s==="admin"?"管理员":"家人"}
function err(e){return e&&e.message||String(e||"未知错误")}
function tip(s){notice=s;app.toast(s);draw()}
function getCacheKey(){return "wedding-cloud-v2:"+c.spaceId}
function actualLocalCount(s){
  return (s.expenses||[]).length+(s.guests||[]).length+
    (s.tasks||[]).filter(function(t){return !t.template||t.completed||t.date||t.notes}).length+
    ((s.settings?.budget!=null||s.settings?.date)?1:0);
}
function spaceTitle(m){
  const item=spaces.find(function(x){return x.id===m.space_id});
  return (item?.title||"共享婚礼")+" · "+(m.itemCount||0)+" 条记录"+(m.hasSettings?"（已设置预算/日期）":"");
}

function updateHomeShareStatus(){
 var label=document.getElementById("homeShareLabel"),desc=document.getElementById("homeShareDescription"),btn=document.getElementById("homeShareButton");
 if(!label||!desc||!btn)return;
 if(c.active){
  var info=mine.find(function(m){return m.space_id===c.spaceId});
  label.textContent="云端家庭共享 · 已连接";
  desc.textContent=(spaces.find(function(v){return v.id===c.spaceId})?.title||"我们的婚礼")+" · "+(info?.itemCount??0)+" 条云端记录";
  btn.textContent="共享设置 ›";
 }else{
  label.textContent="家庭共享 · 尚未连接";
  desc.textContent=session?"请选择一个共享婚礼空间":"登录后可与对象、家人实时同步";
  btn.textContent="进入共享 ›";
 }
}
function draw(){
 updateHomeShareStatus();
if(!db){root.innerHTML='<div class="cloud-card"><h3>家庭共享服务暂不可用</h3><p>请检查网络并刷新；本机旧数据不会丢失。</p>'+esc(notice)+'</div>';return}
var status=notice?'<p>'+esc(notice)+'</p>':"";
if(!session){
root.innerHTML='<div class="cloud-card"><h3>家庭共享 · '+(authMode==="login"?"登录":"注册")+'</h3><p>每位家庭成员使用自己的邮箱账号。请勿把你的管理员账号密码告诉家人。</p><form id="cloudAuth" class="cloud-stack"><input class="cloud-in" name="email" type="email" placeholder="邮箱" autocomplete="email" required><input class="cloud-in" name="password" type="password" minlength="8" autocomplete="'+(authMode==="login"?"current-password":"new-password")+'" placeholder="密码不少于8位" required><button class="btn full" type="submit">'+(authMode==="login"?"登录":"注册账号")+'</button></form><div class="cloud-actions"><button class="btn secondary" type="button" data-cloud="switch-auth">'+(authMode==="login"?"没有账号，创建账号":"已有账号，返回登录")+'</button></div><p>新注册账号可能需要先在邮箱中验证，验证后返回这个网页登录。</p>'+status+'</div>';bindForms();return
}
if(!c.active){
var link=new URLSearchParams(location.search).get("invite")||"";
var current=mine.length?'<div class="cloud-card"><h3>已有共享婚礼</h3><p>如果出现多个同名空间，请选择已保存记录的版本。切换不会删除另一份数据。</p>'+mine.map(function(m){return '<button class="btn secondary full" data-open-space="'+esc(m.space_id)+'">'+esc(spaceTitle(m))+' · '+label(m.role)+'</button>'}).join("")+'</div>':"";
root.innerHTML='<div class="cloud-card"><span class="cloud-chip">已登录 '+esc(session.user.email||"账号")+'</span> <button class="btn secondary small" data-cloud="logout">退出</button></div>'+current+'<div class="cloud-card"><h3>创建我们的婚礼</h3><form id="cloudCreate" class="cloud-stack"><input class="cloud-in" name="title" placeholder="婚礼名称" maxlength="80" required><input class="cloud-in" name="nickname" placeholder="我在家庭中的称呼" maxlength="60" required><button class="btn full" type="submit">创建共享婚礼</button></form></div><div class="cloud-card"><h3>凭邀请码加入</h3><form id="cloudJoin" class="cloud-stack"><input class="cloud-in" name="invite" placeholder="粘贴邀请码或邀请链接" value="'+esc(link)+'" required><input class="cloud-in" name="nickname" placeholder="我的称呼" maxlength="60" required><button class="btn secondary full" type="submit">加入婚礼</button></form></div>'+status;bindForms();return
}
var admin=c.role==="admin",old=app.getLegacy(),count=old.expenses.length+old.tasks.length+old.guests.length,actualCount=actualLocalCount(old);
var currentSpace=mine.find(function(m){return m.space_id===c.spaceId});
var duplicated=mine.length>1;
var switcher=duplicated?'<div class="cloud-card"><h3>切换共享婚礼</h3><p>检测到 '+mine.length+' 个婚礼空间。如果电脑记录为空，请选择下方有记录的空间；不会删除或合并其他空间。</p>'+mine.map(function(m){return '<button class="btn secondary full" style="margin-top:8px" data-open-space="'+esc(m.space_id)+'" '+(m.space_id===c.spaceId?'disabled':'')+'>'+esc(spaceTitle(m))+(m.space_id===c.spaceId?' · 当前使用':' · 点击切换')+'</button>'}).join("")+'</div>':"";
var emptyWarning=duplicated&&(currentSpace?.itemCount||0)===0&&mine.some(function(m){return m.itemCount>0})?'<p class="cloud-error">你现在进入的是空白婚礼，另一份同名婚礼已经有记录。请在下方切换。</p>':"";
var invite=admin?'<div class="cloud-card"><h3>邀请对象和家人</h3><p>对象以管理员加入，能管理全部数据；家人只能修改分配给自己的筹备任务。每条邀请码只可使用一次，有效期7天。</p><div class="cloud-actions"><button class="btn secondary" data-cloud="invite-admin">邀请对象</button><button class="btn secondary" data-cloud="invite-family">邀请家人</button></div><div id="cloudInviteResult"></div></div>':"";
var members='<div class="cloud-card"><h3>家庭成员</h3>'+c.members.map(function(m){return '<div class="cloud-member"><span>'+esc(m.display_name)+' <small>('+label(m.role)+(m.user_id===session.user.id?",我":"")+')</small></span>'+(admin&&m.user_id!==session.user.id?'<button class="btn small secondary" data-remove-user="'+esc(m.user_id)+'">移除</button>':"")+'</div>'}).join("")+'</div>';
var migration=admin?'<div class="cloud-card"><h3>安全同步旧手机记录</h3><p>当前设备本机共有 '+count+' 条记录（含默认清单），其中 '+actualCount+' 条有实际设置或内容。请务必在保存过费用的手机上操作，先下载备份，再把云端缺少的记录补齐。已有同编号记录和云端预算不会被覆盖。</p><div class="cloud-actions"><button class="btn secondary" data-cloud="backup">先备份手机原始数据</button><button class="btn secondary" data-cloud="migrate" '+(actualCount===0?'disabled':'')+'>仅补充未同步记录</button></div>'+(actualCount===0?'<p class="cloud-error">这台设备尚未找到需要同步的真实记录。请使用原来记账的手机执行补充，避免导入空白模板。</p>':'')+'</div>':"";
root.innerHTML='<div class="cloud-card"><h3>家庭共享已连接 <span class="cloud-chip">'+(busy||pending?"正在同步":"实时同步")+'</span></h3><p>'+esc(spaces.find(function(x){return x.id===c.spaceId})?.title||"我们的婚礼")+' · '+label(c.role)+' · 云端 '+(currentSpace?.itemCount??"?")+' 条记录</p>'+emptyWarning+'<p>'+(admin?"你和对象均可管理全部花费与待办。":"你只会看到分配给自己的事项，不能查看全部预算、花费和宾客。")+'</p><div class="cloud-actions"><button class="btn secondary" data-cloud="refresh">刷新同步</button><button class="btn secondary" data-cloud="logout">退出账号</button></div>'+status+'</div>'+switcher+invite+members+migration;
}
function bindForms(){
var f=document.getElementById("cloudAuth");if(f)f.onsubmit=async function(e){e.preventDefault();var email=f.elements.email.value.trim(),pass=f.elements.password.value,button=f.querySelector("button[type=submit]");button.disabled=true;
try{var r=authMode==="login"?await db.auth.signInWithPassword({email:email,password:pass}):await db.auth.signUp({email:email,password:pass,options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;
if(authMode==="signup"&&!r.data.session){authMode="login";tip("注册成功，请查看验证邮件。验证后返回本页面登录。")}else{await bootSession();tip("登录成功")}}catch(x){tip("登录/注册失败："+err(x))}finally{button.disabled=false}};
var a=document.getElementById("cloudCreate");if(a)a.onsubmit=async function(e){
 e.preventDefault();const btn=a.querySelector('button[type="submit"]');if(btn.disabled)return;btn.disabled=true;
 try{
  if(mine.length&&!confirm("你的账号已存在共享婚礼。创建新婚礼会生成另一份独立数据，确定仍要创建吗？"))return;
  var r=await db.rpc("wedding_create_space",{p_title:a.elements.title.value.trim(),p_name:a.elements.nickname.value.trim()});
  if(r.error)throw r.error;
  await memberships();await openSpace(r.data);tip("婚礼共享空间已创建");
 }catch(x){tip("创建失败："+err(x))}finally{btn.disabled=false}
};
var b=document.getElementById("cloudJoin");if(b)b.onsubmit=async function(e){e.preventDefault();var invite=b.elements.invite.value.trim();try{if(invite.includes("invite="))invite=new URL(invite).searchParams.get("invite")||invite;var r=await db.rpc("wedding_join_space",{p_token:invite,p_name:b.elements.nickname.value.trim()});if(r.error)throw r.error;history.replaceState(null,"",location.pathname);await memberships();await openSpace(r.data);tip("成功加入家庭共享")}catch(x){tip("加入失败："+err(x))}}
}
function roleUI(){
var family=c.active&&c.role==="family";
["home","expenses","guests"].forEach(function(p){var b=document.querySelector('[data-page="'+p+'"]');if(b)b.style.display=family?"none":""});
var fab=document.getElementById("fab");if(fab)fab.style.display=family?"none":"";
["add-task","reset-template"].forEach(function(action){document.querySelectorAll('[data-action="'+action+'"]').forEach(function(x){x.style.display=family?"none":""})});
var settings=document.getElementById("settings");if(settings)[...settings.children].forEach(function(x){if(x.id!=="cloudPanel"&&x.tagName!=="H1")x.style.display=family?"none":""});
if(family)app.view("tasks");
}
function mapItems(s){var m=new Map();[["expense",s.expenses],["task",s.tasks],["guest",s.guests]].forEach(function(q){q[1].forEach(function(item){m.set(item.id,{space_id:c.spaceId,id:item.id,item_type:q[0],data:item,assigned_to:q[0]==="task"?(item.assigned_to||null):null})})});return m}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function onSave(next){
if(!c.active)return;
pending=copy(next);
try{localStorage.setItem(getCacheKey(),JSON.stringify({data:pending,dirty:true}))}catch(e){}
draw();void flush();
}
async function flush(){
if(!c.active||busy||!pending||!navigator.onLine)return;busy=true;draw();
try{while(pending&&c.active){var next=pending;pending=null;var old=base||{settings:{},customCategories:[],expenses:[],tasks:[],guests:[]};
if(c.role==="admin"){var s0={settings:old.settings,customCategories:old.customCategories||[]},s1={settings:next.settings,customCategories:next.customCategories||[]};
if(!same(s0,s1)){var w=await db.from("wedding_settings").upsert({space_id:c.spaceId,data:s1,updated_at:new Date().toISOString()},{onConflict:"space_id"});if(w.error)throw w.error}}
var prev=mapItems(old),curr=mapItems(next);
for(var [id,row] of prev){if(!curr.has(id)){if(c.role!=="admin")throw Error("家人无权删除记录");var del=await db.from("wedding_items").delete().eq("space_id",c.spaceId).eq("id",id);if(del.error)throw del.error}}
for(var [id,row] of curr){var before=prev.get(id);if(!before||!same(before.data,row.data)||before.assigned_to!==row.assigned_to){
if(c.role==="family"){if(!before||row.item_type!=="task"||before.assigned_to!==session.user.id||row.assigned_to!==session.user.id)throw Error("只能更改分配给自己的任务");var up=await db.from("wedding_items").update({data:row.data,updated_at:new Date().toISOString()}).eq("space_id",c.spaceId).eq("id",id).select("id");if(up.error)throw up.error;if(!up.data?.length)throw Error("该任务已无法编辑")}
else {var ups=await db.from("wedding_items").upsert({...row,updated_at:new Date().toISOString()},{onConflict:"space_id,id"});if(ups.error)throw ups.error}
}}
base=copy(next);localStorage.setItem(getCacheKey(),JSON.stringify({data:next,dirty:false}));
}}
catch(e){if(!pending)pending=app.snapshot();notice="云端暂未保存，修改仍保留在本机缓存："+err(e);app.toast("云端同步失败，可稍后重试")}
finally{busy=false;draw()}
if(!pending&&c.active)void load(true);
}
async function memberships(){
var r=await Promise.all([db.from("wedding_members").select("space_id,user_id,role,display_name").eq("user_id",session.user.id),db.from("wedding_spaces").select("id,title,created_at")]);if(r[0].error)throw r[0].error;if(r[1].error)throw r[1].error;mine=r[0].data||[];spaces=r[1].data||[];
await Promise.all(mine.map(async function(m){
 const res=await Promise.all([
  db.from("wedding_items").select("id",{count:"exact",head:true}).eq("space_id",m.space_id),
  db.from("wedding_settings").select("space_id",{count:"exact",head:true}).eq("space_id",m.space_id)
 ]);
 m.itemCount=res[0].error?0:(res[0].count||0);
 m.hasSettings=!res[1].error&&res[1].count>0;
}));
mine.sort(function(a,b){
  const av=(a.itemCount||0)*10+(a.hasSettings?1:0);
  const bv=(b.itemCount||0)*10+(b.hasSettings?1:0);
  return bv-av;
});
draw();
}
async function load(silent){
if(!c.active||busy||pending||loading)return;
loading=true;
try{var r=await Promise.all([db.from("wedding_items").select("id,item_type,data,assigned_to").eq("space_id",c.spaceId),db.from("wedding_settings").select("data").eq("space_id",c.spaceId).maybeSingle(),db.from("wedding_members").select("role").eq("space_id",c.spaceId).eq("user_id",session.user.id).maybeSingle(),db.from("wedding_members").select("space_id,user_id,role,display_name").eq("space_id",c.spaceId)]);
for(var v of r)if(v.error)throw v.error;
if(!r[2].data)throw Error("当前账号不再属于该婚礼");
c.role=r[2].data.role;c.members=r[3].data||[];
var state={settings:{date:"",budget:null,partner:"",seats:10},customCategories:[],expenses:[],tasks:[],guests:[]};
if(r[1].data&&c.role==="admin"){Object.assign(state.settings,r[1].data.data?.settings||{});state.customCategories=r[1].data.data?.customCategories||[]}
r[0].data.forEach(function(row){var it={...row.data};if(row.item_type==="task")it.assigned_to=row.assigned_to||null;var k={expense:"expenses",task:"tasks",guest:"guests"}[row.item_type];if(k)state[k].push(it)});
base=copy(state);
var cache=null;try{cache=JSON.parse(localStorage.getItem(getCacheKey())||"null")}catch(e){}
if(cache?.dirty&&!silent){app.replace(cache.data);pending=copy(cache.data);void flush()}else{app.replace(state);roleUI()}
notice="";draw()
}catch(e){notice="加载云端失败："+err(e);if(/不再属于/.test(err(e))){c.active=false;c.spaceId=null;app.replace(app.getLegacy());roleUI()}if(!silent)app.toast(notice);draw()}
finally{loading=false}
}
async function openSpace(space){
if(busy||pending)throw Error("还有尚未同步的修改，请先完成同步再切换婚礼");
if(channel){await db.removeChannel(channel);channel=null}
var m=mine.find(function(x){return x.space_id===space});if(!m)throw Error("未获得该婚礼的访问权限");
c.spaceId=space;c.role=m.role;c.active=true;localStorage.setItem("wedding-current-space-v2",space);
await load(false);
channel=db.channel("wedding:"+space).on("postgres_changes",{event:"*",schema:"public",table:"wedding_items",filter:"space_id=eq."+space},function(){if(!busy&&!pending)void load(true)}).on("postgres_changes",{event:"*",schema:"public",table:"wedding_settings",filter:"space_id=eq."+space},function(){if(!busy&&!pending)void load(true)}).on("postgres_changes",{event:"*",schema:"public",table:"wedding_members",filter:"space_id=eq."+space},function(){if(!busy&&!pending)void load(true)}).subscribe();
roleUI();draw()
}
async function bootSession(){
var a=await db.auth.getSession();if(a.error)throw a.error;session=a.data.session||null;
if(!session){c.active=false;c.spaceId=null;c.role=null;c.members=[];base=null;pending=null;app.replace(app.getLegacy());roleUI();draw();return}
await memberships();
var remembered=localStorage.getItem("wedding-current-space-v2");
var m=mine.find(function(x){return x.space_id===remembered})||mine[0];
if(m)await openSpace(m.space_id);else draw()
}
root.addEventListener("click",async function(e){
var b=e.target.closest("[data-cloud],[data-open-space],[data-remove-user]");if(!b||!db)return;
if(b.dataset.openSpace){try{await openSpace(b.dataset.openSpace)}catch(x){tip(err(x))}return}
if(b.dataset.removeUser){if(!confirm("移除后对方不能再访问共享数据，确定继续？"))return;var rem=await db.rpc("wedding_remove_member",{p_space:c.spaceId,p_user:b.dataset.removeUser});if(rem.error)tip(err(rem.error));else{await load(true);tip("成员已移除")}return}
var action=b.dataset.cloud;
if(action==="switch-auth"){authMode=authMode==="login"?"signup":"login";draw();return}
if(action==="logout"){if(pending||busy){tip("还有未同步修改，请先联网保存再退出");return}if(channel){await db.removeChannel(channel);channel=null}if(c.spaceId)localStorage.removeItem(getCacheKey());await db.auth.signOut();session=null;c.active=false;c.spaceId=null;base=null;pending=null;localStorage.removeItem("wedding-current-space-v2");await bootSession();return}
if(action==="refresh"){if(pending)await flush();else await load(false);tip(pending?"仍有未同步修改":"已重新读取云端数据");return}
if(action==="invite-admin"||action==="invite-family"){try{var role=action==="invite-admin"?"admin":"family";var rr=await db.rpc("wedding_create_invite",{p_space:c.spaceId,p_role:role});if(rr.error)throw rr.error;var inviteUrl=location.origin+location.pathname+"?invite="+rr.data;document.getElementById("cloudInviteResult").innerHTML='<div class="cloud-card"><b>'+label(role)+'邀请链接</b><input class="cloud-in" id="inviteToCopy" value="'+esc(inviteUrl)+'" readonly><button class="btn secondary" data-cloud="copy-link">复制链接</button><p>请私下发送。对象邀请链接仅供信任的另一半使用，拥有它可取得管理员权限。</p></div>'}catch(x){tip("邀请码创建失败："+err(x))}return}
if(action==="copy-link"){var input=document.getElementById("inviteToCopy");if(input){try{await navigator.clipboard.writeText(input.value);app.toast("链接已复制")}catch(x){input.select();document.execCommand("copy");app.toast("已尝试复制")}}return}
if(action==="backup"){try{var backup=app.getLegacy();var blob=new Blob([JSON.stringify({format:"wedding-planner-v1",exportedAt:new Date().toISOString(),data:backup},null,2)],{type:"application/json"});var u=URL.createObjectURL(blob),el=document.createElement("a");el.href=u;el.download="婚礼管家_原手机备份.json";document.body.append(el);el.click();el.remove();setTimeout(function(){URL.revokeObjectURL(u)},2000);app.toast("已开始下载旧版备份")}catch(x){tip(err(x))}return}
if(action==="migrate"){
 if(!c.active||c.role!=="admin")return;
 if(busy||pending)return tip("请等待当前数据同步完成，再导入旧记录");
 var snapshot=app.getLegacy();
 if(actualLocalCount(snapshot)===0)return tip("本机没有可迁移的真实记录，请使用原来记账的手机操作");
 if(!confirm("请先确认已成功保存旧版 JSON 备份。本次只补充当前共享婚礼中缺少的项目，不覆盖已有预算、费用或付款。请确认当前选中的是正确的婚礼空间。继续吗？"))return;
 b.disabled=true;
 try{
  var importR=await db.rpc("wedding_merge_local_backup",{p_space:c.spaceId,p_snapshot:snapshot});
  if(importR.error)throw importR.error;
  await memberships();await load(false);
  const added=importR.data?.added||0,skipped=importR.data?.skipped||0;
  tip("迁移完成：新增 "+added+" 条，跳过已存在编号 "+skipped+" 条；云端原有内容未被覆盖。本机数据仍然保留。");
 }catch(x){tip("迁移失败，原数据未删除："+err(x))}finally{b.disabled=false}
 return
}
});
window.addEventListener("online",function(){if(pending)void flush();else if(c.active)void load(true)});
document.addEventListener("visibilitychange",function(){if(!document.hidden&&c.active&&!pending)void load(true)});
(async function(){
try{
 if(!window.supabase?.createClient){
   for(const src of ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js","https://unpkg.com/@supabase/supabase-js@2.58.0/dist/umd/supabase.js"]){
     try{await new Promise(function(resolve,reject){var el=document.createElement("script");el.src=src;el.onload=resolve;el.onerror=reject;document.head.append(el)});if(window.supabase?.createClient)break}catch(e){}
   }
 }
 if(!window.supabase?.createClient)throw Error("云端依赖加载失败，请检查浏览器网络连接");
 db=window.supabase.createClient(api,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
db.auth.onAuthStateChange(function(evt){if(evt==="SIGNED_OUT"){session=null;c.active=false;app.replace(app.getLegacy());roleUI();draw()}});
await bootSession()
}catch(e){notice=err(e);draw()}
})();
})();