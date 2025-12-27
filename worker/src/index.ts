import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { botRouter } from "./features/bot/router";
import { notifyRouter } from "./features/notify/router";
import type { Env } from "./lib/types";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/", (c) => {
  return c.text("OpenCode Telegram Bot is running");
});

// Mount feature routers
app.route("/", botRouter);
app.route("/", notifyRouter);

// 404 fallback
app.notFound((c) => {
  return c.text("Not found", 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  return c.json({ success: false, error: "Internal error" }, 500);
});

export default app;
