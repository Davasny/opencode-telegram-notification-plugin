import { webhookCallback } from "grammy";
import { Hono } from "hono";
import type { Env } from "../../lib/types";
import { createBot } from "./bot";

const bot = new Hono<{ Bindings: Env }>();

bot.post("/webhook", async (c) => {
  const grammyBot = createBot(c.env.BOT_TOKEN, c.env);
  const handler = webhookCallback(grammyBot, "hono");
  return handler(c);
});

export { bot as botRouter };
