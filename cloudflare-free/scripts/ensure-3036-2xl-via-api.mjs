const base = "https://amazon-supply-workbench-free.chongyu0502.workers.dev";

async function getBootstrap() {
  const r = await fetch(base + "/api/bootstrap?ts=" + Date.now(), {
    headers: { "Cache-Control": "no-cache" }
  });
  if (!r.ok) throw new Error("bootstrap failed: " + r.status + " " + await r.text());
  return await r.json();
}

async function createProduct(payload) {
  const r = await fetch(base + "/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  if (!r.ok) throw new Error("create product failed: " + r.status + " " + text);
  return JSON.parse(text);
}

function derive2XLSku(sourceSku) {
  const s = String(sourceSku || "").trim();
  if (!s) return "";
  if (/2XL$/i.test(s)) return s;
  if (/XL$/i.test(s)) return s.replace(/XL$/i, "2XL");
  return s + "-2XL";
}

function deriveInternalCode(sourceCode) {
  const s = String(sourceCode || "").trim();
  if (!s) return "3036";
  if (/2XL$/i.test(s)) return s;
  if (/XL$/i.test(s)) return s.replace(/XL$/i, "2XL");
  return s;
}

const parentAsin = "B0927KVX9K";
const colors = ["肤色", "黑色"];

let data = await getBootstrap();
const products = Array.isArray(data.products) ? data.products : [];

for (const color of colors) {
  const existing = products.find(p => p.parent_asin === parentAsin && p.color === color && String(p.size).toUpperCase() === "2XL");
  if (existing) {
    console.log(JSON.stringify({ skipped:true, reason:"already_exists", color, sku:existing.sku, child_asin:existing.child_asin || "" }));
    continue;
  }

  const source = products.find(p => p.parent_asin === parentAsin && p.color === color && String(p.size).toUpperCase() === "XL")
    || products.find(p => String(p.internal_code || "").startsWith("3036") && p.color === color && String(p.size).toUpperCase() === "XL");

  if (!source) throw new Error("Could not find 3036 " + color + " XL source row");

  let sku = derive2XLSku(source.sku);
  if (products.some(p => p.sku === sku)) sku = String(source.sku || ("3036-" + color)) + "-2XL";

  const payload = {
    parent_asin: source.parent_asin,
    child_asin: "",
    sku,
    internal_code: deriveInternalCode(source.internal_code),
    product_name: source.product_name,
    color: source.color,
    size: "2XL",
    untaxed_price: Number(source.untaxed_price || 0),
    tax_rate: Number(source.tax_rate || 0),
    taxed_price: Number(source.taxed_price || 0),
    safety_stock: Number(source.safety_stock || 0)
  };

  const created = await createProduct(payload);
  console.log(JSON.stringify({
    created:true,
    id:created.id,
    model:"3036",
    color,
    size:"2XL",
    sku,
    child_asin:"",
    available_qty:0,
    copied_from_sku:source.sku
  }));
}

data = await getBootstrap();
const verify = (data.products || [])
  .filter(p => p.parent_asin === parentAsin && ["肤色","黑色"].includes(p.color) && String(p.size).toUpperCase() === "2XL")
  .map(p => ({color:p.color,size:p.size,sku:p.sku,child_asin:p.child_asin || ""}));
if (verify.length !== 2) throw new Error("Verification failed: expected 2 target 2XL rows, got " + JSON.stringify(verify));
console.log("VERIFY", JSON.stringify(verify));
