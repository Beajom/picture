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
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledInventoryReports(env, event.scheduledTime));
  }
};
