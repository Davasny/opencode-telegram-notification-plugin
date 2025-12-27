import { sendTelegramMessage } from "../../../lib/telegram";
import type { Env } from "../../../lib/types";
import { findUserKeyByChatId } from "../../users/service";

export async function handleStatus(chatId: number, env: Env): Promise<void> {
  const existing = await findUserKeyByChatId(env.USERS, chatId);

  if (existing) {
    await sendTelegramMessage(
      env.BOT_TOKEN,
      chatId,
      "You have an active install key.\n\nIf you've installed the plugin, you should receive notifications when OpenCode sessions complete.",
    );
  } else {
    await sendTelegramMessage(
      env.BOT_TOKEN,
      chatId,
      "You don't have an install key yet. Send /start to get one.",
    );
  }
}
