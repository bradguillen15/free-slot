import { readFileSync } from "node:fs";
import { STATUS_FILE } from "../global-setup";

/**
 * Helpers for reading auth emails from the local mail catcher.
 *
 * Supabase's CLI ships Mailpit (the `[inbucket]` block in config.toml is the
 * legacy section name; the running service is Mailpit). It exposes a single inbox
 * over a REST API on port 54324. We search by recipient and pull the newest
 * message, then extract the GoTrue action link (verify/recovery URL).
 */

const MAIL_PORT = 54324;

function mailpitBase(): string {
  const { apiUrl } = JSON.parse(readFileSync(STATUS_FILE, "utf8")) as { apiUrl: string };
  const u = new URL(apiUrl);
  return `${u.protocol}//${u.hostname}:${MAIL_PORT}`;
}

type MailpitSummary = { ID: string; Created: string; Subject: string };
type MailpitMessage = { Text?: string; HTML?: string };

async function searchByRecipient(email: string): Promise<MailpitSummary[]> {
  const url = `${mailpitBase()}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { messages: MailpitSummary[] };
  return json.messages ?? [];
}

async function getMessage(id: string): Promise<string> {
  const res = await fetch(`${mailpitBase()}/api/v1/message/${id}`);
  const msg = (await res.json()) as MailpitMessage;
  return msg.HTML || msg.Text || "";
}

/** Delete every message — call before triggering an email so the poll can't read a stale one. */
export async function clearMailpit(): Promise<void> {
  await fetch(`${mailpitBase()}/api/v1/messages`, { method: "DELETE" });
}

/** Poll until an email to `recipient` arrives, then return the newest one's body. */
export async function waitForEmail(recipient: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await searchByRecipient(recipient);
    if (messages.length) {
      const newest = messages.sort((a, b) => +new Date(b.Created) - +new Date(a.Created))[0];
      return getMessage(newest.ID);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`[cloud-e2e] No email arrived for ${recipient} within ${timeoutMs}ms`);
}

/** Pull the first GoTrue action link (confirmation / recovery verify URL) from an email body. */
export function extractActionLink(body: string): string {
  const matches = body.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const link = matches.find((m) => /verify|token|confirmation_url|type=/.test(m));
  if (!link) throw new Error("[cloud-e2e] No action link found in email body");
  return link.replace(/&amp;/g, "&");
}
