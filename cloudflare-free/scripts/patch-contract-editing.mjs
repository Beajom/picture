import fs from "node:fs/promises";

const file = new URL("../public/index.html", import.meta.url);
let html = await fs.readFile(file, "utf8");

const start = html.indexOf("function previewPurchaseContract(id){");
const end = html.indexOf("async function delPO(id){", start);
if (start < 0 || end < 0 || end <= start) {
  throw new Error("Could not locate previewPurchaseContract block");
}

let block = html.slice(start, end);
if (block.includes('id="contractPaper"') || block.includes('id=\\"contractPaper\\"')) {
  console.log("Contract editing enhancement already present");
  process.exit(0);
}

block = block.replace(
  "合同正文可直接点击修改；确认后点击右侧按钮打印或另存为 PDF",
  "合同正文、金额、公司信息、条款和签字栏都可直接点击修改；修改会保存在当前浏览器，打印/PDF使用修改后的内容"
);

block = block.replace(/\.editable\{outline:none\}/, ".editable{outline:none;cursor:text}.editable:hover{box-shadow:inset 0 0 0 2px #dbeafe}");

block = block.replace(
  /<body><div class=\\?"toolbar\\?">/,
  '<body onload="var d=localStorage.getItem(`asw-contract-draft-${document.title}`);if(d)document.getElementById(`contractPaper`).innerHTML=d"><div class="toolbar">'
);

block = block.replace(
  /<div class=\\?"paper editable\\?" contenteditable=\\?"true\\?">/,
  '<div class="paper editable" id="contractPaper" contenteditable="true" spellcheck="false" oninput="localStorage.setItem(`asw-contract-draft-${document.title}`,this.innerHTML)">'
);

block = block.replace(
  /<button onclick=\\?"window\.print\(\)\\?">打印 \/ 保存PDF<\/button>/,
  '<button onclick="localStorage.setItem(`asw-contract-draft-${document.title}`,document.getElementById(`contractPaper`).innerHTML);this.textContent=`已保存修改`;setTimeout(()=>this.textContent=`保存修改`,1200)">保存修改</button><button onclick="window.print()">打印 / 保存PDF</button>'
);

if (!block.includes('id="contractPaper"')) {
  throw new Error("Failed to add editable contract paper");
}
if (!block.includes("保存修改")) {
  throw new Error("Failed to add contract save button");
}

html = html.slice(0, start) + block + html.slice(end);
await fs.writeFile(file, html, "utf8");
console.log("Editable purchase contract UI patched into index.html");
