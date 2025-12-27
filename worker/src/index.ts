interface Env {
  BOT_TOKEN: string;
  USERS: KVNamespace;
}

interface UserData {
  chatId: number;
  createdAt: string;
  firstName?: string;
}

interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
    from?: {
      first_name?: string;
    };
  };
}

interface NotifyRequest {
  key: string;
  project?: string;
  message?: string;
}

const REPO_RAW_URL =
  "https://raw.githubusercontent.com/Davasny/opencode-telegram-notification-plugin/main";

function generateUUID(): string {
  return crypto.randomUUID();
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  parseMode: string = "Markdown",
): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
    }),
  });
  return response.ok;
}

async function findUserKeyByChatId(
  kv: KVNamespace,
  chatId: number,
): Promise<{ key: string; data: UserData } | null> {
  const existingKeys = await kv.list({ prefix: "" });
  for (const key of existingKeys.keys) {
    const data = await kv.get<UserData>(key.name, "json");
    if (data?.chatId === chatId) {
      return { key: key.name, data };
    }
  }
  return null;
}

async function handleStart(chatId: number, firstName: string, env: Env): Promise<void> {
  // Check if user already has a key
  const existing = await findUserKeyByChatId(env.USERS, chatId);

  if (existing) {
    // User already has a key, send existing install command
    const installCommand = `curl -fsSL ${REPO_RAW_URL}/scripts/install.sh | bash -s -- ${existing.key}`;
    await sendTelegramMessage(
      env.BOT_TOKEN,
      chatId,
      `Hey ${firstName}! You already have an install key.\n\n*Run this command to install:*\n\`\`\`bash\n${installCommand}\n\`\`\`\n\nUse /revoke to generate a new key if needed.`,
    );
    return;
  }

  // Generate new key for new user
  const installKey = generateUUID();
  const userData: UserData = {
    chatId,
    createdAt: new Date().toISOString(),
    firstName,
  };
  await env.USERS.put(installKey, JSON.stringify(userData));

  const installCommand = `curl -fsSL ${REPO_RAW_URL}/scripts/install.sh | bash -s -- ${installKey}`;
  const welcomeMessage = `
Hey ${firstName}!

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
  `.trim();

  await sendTelegramMessage(env.BOT_TOKEN, chatId, welcomeMessage);
}

async function handleRevoke(chatId: number, firstName: string, env: Env): Promise<void> {
  // Find and delete existing key
  const existing = await findUserKeyByChatId(env.USERS, chatId);
  if (existing) {
    await env.USERS.delete(existing.key);
  }

  // Generate new key
  const installKey = generateUUID();
  const userData: UserData = {
    chatId,
    createdAt: new Date().toISOString(),
    firstName,
  };
  await env.USERS.put(installKey, JSON.stringify(userData));

  const installCommand = `curl -fsSL ${REPO_RAW_URL}/scripts/install.sh | bash -s -- ${installKey}`;
  await sendTelegramMessage(
    env.BOT_TOKEN,
    chatId,
    `Your old key has been revoked.\n\n*Run this command to reinstall:*\n\`\`\`bash\n${installCommand}\n\`\`\`\n\nYour old plugin will stop working.`,
  );
}

async function handleStatus(chatId: number, env: Env): Promise<void> {
  const existing = await findUserKeyByChatId(env.USERS, chatId);

  if (existing) {
    await sendTelegramMessage(
      env.BOT_TOKEN,
      chatId,
      `You have an active install key (created: ${existing.data.createdAt}).\n\nIf you've installed the plugin, you should receive notifications when OpenCode sessions complete.`,
    );
  } else {
    await sendTelegramMessage(
      env.BOT_TOKEN,
      chatId,
      "You don't have an install key yet. Send /start to get one.",
    );
  }
}

async function handleHelp(chatId: number, env: Env): Promise<void> {
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

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const update: TelegramUpdate = await request.json();
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  const firstName = update.message?.from?.first_name || "there";

  if (!chatId) {
    return new Response("OK");
  }

  if (text === "/start") {
    await handleStart(chatId, firstName, env);
  } else if (text === "/revoke") {
    await handleRevoke(chatId, firstName, env);
  } else if (text === "/status") {
    await handleStatus(chatId, env);
  } else if (text === "/help") {
    await handleHelp(chatId, env);
  }

  return new Response("OK");
}

async function handleNotify(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: NotifyRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.key) {
    return Response.json({ success: false, error: "Missing key" }, { status: 400 });
  }

  const userData = await env.USERS.get<UserData>(body.key, "json");
  if (!userData) {
    return Response.json({ success: false, error: "Invalid key" }, { status: 401 });
  }

  const projectName = body.project || "Unknown project";
  const timestamp = new Date().toLocaleTimeString();
  const message = body.message || `*Session completed*\n\`${projectName}\`\n${timestamp}`;

  const success = await sendTelegramMessage(env.BOT_TOKEN, userData.chatId, message);

  return Response.json({ success });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("OpenCode Telegram Bot is running", { status: 200 });
    }

    // Telegram webhook
    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        return await handleWebhook(request, env);
      } catch (error) {
        console.error("Webhook error:", error);
        return new Response("Error", { status: 500 });
      }
    }

    // Notify endpoint (called by plugin)
    if (url.pathname === "/notify") {
      try {
        return await handleNotify(request, env);
      } catch (error) {
        console.error("Notify error:", error);
        return Response.json({ success: false, error: "Internal error" }, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
