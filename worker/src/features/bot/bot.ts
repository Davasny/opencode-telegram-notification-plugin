import { Bot, type Context } from "grammy";
import type { Env } from "../../lib/types";
import { createUser, deleteUser, findUserKeyByChatId, generateInstallKey } from "../users/service";

const REPO_RAW_URL =
  "https://raw.githubusercontent.com/Davasny/opencode-telegram-notification-plugin/main";

function buildInstallCommand(key: string): string {
  return `curl -fsSL ${REPO_RAW_URL}/scripts/install.sh | bash -s -- ${key}`;
}

export interface BotContext extends Context {
  env: Env;
}

export function createBot(token: string, env: Env): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Inject env into context
  bot.use((ctx, next) => {
    ctx.env = env;
    return next();
  });

  // /start command
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from?.username || "N/A";

    const existing = await findUserKeyByChatId(ctx.env.USERS, chatId);

    if (existing) {
      const installCommand = buildInstallCommand(existing.key);
      await ctx.reply(
        `
Hey ${username}! You already have an install key.

*Run this command to install the plugin:*
\`\`\`bash
${installCommand}
\`\`\`

Use /revoke to generate a new key if needed.
`.trim(),
        { parse_mode: "Markdown" },
      );
      return;
    }

    const installKey = generateInstallKey();
    await createUser(ctx.env.USERS, installKey, { chatId, username });

    const installCommand = buildInstallCommand(installKey);
    await ctx.reply(
      `
Hey ${username}!

I'll notify you when your OpenCode sessions complete.

*Run this command to install:*
\`\`\`bash
${installCommand}
\`\`\`

After installation, you'll receive a notification whenever OpenCode finishes a task.

Commands:
/revoke - Generate a new install key (invalidates old one)
/status - Check your installation status
/help - Show help message
`.trim(),
      { parse_mode: "Markdown" },
    );
  });

  // /revoke command
  bot.command("revoke", async (ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from?.username || "N/A";

    const existing = await findUserKeyByChatId(ctx.env.USERS, chatId);
    if (existing) {
      await deleteUser(ctx.env.USERS, existing.key);
    }

    const installKey = generateInstallKey();
    await createUser(ctx.env.USERS, installKey, { chatId, username });

    const installCommand = buildInstallCommand(installKey);
    await ctx.reply(
      `Your old key has been revoked.

*Run this command to reinstall:*
\`\`\`bash
${installCommand}
\`\`\`

Your old plugin will stop working.`,
      { parse_mode: "Markdown" },
    );
  });

  // /status command
  bot.command("status", async (ctx) => {
    const chatId = ctx.chat.id;

    const existing = await findUserKeyByChatId(ctx.env.USERS, chatId);

    if (existing) {
      await ctx.reply(
        "You have an active install key.\n\nIf you've installed the plugin, you should receive notifications when OpenCode sessions complete.",
      );
    } else {
      await ctx.reply("You don't have an install key yet. Send /start to get one.");
    }
  });

  // /help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `
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
`.trim(),
      { parse_mode: "Markdown" },
    );
  });

  return bot;
}
