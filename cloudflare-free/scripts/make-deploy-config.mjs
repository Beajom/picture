import fs from "node:fs/promises";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "amazon-supply-workbench-free";

if (!token || !accountId) {
  console.error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID.");
  process.exit(2);
}

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/settings`,
  { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
);
const raw = await res.json();
if (!res.ok || !raw.success) {
  console.error(JSON.stringify(raw, null, 2));
  process.exit(3);
}

const bindings = raw.result?.bindings || [];
const d1 = bindings.find((b) => b.name === "DB" && ["d1", "d1_database"].includes(b.type));
const kv = bindings.find((b) => b.name === "IMAGES" && b.type === "kv_namespace");
const d1id = d1?.id || d1?.database_id;
const kvid = kv?.namespace_id || kv?.id;

if (!d1id || !kvid) {
  console.error("Refusing to deploy: existing DB / IMAGES bindings could not be resolved.");
  console.error(JSON.stringify(bindings, null, 2));
  process.exit(4);
}

const toml = `name = "amazon-supply-workbench-free"
main = "src/worker.js"
compatibility_date = "2026-09-20"
keep_vars = true

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "DB"
database_id = "${d1id}"

[[kv_namespaces]]
binding = "IMAGES"
id = "${kvid}"
`;

await fs.writeFile("wrangler.deploy.toml", toml, "utf8");
console.log("Safe deploy config created from the Worker’s current DB/KV bindings.");
