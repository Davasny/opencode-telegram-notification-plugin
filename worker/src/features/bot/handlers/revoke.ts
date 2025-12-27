import { sendTelegramMessage } from "../../../lib/telegram";
import type { Env } from "../../../lib/types";
import {
  createUser,
  deleteUser,
  findUserKeyByChatId,
  generateInstallKey,
} from "../../users/service";
import { buildInstallCommand } from "./utils";

export async function handleRevoke(chatId: number, firstName: string, env: Env): Promise<void> {
  const existing = await findUserKeyByChatId(env.USERS, chatId);
  if (existing) {
    await deleteUser(env.USERS, existing.key);
  }

  const installKey = generateInstallKey();
  await createUser(env.USERS, installKey, { chatId, firstName });

  const installCommand = buildInstallCommand(installKey);
  await sendTelegramMessage(
    env.BOT_TOKEN,
    chatId,
    `Your old key has been revoked.\n\n*Run this command to reinstall:*\n\`\`\`bash\n${installCommand}\n\`\`\`\n\nYour old plugin will stop working.`,
  );
}
