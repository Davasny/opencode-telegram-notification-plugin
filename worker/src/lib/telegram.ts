export async function sendTelegramMessage(
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
