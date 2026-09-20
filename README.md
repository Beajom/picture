# Amazon Supply Workbench — Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Beajom/picture)

This production configuration runs as a Cloudflare Worker with:
- Static Assets: ERP frontend
- D1 binding `DB`: business data
- Workers KV binding `IMAGES`: product/material images
- Worker API: `/api/*`

The deploy script initializes the D1 schema and imports the current ERP seed data before deploying the Worker.

Health check: `/health`
