import { onRequest as apiHandler, runScheduledInventoryReports } from "../functions/api/[[path]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "amazon-supply-workbench" }), {
        headers: { "content-type": "application/json;charset=utf-8", "cache-control": "no-store" }
      });
    }
    if (url.pathname.startsWith("/api")) {
      return apiHandler({ request, env, ctx, waitUntil: ctx.waitUntil.bind(ctx), passThroughOnException() {} });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";
    if (assetResponse.ok && contentType.includes("text/html")) {
      let html = await assetResponse.text();
      if (!html.includes("/low-stock-images.js")) {
        html = html.replace("</body>", '<script src="/low-stock-images.js?v=20260922-1303"></script></body>');
      }
      const headers = new Headers(assetResponse.headers);
      headers.set("cache-control", "no-store");
      headers.delete("content-length");
      return new Response(html, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers
      });
    }
    return assetResponse;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledInventoryReports(env, event.scheduledTime));
  }
};
