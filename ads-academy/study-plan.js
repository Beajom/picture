/* Ads Academy v3 · structured practice module; no third-party dependencies */
(function(){
'use strict';
var ctx = null;
var WEEKS = [
 {name:'建立经营底线',sub:'利润、流量与自然排名',result:'建立1张单件利润与广告边界表',color:'利润'},
 {name:'研究市场与流量词',sub:'竞品、关键词、匹配与报表',result:'交付1份关键词分层与广告结构草案',color:'选词'},
 {name:'测试与放量判断',sub:'预算、CPC、CVR、变体与广告位',result:'交付1份可回滚的广告测试方案',color:'投放'},
 {name:'优化、复盘与标准化',sub:'否定、账户治理、旺季与SOP',result:'交付1份每周广告优化复盘',color:'优化'}
];
var DAYS = [
 [1, '搞懂广告利润方程式','01',[0,1,2],'选择一个产品，列出售价、采购包装、头程、佣金、FBA与其他单件费用','能算出广告前单件贡献毛利，并注明计算口径','Fee Preview + 商品成本表'],
 [2, '求出目标 ACOS 与 CPA','01',[3,4,8],'用保守的售价和成本测算盈亏平衡 ACOS、目标 CPA，分清盈利型与投资型广告','写出最大可承受 CPA 与你的利润安全垫','广告计算器 + 费用预览'],
 [3, '读懂 TACOS 与自然销售','01',[5,7,11],'记录同一期间广告花费、广告销售额、总销售额，计算 ACOS、TACOS','能解释 TACOS 下降是否伴随总利润增长','广告汇总 + 业务报告'],
 [4, '绘制亚马逊流量地图','02',[0,1,2],'找到自己产品的搜索自然、SP、SB、详情页推荐等入口','画出至少4种真实触点与对应广告类型','搜索页面 + 商品详情页'],
 [5, '拆解 CTR、CVR 漏斗','02',[3,4,7],'比较两个活动的曝光、点击、订单、CTR、CVR 与 CPC','能区分曝光不足、点击不足和转化不足','SP 活动/投放报告'],
 [6, '认清自然排名和相关性','03',[0,3,6],'选3个核心关键词，记录自然位、广告位、相关性和上架状态','不把广告排名等同自然排名，完成基线记录','SIF + 搜索页实测'],
 [7, '完成第一周经营诊断','03',[8,12,16],'汇总单位经济模型、流量漏斗和3个核心关键词排名','输出1页本周经营基线与下周优先级','利润表 + SIF + 广告报表'],
 [8, '建立竞品 ASIN 样本','04',[0,2,5],'挑选3–5个价格、款式、用途相近的竞品，列出差异','能解释哪些竞品可比，哪些不宜混进样本','竞品 Listing + Helium 10'],
 [9, '用 Cerebro 反查关键词','04',[6,10,14],'导出竞品词，按搜索意图区分核心词、场景词、品牌词和偏题词','形成初版全词库和高相关准词库','Cerebro + 卖家精灵'],
 [10,'关键词分层与排除','04',[15,18,20],'为关键词标注相关性、竞争强度、优先级、待否定状态','输出精准测试词、探索词与不相关词3类清单','关键词竞争表'],
 [11,'把购买场景写进页面','05',[0,2,5],'列出用户、功能、使用场景及常见疑问，核查 Listing 是否准确回答','输出5个基于真实卖点的场景问题','Listing + 客户问答'],
 [12,'区分投放词和搜索词','06',[0,2,4],'从一个 SP 活动找出投放关键词与实际触发的搜索词','列出至少5条对应关系并解释差异','SP 搜索词报告'],
 [13,'设计匹配与否定结构','06',[8,12,16],'给5个词规划精准、词组、广泛与否定；检查是否会误伤优质流量','形成可执行的测试清单与否定规则','SP 投放设置 + 搜索词'],
 [14,'完成第二周广告结构图','07',[0,3,7],'按探索、验证、放量、保护四种目标整理现有活动','每个活动有明确目标、预算边界和命名','广告活动列表 + SQP'],
 [15,'定位搜索词漏斗损耗','07',[10,13,16],'找出高点击低转化、高转化低曝光的搜索词，排除归因延迟影响','产出3个需核查词、3个可观察词','SP 搜索词 + 业务报告'],
 [16,'设计新品测试预算','08',[0,3,7],'用目标 CPA、预估 CVR 和 CPC 设计7天实验预算','写清测试假设、样本量不足时的观察规则','竞价区间 + 利润模型'],
 [17,'评估竞价与转化边界','08',[10,14,19],'比较建议竞价、实际 CPC、CTR、CVR；模拟高低出价成本','能够说明加价条件及可能损失','SP 投放/广告位报告'],
 [18,'分清放量与收缩','09',[0,4,8],'将活动分为盈利可放量、潜力待验证、低效待收缩3组','每个动作说明依据、预期和止损条件','活动报表 + SKU 利润表'],
 [19,'制作搜索词收割流程','09',[11,16,22],'把高相关转化词加入精准测试，同时保留来源流量的验证路径','有关键词迁移、去重与复查计划','搜索词/投放词两张表'],
 [20,'协调父子变体推广','10',[0,3,8],'为主推与辅助尺码/颜色设计分工，检查相同搜索词上的重复投放','形成主推变体、辅助变体、库存约束表','父体/子体广告数据'],
 [21,'检查 TOS、ROS、PP','11',[0,4,9],'对比首页顶部、其他搜索位置和商品页面的 CPC、CVR、ACOS','避免只凭一个位置的 ROAS 全局加价','SP 广告位报告'],
 [22,'构建可回滚的出价试验','11',[12,18,22],'选1个活动做小幅预算或广告位调整，保留对照基线','写清变更、观察周期、停止条件','广告位 + 每日活动表现'],
 [23,'理解 SB/SBV/SD 与商品定向','12',[0,3,6],'按目标识别 SP、SB、SBV、SD、商品定向的适用边界','给每类广告写1条使用情景，不为开广告而开广告','广告控制台 + 品牌素材'],
 [24,'清理低效与重复投放','13',[0,4,7],'找出长期低转化、无数据、重复定位活动，分类处理','输出保留/收缩/否定/暂停待确认名单','最近30天活动与搜索词报表'],
 [25,'用总利润验证广告优化','13',[9,14,20],'比较优化前后 ACOS、TACOS、自然销售、库存与贡献利润','不能只靠 ACOS 降低就宣布成功','业务报告 + 利润表'],
 [26,'规划旺季与库存节奏','14',[0,4,8],'列出促销、价格、广告预算、库存和补货节点的联动','形成旺季前-中-后3阶段计划','活动日历 + 库存报告'],
 [27,'建立每周优化 SOP','15',[0,2,4],'固定周一看利润、周二查搜索词、周三查广告位、周末复盘的节奏','形成固定的报表、动作、负责人和复查时间','SP/SB/SD + 业务报告'],
 [28,'完成全流程实战答辩','15',[5,6,8],'选一个真实 ASIN，整合利润、词库、活动结构、诊断、优化和复盘','交付1份可执行且可回滚的完整推广方案','28天全部产出 + 测验记录']
].map(function(x){return {n:x[0],title:x[1],chapter:x[2],idx:x[3],task:x[4],pass:x[5],report:x[6],week:Math.floor((x[0]-1)/7)}});
var CASES = [
 {id:'c1',title:'24次点击、0订单，立刻否定吗？',ch:'06',tags:'搜索词 / 样本量',
  desc:'某条搜索词近7天点击24次、花费24美元、尚无归因订单。其他搜索词转化尚可。',
  opts:['马上加否定精准，永不再投','核对搜索意图、利润容忍度、归因窗口和历史表现，再选择降价或否定','立即提高竞价抢首页','只看曝光量继续跑'],
  ans:1,why:'24次点击无单是预警，但不是自动否定的统一标准。需要把可承受 CPA、相关性、时间跨度、归因延迟和后续验证放在一起判断。'},
 {id:'c2',title:'CTR 高、CVR 低，优先查哪里？',ch:'07',tags:'漏斗 / 转化',
  desc:'一个词能得到点击，但点击后的购买转化明显低于同类词。',
  opts:['只提高首页加价','首先核查匹配意图、价格、评价、图片、尺寸与详情页','全部换成广泛匹配','只要曝光高就忽略转化率'],
  ans:1,why:'点击意愿不等于购买意愿。先确认流量是否精准，再看页面竞争力与购买障碍，避免只用竞价掩盖转化问题。'},
 {id:'c3',title:'ACOS=50%，TACOS=10%，该停广告吗？',ch:'01',tags:'利润 / 全局视角',
  desc:'广告花费50美元，广告归因销售100美元，整体销售500美元。近期自然销售稳定。',
  opts:['ACOS超过20%，直接关停','TACOS仅10%，全部加预算','核算广告前贡献毛利、全店净贡献利润和自然增量后做分组决策','只计算广告订单，不看总销售'],
  ans:2,why:'ACOS=50%，TACOS=10%都正确，但不能单独回答是否盈利。还需要费用模型、归因、自然单、预算增量效应和库存约束。'},
 {id:'c4',title:'TOS 的 ACOS 高于商品页面',ch:'11',tags:'广告位 / 出价',
  desc:'首页顶部点击贵、流量大但当期 ACOS 高；商品页面 ACOS 更低。',
  opts:['所有活动同时上调 TOS 100%','先按广告位看样本、CPC、CVR、转化价值，再做小规模试验','关闭所有商品页面广告','不区分活动目标'],
  ans:1,why:'广告位表现必须按同一时间段和活动目标比较。投放位置可能存在数量和结构差异，调整后设置复查与回滚条件。'},
 {id:'c5',title:'新品测试仅6次点击没转化',ch:'08',tags:'新品 / 实验',
  desc:'一个新品关键词投放2天，点击6次，没有订单。',
  opts:['认定关键词失败永久否定','结合测试预算和预期 CVR 继续积累合理样本并关注流量质量','立即把竞价翻倍','把所有变体拆成十个活动'],
  ans:1,why:'在有限样本下，零单不能证实词无效。先关注相关性、实验预算、可承受风险、Listing状态和广告归因。'},
 {id:'c6',title:'老品断货后订单恢复缓慢',ch:'13',tags:'老品 / 恢复',
  desc:'一个稳定销售的老品断货数周后补货，广告表现和自然排名显著变弱。',
  opts:['完全复制断货前竞价','核查可售库存、价格、广告展示、搜索词、转化与自然排名，分阶段恢复','一次性开启所有高价广告','只怪广告后台算法'],
  ans:1,why:'断货会打断历史表现，恢复要重新评估关键词排名、转化与预算边界，避免复投旧策略造成过高 CPC。'},
 {id:'c7',title:'精准词转化很好，是否放量？',ch:'09',tags:'放量 / 关键词',
  desc:'核心精准词连续多周有订单，CPA低于目标，预算经常早早耗尽。',
  opts:['结合可售库存与增量表现，分批增加预算并跟踪边际 CPA','马上把竞价增加300%','删除所有探索活动','所有词一同增价'],
  ans:0,why:'放量应看盈利、可复制性、预算约束和边际增量；每次只改少量变量并设复盘时间。'},
 {id:'c8',title:'高转化搜索词迁移到精准',ch:'06',tags:'匹配 / 搜索词',
  desc:'自动活动发现一个高相关且持续出单的搜索词，准备新建手动精准。',
  opts:['转到精准后马上把来源活动全部否定','在手动精准中验证增量，并检查原活动重复与否定的影响','同时开20个完全相同的活动','直接把原自动活动关闭'],
  ans:1,why:'收割与去重不等于无条件否定来源。要看原活动的发现功能、实际搜索词、重叠消耗和净增量表现。'},
 {id:'c9',title:'多变体抢同一关键词',ch:'10',tags:'变体 / 账户治理',
  desc:'同父体多个颜色尺码在同词上竞争，但库存与转化表现不同。',
  opts:['所有子体一律最高竞价','确定主推/辅推分工，按盈利、库存、排名与转化配置预算','删除全部辅助变体','只要都出单便不需要检查'],
  ans:1,why:'同一搜索词的多变体并非一定错误，但应避免预算失控和不清晰的分工，结合父子体总利润决策。'},
 {id:'c10',title:'黑五前促销已审核通过',ch:'14',tags:'旺季 / 促销',
  desc:'参加旺季促销，活动已经审核通过，产品库存和广告还要协调。',
  opts:['不再确认任何活动状态或库存','复核实际优惠价、库存、利润底线和活动前后预算，准备应急回滚','提前把所有广告停掉','只关注折扣展示不看利润'],
  ans:1,why:'活动审核通过不代表后续所有条件永远成立。需复核价格、合规、利润、库存与流量节奏。'},
 {id:'c11',title:'ACOS 与 TACOS 的正确计算',ch:'01',tags:'指标 / 计算',
  desc:'近7天广告花费60美元，广告归因销售120美元，整体销售600美元。',
  opts:['ACOS 10%，TACOS 50%','ACOS 50%，TACOS 10%','ACOS 20%，TACOS 10%','ACOS 50%，TACOS 50%'],
  ans:1,why:'ACOS = 60/120 = 50%；TACOS = 60/600 = 10%。注意必须使用一致的期间与可比的销售口径。'},
 {id:'c12',title:'高点击低转化的词先加价？',ch:'13',tags:'浪费词 / 风险',
  desc:'一个搜索词消耗了明显高于目标 CPA 的预算，转化持续弱，且与产品功能相关性一般。',
  opts:['为抢流量再提升 CPC','核实归因与相关性，按证据选择降竞价、缩量或否定，并设复查日期','只要搜索量大就永远保留','无视利润继续扩大预算'],
  ans:1,why:'降价、否定和暂停各有适用条件。先确认数据覆盖面和真实相关性，否定前特别要防止误伤有价值的变体或长尾词。'}
];
var SOURCES = [
 ['投放方式与否定词','https://advertising.amazon.com/library/guides/targeting-with-sponsored-products'],
 ['搜索词报告官方说明','https://advertising.amazon.com/help/G3HEFZYWZF84NPS9'],
 ['SP 竞价策略官方说明','https://advertising.amazon.com/help/GCU2BUWJH2W3A8Z7'],
 ['广告报表与优化指南','https://advertising.amazon.com/library/guides/measure-improve-campaigns']
];
function esc(v){return String(v===null||v===undefined?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function plan(u){
 if(!u.studyPlan||typeof u.studyPlan!=='object')u.studyPlan={};
 var p=u.studyPlan;
 if(!p.done||typeof p.done!=='object')p.done={};
 if(!p.notes||typeof p.notes!=='object')p.notes={};
 if(!p.caseResults||typeof p.caseResults!=='object')p.caseResults={};
 if(!p.quizWrong||typeof p.quizWrong!=='object')p.quizWrong={};
 if(!p.tab)p.tab='path';
 if(!Number.isInteger(p.week)||p.week<0||p.week>3){var pending=DAYS.find(function(d){return !p.done[d.n]});p.week=pending?pending.week:3;}
 if(!Number.isInteger(p.caseIndex)||p.caseIndex<0||p.caseIndex>=CASES.length)p.caseIndex=0;
 if(!p.pace)p.pace='45';
 if(typeof p.asin!=='string')p.asin='';
 return p;
}
function lessonLinks(d,data){
 var ch=(data.chapters||[]).find(function(x){return x.id===d.chapter});
 var ids=ch&&ch.lesson_ids||[];
 return d.idx.map(function(i){return ids[Math.min(i,ids.length-1)]}).filter(function(id,index,a){return id&&a.indexOf(id)===index}).map(function(id){return (data.lessons||[]).find(function(x){return x.id===id})}).filter(Boolean);
}
function count(p){return DAYS.filter(function(d){return !!p.done[d.n]}).length}
function next(p){return DAYS.find(function(d){return !p.done[d.n]})||DAYS[DAYS.length-1]}
function pct(n,total){return Math.round(100*n/Math.max(1,total))}
function hero(p){
 var c=count(p), n=next(p);
 return '<section class="study-hero"><div><div class="eyebrow">PRACTICE-LED LEARNING · v3</div><h1>28 天，从看懂广告到独立做优化决策</h1>'+
 '<p>不再只看课程页：每天有明确的学习内容、对应课时、真实报表任务和验收标准。先算利润，再找流量、做测试，最后学会判断何时放量、收缩或否定。</p>'+
 '<div class="row wrap" style="margin-top:16px"><span class="study-pill" style="background:#ffffff20;color:#fff">4 周 / 28 天</span><span class="study-pill" style="background:#ffffff20;color:#fff">15 章关联课程</span><span class="study-pill" style="background:#ffffff20;color:#fff">实际运营作业</span></div></div>'+
 '<div class="study-progress"><small>学习计划完成度</small><b>'+c+' <span style="font-size:18px;font-weight:500">/ 28 天</span></b><div class="progress-track"><div class="progress-fill" style="width:'+pct(c,28)+'%"></div></div>'+
 '<small>'+pct(c,28)+'% 已完成 · '+(c===28?'全部完成，可按周复盘':'下一任务：Day '+n.n+' '+esc(n.title))+'</small></div></section>';
}
function pathHtml(p,data){
 var current=next(p), w=p.week, complete=count(p), doneThisWeek=DAYS.filter(function(d){return d.week===w&&p.done[d.n]}).length;
 var out='<div class="study-metrics">'+
  '<div class="study-card study-metric"><span class="study-muted">累计任务</span><b>'+complete+'/28</b></div>'+
  '<div class="study-card study-metric"><span class="study-muted">当前阶段</span><b>Week '+(w+1)+'</b></div>'+
  '<div class="study-card study-metric"><span class="study-muted">本周完成</span><b>'+doneThisWeek+'/7</b></div></div>';
 out+='<div class="study-weeknav">'+WEEKS.map(function(x,i){var n=DAYS.filter(function(d){return d.week===i&&p.done[d.n]}).length;return '<button type="button" data-sp="week" data-week="'+i+'" class="'+(i===w?'active':'')+'"><strong>Week '+(i+1)+' · '+esc(x.color)+'</strong><small>'+esc(x.name)+' · '+n+'/7</small><span class="study-wbar"><i style="width:'+pct(n,7)+'%"></i></span></button>'}).join('')+'</div>';
 out+='<div class="study-grid"><div class="study-card"><div class="study-pad"><div class="study-topline"><div><span class="study-eyebrow">WEEK '+(w+1)+' · LEARNING OBJECTIVES</span><h2 style="margin:8px 0 7px">'+esc(WEEKS[w].name)+'</h2><p class="study-muted" style="margin:0">本周交付：'+esc(WEEKS[w].result)+'</p></div><span class="study-pill">'+doneThisWeek+'/7 已完成</span></div></div>'+
 DAYS.filter(function(d){return d.week===w}).map(function(d){return dayHtml(d,p,data,current.n)}).join('')+'</div>'+
 '<aside class="study-sticky"><div class="study-card study-pad"><div class="study-eyebrow">MY PRACTICE SETTINGS</div><h3 style="margin:8px 0 6px">我的实操项目</h3>'+
 '<p class="study-muted">建议选择1个正在投放的 ASIN 贯穿练习；输入内容不会预先写入公共网页源码，保存遵循原工作台的本地和登录同步逻辑。</p>'+
 '<label class="study-tiny" for="studyAsin">产品 ASIN（可选）</label><input id="studyAsin" data-sp-input="asin" maxlength="40" class="study-asinput" placeholder="输入需要诊断的 ASIN" value="'+esc(p.asin)+'">'+
 '<div class="study-tiny" style="margin-top:13px">每天可投入的时间</div><div class="study-choice">'+['30','45','60'].map(function(x){return '<button type="button" data-sp="pace" data-pace="'+x+'" class="'+(p.pace===x?'selected':'')+'">'+x+' 分钟</button>'}).join('')+'</div><div class="study-muted">'+(p.pace==='30'?'建议：学理论10分钟 · 看报表15分钟 · 写复盘5分钟':p.pace==='60'?'建议：学理论20分钟 · 看报表25分钟 · 做实验与复盘15分钟':'建议：学理论15分钟 · 看报表20分钟 · 写行动复盘10分钟')+'</div>'+
 '<div class="study-step"><i>1</i><div><b>先学</b><div class="study-muted">打开关联课时，记住1个核心判断规则</div></div></div>'+
 '<div class="study-step"><i>2</i><div><b>再练</b><div class="study-muted">下载或读取当天指定报表，动手核对</div></div></div>'+
 '<div class="study-step"><i>3</i><div><b>再判断</b><div class="study-muted">写出结论、证据、潜在风险与回滚条件</div></div></div>'+
 '<div class="study-step"><i>4</i><div><b>最后复盘</b><div class="study-muted">完成验收后标记本日完成，并记录后续复查日期</div></div></div>'+
 '<div class="study-alert" style="margin-top:14px">学习进度、练习笔记和错题采用原工作台的数据保存逻辑；登录后可尝试跨设备同步。在线数据不是实时广告账户数据。</div></div>'+
 '<div class="study-card study-pad" style="margin-top:14px"><span class="study-eyebrow">PRACTICE OUTPUT</span><h3 style="margin:8px 0">一键复制今日复盘模板</h3><p class="study-muted">把当天任务、产品、证据和待验证假设整理到一张运营卡片。</p><button class="btn primary" type="button" data-sp="copy" data-day="'+current.n+'">复制 Day '+current.n+' 模板</button></div></aside></div>';
 return out;
}
function dayHtml(d,p,data,today){
 var ll=lessonLinks(d,data), active=d.n===today, isDone=!!p.done[d.n];
 return '<section id="studyday'+d.n+'" class="study-day '+(isDone?'done ':'')+(active?'today':'')+'"><div class="study-day-num">'+d.n+'<small>DAY</small></div><div>'+
 '<div class="study-topline"><span class="study-tiny">第 '+(d.week+1)+' 周 · 模块 '+esc(d.chapter)+'</span><span class="study-pill '+(isDone?'ok':'')+'">'+(isDone?'✓ 已完成':active?'下一步学习':'待学习')+'</span></div>'+
 '<h3>'+esc(d.title)+'</h3><p><b>今天实操：</b>'+esc(d.task)+'</p>'+
 '<div class="study-day-target"><b>验收标准：</b>'+esc(d.pass)+'</div>'+
 '<div class="study-muted"><b>需要的报表：</b>'+esc(d.report)+'</div>'+
 '<div class="study-related">'+ll.map(function(l){return '<button class="study-link" type="button" data-lesson="'+esc(l.id)+'">↗ '+esc(l.title)+'</button>'}).join('')+'</div>'+
 '<div class="study-row"><button type="button" class="study-action '+(isDone?'completed':'primary')+'" data-sp="toggle" data-day="'+d.n+'">'+(isDone?'✓ 取消完成':'✓ 作业已完成')+'</button>'+
 '<button type="button" class="study-action" data-sp="copy" data-day="'+d.n+'">复制复盘模板</button></div>'+
 '<details><summary>展开本日学习笔记与结果</summary><textarea data-sp-note="'+d.n+'" placeholder="我的观察 / 证据 / 广告调整动作 / 复查日期……">'+esc(p.notes[d.n]||'')+'</textarea><div class="study-tiny">输入后自动保存。不要在笔记中填写敏感账号凭据。</div></details>'+
 '</div></section>';
}
function labHtml(p,data){
 var c=CASES[p.caseIndex], prev=p.caseResults[c.id], solved=Object.keys(p.caseResults).length, correct=CASES.filter(function(x){return p.caseResults[x.id]&&p.caseResults[x.id].choice===x.ans}).length;
 var order=[0,1,2,3].map(function(i){return (i+((p.caseIndex*3+1)%4))%4;});
 var out='<div class="study-metrics">'+
 '<div class="study-card study-metric"><span class="study-muted">练习题库</span><b>'+CASES.length+' 道</b></div>'+
 '<div class="study-card study-metric"><span class="study-muted">已作答</span><b>'+solved+' 道</b></div>'+
 '<div class="study-card study-metric"><span class="study-muted">当前正确率</span><b>'+(solved?pct(correct,solved):0)+'%</b></div></div>';
 out+='<div class="study-grid"><div>'+
 '<section class="study-card study-scenario"><div class="study-topline"><span class="study-eyebrow">SCENARIO '+(p.caseIndex+1)+' / '+CASES.length+'</span><span class="study-pill">'+esc(c.tags)+'</span></div>'+
 '<h3>'+esc(c.title)+'</h3><p style="line-height:1.9;color:#596d87">'+esc(c.desc)+'</p><p class="study-muted"><b>你会优先采取哪项动作？</b> 选择之后显示理由，不会自动修改广告账户。</p>'+
 '<div class="study-scenario-options">'+order.map(function(i,j){var a=c.opts[i],cls=prev?(i===c.ans?' correct':i===prev.choice?' incorrect':''):'';return '<button type="button" data-sp="answer" data-answer="'+i+'" class="study-option'+cls+(prev&&prev.choice===i?' selected':'')+'" aria-pressed="'+(!!prev&&prev.choice===i)+'"><b>'+String.fromCharCode(65+j)+'.</b> '+esc(a)+'</button>'}).join('')+'</div>'+
 (prev?'<div class="study-explanation"><b>'+(prev.choice===c.ans?'✓ 判断正确':'需要再想一想 · 正确选项 '+String.fromCharCode(65+order.indexOf(c.ans)))+'</b><div style="margin-top:7px">'+esc(c.why)+'</div></div>':'')+
 '<div class="study-row" style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap"><button class="btn" data-sp="prevcase">上一题</button><button class="btn primary" data-sp="nextcase">下一题 →</button><button class="btn" data-sp="retry">重做本题</button></div></section>'+
 '<div class="study-card study-pad"><div class="study-eyebrow">KEY PRINCIPLE</div><h3 style="margin:8px 0">一个合格的优化动作必须回答</h3>'+
 '<div class="study-step"><i>1</i>数据来自哪个报表？是否同一期间和口径？</div>'+
 '<div class="study-step"><i>2</i>是曝光、点击、转化、利润，还是归因问题？</div>'+
 '<div class="study-step"><i>3</i>样本和趋势足够支持结论吗？</div>'+
 '<div class="study-step"><i>4</i>动哪个参数？什么时间复查，何时回滚？</div></div></div>'+
 '<aside class="study-sticky"><div class="study-card study-pad"><div class="study-eyebrow">CHOOSE A SCENARIO</div><h3 style="margin:9px 0">按主题练判断</h3>'+
 CASES.map(function(x,i){var r=p.caseResults[x.id];return '<button type="button" data-sp="case" data-case="'+i+'" style="display:flex;width:100%;gap:9px;text-align:left;align-items:flex-start;border:0;border-bottom:1px solid #eef1f6;background:'+(p.caseIndex===i?'#f1f6ff':'transparent')+';padding:10px 7px;cursor:pointer;border-radius:5px;color:#4b607a;font-size:12px"><span>'+(r?(r.choice===x.ans?'✓':'!'):'○')+'</span><span>'+esc(x.title)+'</span></button>'}).join('')+
 '</div><div class="study-card study-pad" style="margin-top:13px"><span class="study-eyebrow">RELATED LESSON</span><p class="study-muted">本题关联第 '+esc(c.ch)+' 章，可打开原课程学习完整知识背景。</p>'+
 (function(){var d=DAYS.find(function(x){return x.chapter===c.ch}),ll=d?lessonLinks(d,data):[];return ll[0]?'<button type="button" class="study-link" data-lesson="'+esc(ll[0].id)+'">打开相关知识点 →</button>':''})()+
 '</div></aside></div>';
 return out;
}
function reviewHtml(p,data){
 var wrong=CASES.filter(function(c){var r=p.caseResults[c.id];return r&&r.choice!==c.ans});
 var qs=Object.keys(p.quizWrong).map(function(k){return p.quizWrong[k]}).slice(-30).reverse();
 var out='<div class="study-metrics"><div class="study-card study-metric"><span class="study-muted">情景练习错题</span><b>'+wrong.length+' 道</b></div>'+
 '<div class="study-card study-metric"><span class="study-muted">原课程测验待巩固</span><b>'+qs.length+' 道</b></div>'+
 '<div class="study-card study-metric"><span class="study-muted">已完成学习日</span><b>'+count(p)+'/28</b></div></div>';
 out+='<div class="study-grid"><div class="study-card study-pad"><div class="study-eyebrow">REVIEW · WRONG ANSWERS</div><h2 style="margin:9px 0 5px">我的错题与复习清单</h2><p class="study-muted">从广告诊断练习和原课程测验自动收集。正确重做情景题后会自动从错题列表移除。</p><div class="study-review-list">';
 if(!wrong.length&&!qs.length)out+='<div class="study-alert">目前没有待复习的错题。完成“广告情景演练”或“训练测验”后，这里会自动汇总需要巩固的判断。</div>';
 wrong.forEach(function(c){var i=CASES.indexOf(c);out+='<div class="study-review-item"><div class="study-topline"><b>'+esc(c.title)+'</b><span class="study-pill">情景题</span></div><p>'+esc(c.why)+'</p><button class="study-link" data-sp="revisit" data-case="'+i+'">重新挑战 →</button></div>'});
 qs.forEach(function(q){var ch=(data.chapters||[]).find(function(x){return x.id===q.ch}),id=ch&&ch.lesson_ids[0];out+='<div class="study-review-item"><div class="study-topline"><b>'+esc(q.q)+'</b><span class="study-pill">课程测验</span></div><p><b>正确答案：</b>'+esc(q.correct)+'<br>'+esc(q.why)+'</p>'+(id?'<button type="button" class="study-link" data-lesson="'+esc(id)+'">返回对应章节 →</button>':'')+'</div>'});
 out+='</div></div><aside class="study-sticky"><div class="study-card study-pad"><span class="study-eyebrow">WEEKLY REVIEW</span><h3 style="margin:8px 0">每周复盘四问</h3>'+
 '<div class="study-step"><i>1</i>本周利润和 TACOS 是否同时改善？</div>'+
 '<div class="study-step"><i>2</i>获得了哪些高相关、高转化搜索词？</div>'+
 '<div class="study-step"><i>3</i>哪些改动有对照数据，哪些只是推测？</div>'+
 '<div class="study-step"><i>4</i>下周保留、放量、收缩、暂停什么？</div>'+
 '<p class="study-muted" style="margin-top:13px">学过不等于掌握。建议每7天回看一次错误决策、复查真实广告数据。</p>'+
 '<button class="btn primary" type="button" data-sp="export">导出28天学习复盘</button></div></aside></div>';
 return out;
}
function resources(){
 return '<section class="study-card study-pad study-resource" style="margin-top:16px"><div class="study-topline"><div><span class="study-eyebrow">OFFICIAL REFERENCES</span><h3 style="margin:7px 0">亚马逊广告官方资料</h3></div><span class="study-tiny">以所在站点、账户权限和最新控制台为准</span></div>'+
 '<div class="study-related">'+SOURCES.map(function(x){return '<a class="study-link" href="'+x[1]+'" target="_blank" rel="noopener noreferrer">'+esc(x[0])+' ↗</a>'}).join('')+'</div>'+
 '<p class="study-muted" style="margin:8px 0 0">课堂示例、历史投放表现、阈值与算法推测不代表平台承诺。搜索词报告可能仅包含有点击的词；投放策略与归因窗口应以官方最新规则为准。</p></section>';
}
function render(options){
 ctx=options;
 var p=plan(ctx.user);
 var tabs=[['path','28天学习路径'],['lab','广告情景演练'],['review','错题与每周复盘']];
 return hero(p)+'<div class="study-tabs">'+tabs.map(function(x){return '<button type="button" data-sp="tab" data-tab="'+x[0]+'" class="'+(p.tab===x[0]?'active':'')+'">'+esc(x[1])+'</button>'}).join('')+'</div>'+
 (p.tab==='lab'?labHtml(p,ctx.data):p.tab==='review'?reviewHtml(p,ctx.data):pathHtml(p,ctx.data))+resources();
}
function courseBanner(user){
 var p=plan(user),n=next(p),c=count(p);
 return '<div class="study-inline"><div><strong>你的 28 天系统学习计划 · '+c+'/28 天已完成</strong><span>建议今天：Day '+n.n+'「'+esc(n.title)+'」。每个知识点都配有实操任务、报表和验收标准。</span></div><button type="button" data-route="studyplan">打开学习计划 →</button></div>';
}
function lessonBox(l,user){
 var p=plan(user);
 var ds=DAYS.filter(function(d){return d.chapter===l.chapter});
 if(!ds.length)return '';
 var n=ds.find(function(d){return !p.done[d.n]})||ds[0];
 return '<div class="study-inline" style="margin:18px 0 14px"><div><strong>这节课学完之后，如何用到广告账户？</strong>'+
 '<span>关联实操 Day '+n.n+'：'+esc(n.task)+'<br>验收：'+esc(n.pass)+'</span></div><button type="button" data-route="studyplan">查看学习任务 →</button></div>';
}
function captureQuiz(user,qs,answers){
 var p=plan(user);
 (qs||[]).forEach(function(q,i){
  var key=q[0]+'|'+q[1];
  if(answers[i]===q[3])delete p.quizWrong[key];
  else p.quizWrong[key]={ch:q[0],q:q[1],correct:q[2][q[3]],why:q[4],at:new Date().toISOString()};
 });
}
function textForDay(d,p){
 var notes=p.notes[d.n]||'';
 return '亚马逊广告28天学习卡\nDay '+d.n+'｜'+d.title+
 '\n实操 ASIN：'+(p.asin||'待填写')+
 '\n所需报表：'+d.report+
 '\n学习重点：'+d.task+
 '\n验收标准：'+d.pass+
 '\n我的证据 / 数据：'+(notes||'待填写')+
 '\n我的判断与拟采取动作：\n动作风险与回滚条件：\n执行日期：\n下次复查日期：';
}
function copyText(s){
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(function(){notice('已复制学习复盘模板')}).catch(function(){window.prompt('复制学习复盘模板：',s)});
 else window.prompt('复制学习复盘模板：',s);
}
function notice(s){
 var a=document.createElement('div');a.className='toast';a.textContent=s;document.body.appendChild(a);setTimeout(function(){a.remove()},2500);
}
function dl(filename,content,mime){
 var blob=new Blob([content],{type:mime||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);
}
function exportPlan(p){
 var rows=['Day,周,课题,完成,ASIN,实操任务,验收标准,需要报表,学习笔记'];
 DAYS.forEach(function(d){
  function csv(x){return '"'+String(x||'').replace(/"/g,'""')+'"'}
  rows.push([d.n,d.week+1,d.title,p.done[d.n]?'完成':'未完成',p.asin,d.task,d.pass,d.report,p.notes[d.n]].map(csv).join(','));
 });
 dl('AmazonAds_28天学习复盘.csv','\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8');
 notice('已导出28天学习复盘 CSV');
}
function change(fn){
 if(!ctx)return;var p=plan(ctx.user);fn(p);ctx.save();ctx.refresh();
}
document.addEventListener('click',function(e){
 var z=e.target.closest('[data-sp]');if(!z||!ctx)return;
 var action=z.getAttribute('data-sp');
 if(action==='tab')change(function(p){p.tab=z.dataset.tab});
 else if(action==='week')change(function(p){p.week=Number(z.dataset.week)});
 else if(action==='pace')change(function(p){p.pace=z.dataset.pace});
 else if(action==='toggle')change(function(p){var k=z.dataset.day;p.done[k]=!p.done[k];});
 else if(action==='copy'){var d=DAYS.find(function(x){return x.n===Number(z.dataset.day)});if(d)copyText(textForDay(d,plan(ctx.user)))}
 else if(action==='case'||action==='revisit')change(function(p){p.caseIndex=Number(z.dataset.case);p.tab='lab'});
 else if(action==='prevcase')change(function(p){p.caseIndex=(p.caseIndex+CASES.length-1)%CASES.length});
 else if(action==='nextcase')change(function(p){p.caseIndex=(p.caseIndex+1)%CASES.length});
 else if(action==='answer')change(function(p){var c=CASES[p.caseIndex];p.caseResults[c.id]={choice:Number(z.dataset.answer),at:new Date().toISOString()}});
 else if(action==='retry')change(function(p){var c=CASES[p.caseIndex];delete p.caseResults[c.id]});
 else if(action==='export')exportPlan(plan(ctx.user));
});
document.addEventListener('input',function(e){
 if(!ctx)return;
 var t=e.target,p=plan(ctx.user);
 if(t.hasAttribute('data-sp-note')){p.notes[t.getAttribute('data-sp-note')]=t.value;ctx.save()}
 if(t.getAttribute('data-sp-input')==='asin'){p.asin=t.value.trim().toUpperCase();ctx.save()}
});
window.AdsStudyPlan={render:render,lessonBox:lessonBox,courseBanner:courseBanner,captureQuiz:captureQuiz};
})();