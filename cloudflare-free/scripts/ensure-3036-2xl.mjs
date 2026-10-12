import fs from "node:fs/promises";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
if (!token) throw new Error("Missing CLOUDFLARE_API_TOKEN");

const accountId = (await fs.readFile(new URL("../.cloudflare-account-id", import.meta.url), "utf8")).trim();
const toml = await fs.readFile(new URL("../wrangler.deploy.toml", import.meta.url), "utf8");
const dbMatch = toml.match(/database_id\s*=\s*"([^"]+)"/);
if (!dbMatch) throw new Error("Could not resolve D1 database_id from wrangler.deploy.toml");
const databaseId = dbMatch[1];

async function query(sql, params = []) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error("D1 query failed: " + JSON.stringify(body));
  }
  return body.result?.[0]?.results || [];
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

for (const color of colors) {
  const existing = await query(
    `SELECT id,sku,child_asin FROM products
     WHERE parent_asin=? AND color=? AND size='2XL'
     LIMIT 1`,
    [parentAsin, color]
  );
  if (existing.length) {
    console.log(`3036 ${color} 2XL already exists: ${existing[0].sku}`);
    continue;
  }

  let source = await query(
    `SELECT * FROM products
     WHERE parent_asin=? AND color=? AND size='XL'
     LIMIT 1`,
    [parentAsin, color]
  );
  if (!source.length) {
    source = await query(
      `SELECT * FROM products
       WHERE internal_code LIKE '3036%' AND color=? AND size='XL'
       LIMIT 1`,
      [color]
    );
  }
  if (!source.length) {
    throw new Error(`Could not find 3036 ${color} XL source row to clone`);
  }

  const src = source[0];
  let sku = derive2XLSku(src.sku);
  const skuConflict = await query("SELECT id FROM products WHERE sku=? LIMIT 1", [sku]);
  if (skuConflict.length) {
    sku = String(src.sku || "3036-" + color) + "-2XL";
  }

  const newId = crypto.randomUUID();
  const inventoryId = crypto.randomUUID();
  const internalCode = deriveInternalCode(src.internal_code);

  await query(
    `INSERT INTO products(
      id,parent_asin,child_asin,sku,internal_code,product_name,color,size,
      untaxed_price,tax_rate,taxed_price,image_url,parent_image_url,safety_stock
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      newId,
      src.parent_asin,
      "",
      sku,
      internalCode,
      src.product_name,
      src.color,
      "2XL",
      Number(src.untaxed_price || 0),
      Number(src.tax_rate || 0),
      Number(src.taxed_price || 0),
      src.image_url || null,
      src.parent_image_url || null,
      Number(src.safety_stock || 0)
    ]
  );

  await query(
    `INSERT INTO inventory(id,product_id,available_qty,safety_stock)
     VALUES(?,?,0,?)`,
    [inventoryId, newId, Number(src.safety_stock || 0)]
  );

  console.log(JSON.stringify({
    created: true,
    model: "3036",
    color,
    size: "2XL",
    sku,
    child_asin: "",
    available_qty: 0,
    copied_from_sku: src.sku
  }));
}

const check = await query(
  `SELECT color,size,sku,child_asin
   FROM products
   WHERE parent_asin=? AND color IN ('肤色','黑色')
   ORDER BY color,
   CASE size WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN '2XL' THEN 5 ELSE 99 END`,
  [parentAsin]
);
console.log("3036 target variants:", JSON.stringify(check));
