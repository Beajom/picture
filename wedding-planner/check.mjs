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

// Expenses chart regression: only actual payments count; banquet and photography always distinguishable.
const chartLogic=html.match(/const EXPENSE_CHART_COLORS=[\s\S]*?(?=function renderExpenses\(\))/)?.[0];
assert.ok(chartLogic,"expense spending visualization exists");
assert.ok(html.includes('id="categoryChart"'),"expense chart widget exists");
assert.ok(html.indexOf('id="categoryChart"')>html.indexOf('id="expenseList"'),"expense breakdown is below list");
assert.ok(!html.includes('<h2>分类统计</h2>'),"old duplicate category section removed");
const chartContext={
 categories:()=>["婚宴酒席","婚纱摄影","其他"],
 num:n=>Math.round(Number(n)*100)/100,
 paid:e=>e.payments.reduce((sum,p)=>sum+p.amount,0),
 money:n=>"¥"+Number(n).toFixed(2),
 icon:()=>"",
 esc:s=>String(s),
 state:{expenses:[{category:"婚宴酒席",payments:[{amount:2000},{amount:1500}]},{category:"婚纱摄影",payments:[{amount:5999}]},{category:"婚宴酒席",payments:[]}]}
};
vm.createContext(chartContext);vm.runInContext(chartLogic,chartContext);
assert.equal(vm.runInContext("expenseCategoryStats(state.expenses).total",chartContext),9499);
assert.equal(vm.runInContext("expenseCategoryStats(state.expenses).groups.find(x=>x.c==='婚宴酒席').v",chartContext),3500);
assert.equal(vm.runInContext("expenseCategoryStats(state.expenses).groups.find(x=>x.c==='婚纱摄影').v",chartContext),5999);
assert.ok(vm.runInContext("renderExpenseCategoryChart()",chartContext).includes("conic-gradient"));
chartContext.state.expenses=[{category:"婚纱摄影",payments:[{amount:9379}]},{category:"婚宴酒席",payments:[]}];
assert.ok(vm.runInContext("renderExpenseCategoryChart()",chartContext).includes("¥0.00"),"unpaid banquet remains visible as zero");
assert.equal(vm.runInContext("expenseCategoryStats(state.expenses).total",chartContext),9379);
console.log("婚礼花费分类环形图、分类金额、定金口径及榜单位置检查通过");


// Refined wedding hero: engagement has a separate title/date, no old pill or edit controls.
assert.ok(html.includes('class="hero-anniversary"'),"keepsake information block");
assert.ok(html.includes('id="heroEngagementCount"'),"engagement countdown title");
assert.ok(html.includes('id="heroEngagementDate"'),"separate engagement date");
assert.ok(!html.includes('class="hero-moment engagement"'),"old cramped engagement pill removed");
assert.ok(!html.includes('data-action="go-dates"'),"home hero remains button-free");
const mainCode=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"";
assert.ok(mainCode.includes("engagementDays>0?"),"future engagement message exists");
assert.ok(mainCode.includes("engagementDays===0?"),"today engagement message exists");
assert.ok(mainCode.includes("已订婚 "), "past engagement message exists");
assert.ok(html.includes('id="startupSplash"'),"preferred Xi wedding loading page restored");
assert.ok(html.includes('weddingStartupBootstrap'),"startup script handles transition");
assert.ok(html.includes('startup-emblem'),"Xi brand symbol shown during cloud loading");
assert.ok(shared.includes('finally{window.WeddingSplash?.done?.()}'),"cloud boot completes splash");
assert.ok(html.includes('id="heroCount"'),"original wedding home retained");
const splashScript=html.match(/<script id="weddingStartupBootstrap">([\s\S]*?)<\/script>/)?.[1];
assert.ok(splashScript,"startup script present");new vm.Script(splashScript);
assert.ok(splashScript.includes("setTimeout(release,4000)"),"startup cannot block indefinitely");
console.log("保留用户指定的囍婚礼加载页，旧双环图标已由新安装清单替换");


console.log("最终版 UI、订婚日期和跨设备设置同步静态检查通过");

console.log("新增：智能分类、默认已付款、历史记录一键付清及华为划词兼容检查通过");
console.log("婚礼管家语法、分次付款计算、共享按钮与迁移功能基本静态检查通过");
