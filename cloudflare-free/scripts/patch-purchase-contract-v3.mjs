import fs from "node:fs/promises";

const file = new URL("../public/index.html", import.meta.url);
const legacyFile = new URL("./patch-purchase-contract.mjs", import.meta.url);
let html = await fs.readFile(file, "utf8");
let changed = false;

function replaceWithin(startMarker,endMarker,fn){
  const start=html.indexOf(startMarker);
  const end=html.indexOf(endMarker,start+startMarker.length);
  if(start<0||end<0||end<=start)throw new Error(`Could not locate block: ${startMarker}`);
  const before=html.slice(0,start),block=html.slice(start,end),after=html.slice(end);
  const next=fn(block);
  if(next!==block){html=before+next+after;changed=true}
}

replaceWithin("purchase(){return","materials(){return",block=>{
  if(block.includes("previewPurchaseContract"))return block;
  const marker='>PDF预览</button><button class="link red"';
  const at=block.indexOf(marker);
  if(at<0)throw new Error("Could not locate purchase-list PDF action");
  const contractButton=`>PDF预览</button><button class="btn" style="padding:5px 10px;margin-right:6px;color:#7c3aed;border-color:#ddd6fe;background:#f5f3ff" onclick="previewPurchaseContract(\\''+o.id+'\\')">采购合同</button><button class="link red"`;
  return block.slice(0,at)+contractButton+block.slice(at+marker.length)
});

replaceWithin("async function viewPO(id){","function previewPOPDF(id){",block=>{
  if(block.includes("previewPurchaseContract"))return block;
  const marker='>PDF预览</button></div>';
  const at=block.lastIndexOf(marker);
  if(at<0){console.warn("Purchase detail PDF action not found; continuing with list action only");return block}
  const replacement=`>PDF预览</button><button class="btn" style="color:#7c3aed;border-color:#ddd6fe;background:#f5f3ff" onclick="previewPurchaseContract(\\''+o.id+'\\')">采购合同</button></div>`;
  return block.slice(0,at)+replacement+block.slice(at+marker.length)
});

if(!html.includes("function previewPurchaseContract(id){")){
  const src=await fs.readFile(legacyFile,"utf8");
  const match=src.match(/const code = String\.raw`([\s\S]*?)`;\n\n  html = html\.slice/);
  if(!match)throw new Error("Could not extract purchase-contract generator body");
  const marker="async function delPO(id){";
  const pos=html.indexOf(marker);
  if(pos<0)throw new Error("Could not locate delPO marker");
  html=html.slice(0,pos)+match[1]+html.slice(pos);
  changed=true;
}

if(changed){
  await fs.writeFile(file,html,"utf8");
  console.log("Purchase contract generator patched into index.html (v3)")
}else{
  console.log("Purchase contract generator already present; no changes needed")
}
