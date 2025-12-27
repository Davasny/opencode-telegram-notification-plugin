import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Worker", () => {
  it("responds to GET with health check", async () => {
    const response = await SELF.fetch("https://example.com/");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OpenCode Telegram Bot is running");
  });

  it("returns 404 for unknown routes", async () => {
    const response = await SELF.fetch("https://example.com/unknown");
    expect(response.status).toBe(404);
  });

  it("returns 405 for GET on /notify", async () => {
    const response = await SELF.fetch("https://example.com/notify");
    expect(response.status).toBe(405);
  });

  it("returns 400 for invalid JSON on /notify", async () => {
    const response = await SELF.fetch("https://example.com/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Malformed JSON in request body");
  });

  it("returns 400 for missing key on /notify", async () => {
    const response = await SELF.fetch("https://example.com/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: "test" }),
    });
    expect(response.status).toBe(400);
    const json = (await response.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toContain("expected string");
  });

  it("returns 400 for empty key on /notify", async () => {
    const response = await SELF.fetch("https://example.com/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "", project: "test" }),
    });
    expect(response.status).toBe(400);
  });
});
