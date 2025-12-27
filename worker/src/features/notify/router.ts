import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { sendTelegramMessage } from "../../lib/telegram";
import type { Env } from "../../lib/types";
import { getUserByKey } from "../users/service";
import { notifyRequestSchema } from "./schemas";

const notify = new Hono<{ Bindings: Env }>();

notify.post(
  "/notify",
  zValidator("json", notifyRequestSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      return c.json({ success: false, error: firstError?.message || "Invalid request" }, 400);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");

    const userData = await getUserByKey(c.env.USERS, body.key);
    if (!userData) {
      return c.json({ success: false, error: "Invalid key" }, 401);
    }

    const projectName = body.project || "Unknown project";
    const timestamp = new Date().toLocaleTimeString();
    const message = body.message || `*Session completed*\n\`${projectName}\`\n${timestamp}`;

    const success = await sendTelegramMessage(c.env.BOT_TOKEN, userData.chatId, message);

    return c.json({ success });
  },
);

notify.get("/notify", (c) => {
  return c.text("Method not allowed", 405);
});

export { notify as notifyRouter };
