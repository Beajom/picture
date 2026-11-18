import fs from "node:fs/promises";
const base=new URL("../public/",import.meta.url);
const htmlFile=new URL("index.html",base);
let html=await fs.readFile(htmlFile,"utf8");
const css=await fs.readFile(new URL("material-purchase-ui.css",base),"utf8");
const js=await fs.readFile(new URL("material-purchase-ui.js",base),"utf8");
html=html.replaceAll('<link rel="stylesheet" href="/material-purchase-ui.css">','');
html=html.replaceAll('<script src="/material-purchase-ui.js" defer></script>','');
const cssStart='/* MATERIAL_PURCHASE_CSS_BUNDLE_BEGIN */';
const cssEnd='/* MATERIAL_PURCHASE_CSS_BUNDLE_END */';
const jsStart='/* MATERIAL_PURCHASE_JS_BUNDLE_BEGIN */';
const jsEnd='/* MATERIAL_PURCHASE_JS_BUNDLE_END */';
function replaceOrInsert(start,end,content,anchor){
  const i=html.indexOf(start),j=html.indexOf(end);
  if(i>=0&&j>i){html=html.slice(0,i)+start+'\n'+content+'\n'+end+html.slice(j+end.length);return;}
  if(!html.includes(anchor))throw new Error("Missing bundler anchor "+anchor);
  html=html.replace(anchor,start+'\n'+content+'\n'+end+'\n'+anchor)
}
replaceOrInsert(cssStart,cssEnd,css,'</style>');
replaceOrInsert(jsStart,jsEnd,js,'load().then(render).catch');
await fs.writeFile(htmlFile,html);
console.log('Bundled material procurement styles and interactions inside index.html; bytes='+html.length);
