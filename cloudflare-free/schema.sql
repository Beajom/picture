PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS products(
  id TEXT PRIMARY KEY,
  parent_asin TEXT NOT NULL,
  child_asin TEXT,
  sku TEXT NOT NULL UNIQUE,
  internal_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  untaxed_price REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  taxed_price REAL NOT NULL DEFAULT 0,
  image_url TEXT,
  parent_image_url TEXT,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_parent ON products(parent_asin);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(internal_code);
CREATE INDEX IF NOT EXISTS idx_products_color_size ON products(parent_asin,color,size);

CREATE TABLE IF NOT EXISTS inventory(
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  available_qty INTEGER NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers(
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  website TEXT,
  company_address TEXT,
  contact_name TEXT,
  phone TEXT,
  payment_method TEXT,
  bank_type TEXT,
  account_name TEXT,
  bank_name TEXT,
  bank_account TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materials(
  id TEXT PRIMARY KEY,
  material_code TEXT UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '个',
  applicable_model TEXT,
  purchase_price REAL NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  target_stock INTEGER NOT NULL DEFAULT 0,
  finished_units_per_material REAL NOT NULL DEFAULT 2,
  image_url TEXT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders(
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date TEXT NOT NULL,
  expected_date TEXT,
  payment_terms TEXT,
  shipping_fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '已下单',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchase_order_items(
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_orders(
  id TEXT PRIMARY KEY,
  production_no TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  planned_finish_date TEXT,
  status TEXT NOT NULL DEFAULT '待生产',
  production_completed_at TEXT,
  inbound_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS production_order_items(
  id TEXT PRIMARY KEY,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbound_orders(
  id TEXT PRIMARY KEY,
  outbound_no TEXT NOT NULL UNIQUE,
  outbound_date TEXT NOT NULL,
  destination TEXT,
  carrier TEXT,
  tracking_no TEXT,
  total_qty INTEGER NOT NULL DEFAULT 0,
  units_per_carton INTEGER NOT NULL DEFAULT 0,
  box_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '已出库',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS outbound_order_items(
  id TEXT PRIMARY KEY,
  outbound_order_id TEXT NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_ledger(
  id TEXT PRIMARY KEY,
  business_type TEXT NOT NULL,
  reference_no TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id,created_at);

CREATE TABLE IF NOT EXISTS material_movements(
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL,
  qty_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_no TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS image_refs(
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  parent_asin TEXT,
  color TEXT,
  product_id TEXT,
  material_id TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
