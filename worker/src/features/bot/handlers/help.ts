import { sendTelegramMessage } from "../../../lib/telegram";
import type { Env } from "../../../lib/types";

export async function handleHelp(chatId: number, env: Env): Promise<void> {
  const helpMessage = `
*OpenCode Telegram Notifications*

Commands:
/start - Get installation command
/revoke - Generate new key (invalidates old one)
/status - Check installation status
/help - Show this message

*How it works:*
1. Run the install command from /start
2. Restart OpenCode
3. Get notified when sessions complete!

[GitHub Repository](https://github.com/Davasny/opencode-telegram-notification-plugin)
  `.trim();
  await sendTelegramMessage(env.BOT_TOKEN, chatId, helpMessage);
}
