/** Cliente mínimo de la Bot API de Telegram (vía fetch, sin SDK). */
const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  return t;
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result as T;
}

export const telegram = {
  sendMessage(chatId: number, text: string, buttons?: InlineButton[][]) {
    return call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    });
  },

  editMessageText(chatId: number, messageId: number, text: string) {
    return call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    });
  },

  answerCallbackQuery(id: string, text?: string) {
    return call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
  },

  /** Descarga un archivo (audio/imagen) que envió el usuario. */
  async downloadFile(fileId: string): Promise<{ bytes: Uint8Array; mimeHint: string }> {
    const file = await call<{ file_path: string }>("getFile", { file_id: fileId });
    const res = await fetch(`${API}/file/bot${token()}/${file.file_path}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const ext = file.file_path.split(".").pop()?.toLowerCase() ?? "";
    const mimeHint =
      ext === "oga" || ext === "ogg" ? "audio/ogg"
      : ext === "mp3" ? "audio/mpeg"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "png" ? "image/png"
      : "application/octet-stream";
    return { bytes: buf, mimeHint };
  },
};
