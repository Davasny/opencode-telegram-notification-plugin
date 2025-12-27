const REPO_RAW_URL =
  "https://raw.githubusercontent.com/Davasny/opencode-telegram-notification-plugin/main";

export function buildInstallCommand(key: string): string {
  return `curl -fsSL ${REPO_RAW_URL}/scripts/install.sh | bash -s -- ${key}`;
}
