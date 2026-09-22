import fs from "node:fs/promises";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "amazon-supply-workbench-free";

if (!token) {
  console.error("Missing CLOUDFLARE_API_TOKEN.");
  process.exit(2);
}

async function cf(path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

if (!accountId) {
  const { res, body } = await cf("/accounts?per_page=50");
  if (!res.ok || !body.success || !Array.isArray(body.result)) {
    console.error("Could not discover Cloudflare account. Token should use the Edit Cloudflare Workers template.");
    console.error(JSON.stringify(body, null, 2));
    process.exit(3);
  }
  for (const acct of body.result) {
    const probe = await cf(`/accounts/${acct.id}/workers/scripts/${workerName}/settings`);
    if (probe.res.ok && probe.body?.success) {
      accountId = acct.id;
      break;
    }
  }
  if (!accountId) {
    console.error(`Could not find existing Worker "${workerName}" in accounts accessible to this token.`);
    process.exit(4);
  }
}

const { res, body: raw } = await cf(
  `/accounts/${accountId}/workers/scripts/${workerName}/settings`
);
if (!res.ok || !raw.success) {
  console.error(JSON.stringify(raw, null, 2));
  process.exit(5);
}

const bindings = raw.result?.bindings || [];
const d1 = bindings.find((b) => b.name === "DB" && ["d1", "d1_database"].includes(b.type));
const kv = bindings.find((b) => b.name === "IMAGES" && b.type === "kv_namespace");
const d1id = d1?.id || d1?.database_id;
const kvid = kv?.namespace_id || kv?.id;

if (!d1id || !kvid) {
  console.error("Refusing to deploy: existing DB / IMAGES bindings could not be resolved.");
  console.error(JSON.stringify(bindings, null, 2));
  process.exit(6);
}

// Keep product thumbnails fully visible on the deployed site.
// The source page historically used object-fit: cover, which cropped tall product photos.
const indexPath = "public/index.html";
let html = await fs.readFile(indexPath, "utf8");
const thumbCss = ".thumb{width:68px;height:68px;object-fit:contain;object-position:center center;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:3px;display:block;flex-shrink:0}";
if (/\.thumb\{[^}]*\}/.test(html)) {
  html = html.replace(/\.thumb\{[^}]*\}/, thumbCss);
  await fs.writeFile(indexPath, html, "utf8");
  console.log("Product thumbnail display fixed: full image, centered, no cropping.");
} else {
  console.warn("Thumbnail CSS selector not found; deployment continues without the image-fit patch.");
}

const toml = `name = "amazon-supply-workbench-free"
main = "src/worker.js"
compatibility_date = "2026-09-20"
keep_vars = true

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"

[triggers]
crons = ["*/15 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "DB"
database_id = "${d1id}"

[[kv_namespaces]]
binding = "IMAGES"
id = "${kvid}"
`;

await fs.writeFile("wrangler.deploy.toml", toml, "utf8");
await fs.writeFile(".cloudflare-account-id", accountId, "utf8");
console.log("Safe deploy config created from the existing Worker bindings. Existing D1 and KV IDs will be reused.");
