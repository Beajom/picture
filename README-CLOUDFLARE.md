# Amazon Supply Workbench · Cloudflare Edition

Production architecture:
- Cloudflare Pages: frontend
- Cloudflare Pages Functions: API
- Cloudflare D1: products, suppliers, purchases, production, inventory, outbound, ledger
- Cloudflare R2: product / parent / material images

Required bindings:
- `DB` -> D1 database
- `IMAGES` -> R2 bucket

Database schema: `schema.sql`

Frontend: `index.html`

API: `functions/api/[[path]].js`

Business invariants implemented:
1. Inventory is changed only through adjustment, production inbound, outbound, and outbound rollback.
2. Outbound cannot create negative finished-goods inventory.
3. Deleting an outbound order restores inventory and writes reversal ledger rows.
4. A purchase order that has already completed production inbound cannot be deleted.
5. Deleting a non-inbound purchase order rolls back its material allocations.
6. Parent/model and color/size inventory totals are calculated from child SKU inventory.
7. Parent image is shared by parent ASIN; color image is shared by parent ASIN + color.
