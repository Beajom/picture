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

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const headers = new Headers(response.headers);
      headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("pragma", "no-cache");
      headers.set("expires", "0");
      headers.set("x-asw-ui-build", "20260922-low-stock-images-v2");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
    return response;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledInventoryReports(env, event.scheduledTime));
  }
};
