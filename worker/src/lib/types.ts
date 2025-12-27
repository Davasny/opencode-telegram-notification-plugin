export interface Env {
  BOT_TOKEN: string;
  USERS: KVNamespace;
}

export interface UserData {
  chatId: number;
  firstName?: string;
}
