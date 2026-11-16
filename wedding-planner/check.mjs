import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const html=fs.readFileSync("wedding-planner/index.html","utf8");
const shared=fs.readFileSync("wedding-planner/wedding-cloud.js","utf8");
assert.ok(html.includes('id="cloudPanel"'),"shared panel");
assert.ok(html.includes("wedding-cloud.js"),"cloud script load");
assert.ok(html.includes("window.WeddingApp="),"app bridge");
assert.ok(shared.includes("wedding_merge_local_backup"),"safe import");
assert.ok(shared.includes("onSave"),"sync hook");
assert.ok(shared.includes("wedding_create_invite"),"invites");
const inline=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inline,"inline JS exists");
new vm.Script(inline[1],{filename:"wedding-planner/index.html:inline"});
new vm.Script(shared,{filename:"wedding-planner/wedding-cloud.js"});
const logic=html.split("\n").find(x=>x.startsWith("const paid=e=>"));
const ctx={state:{expenses:[{total:2000,payments:[{amount:300},{amount:600}]}],tasks:[{completed:true},{completed:false}],customCategories:[]},num:n=>Math.round(Number(n)*100)/100,CATS:[],CAT_ICONS:{},page:"home",document:{},window:{},$(){},$$(){}};
vm.createContext(ctx);vm.runInContext(logic,ctx);
assert.equal(vm.runInContext("totalPaid()",ctx),900);
assert.equal(vm.runInContext("totalDue()",ctx),1100);
assert.equal(vm.runInContext("progress()",ctx),50);
assert.equal(vm.runInContext("payStatus(state.expenses[0])",ctx),"partial");
const cats=html.match(/const CAT_RULES=[\s\S]*?(?=const paid=e=>)/)?.[0];
assert.ok(cats,"smart classifier exists");
vm.runInContext(cats,ctx);
const cases=[
  ["结婚五金","彩礼及三金"],["结婚酒席","婚宴酒席"],
  ["婚纱照","婚纱摄影"],["婚车费用","婚车交通"],
  ["装修五金配件","婚房装修"],["普通未分类事项",null]
];
for(const [name,category] of cases)assert.equal(vm.runInContext("inferExpenseCategory("+JSON.stringify(name)+")",ctx),category);
assert.ok(html.includes("editing?'未付款':'已付款'"),"new expenses default to paid");
assert.ok(html.includes("id=\"markExpensePaid\""),"existing expenses can be marked paid");
assert.ok(!html.includes("商家 / 收款人"),"merchant/payee field removed");
assert.ok(html.includes("-webkit-user-select:none"),"non-interactive text selection prevented");

assert.ok(!html.includes('id="homeShareLabel"'),"cloud banner removed from home");
assert.ok(html.includes('id="heroEngagement"'),"engagement is displayed on home");
assert.ok(html.includes('id="settingEngagementDate"'),"engagement date input in My");
assert.ok(html.includes('id="cloudAdvancedPanel"'),"cloud advanced pane exists in My");
assert.ok(html.includes('id="dataAdvanced"'),"advanced data controls are collapsed");
assert.ok(shared.includes('advancedRoot.innerHTML=switcher+migration'),"cloud advanced tools relocated");
assert.ok(shared.includes('engagementDate:""'),"cloud settings include engagement date");
const dateUtility=html.match(/const daysUntilDate=d=>\{[\s\S]*?\n\};/);
assert.ok(dateUtility,"date calculation utility exists");
ctx.today=()=>"2026-11-16";
vm.runInContext(dateUtility[0],ctx);
for(const [d,want] of [["2027-02-21",97],["2026-11-16",0],["2026-11-15",-1],["2026-11-17",1],["2026-02-30",null],["",null]]){
 assert.equal(vm.runInContext("daysUntilDate("+JSON.stringify(d)+")",ctx),want);
}
console.log("最终版 UI、订婚日期和跨设备设置同步静态检查通过");

console.log("新增：智能分类、默认已付款、历史记录一键付清及华为划词兼容检查通过");
console.log("婚礼管家语法、分次付款计算、共享按钮与迁移功能基本静态检查通过");
