import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import { fetch, Agent } from "undici";

const router = Router();

const h2Agent = new Agent({ allowH2: true });

const COOKIES = "csrftoken=qXbOywPKhDdMfdTceKhs2DcocVgMz4q8; mid=adiAuAAEAAFqNhj2f7KBf56OjV5_; ig_did=6C2A174F-093F-4BAC-8DDF-B7D6527F73AE";

const HEADERS: Record<string, string> = {
  accept: "*/*",
  "accept-language": "en-US,en;q=1.0",
  "content-type": "application/x-www-form-urlencoded",
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "x-ig-app-id": "936619743392459",
  "x-csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
  "x-requested-with": "XMLHttpRequest",
  cookie: COOKIES,
};

const JAZOEST = ["22603", "22913", "22785", "22841", "22567"];

async function sendRecovery(email: string): Promise<{ email: string; success: boolean; response: string }> {
  const url = "https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/?hl=en";
  const jazoest = JAZOEST[Math.floor(Math.random() * JAZOEST.length)];
  const body = new URLSearchParams({ email_or_username: email, jazoest }).toString();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body,
      dispatcher: h2Agent,
    });
    const text = await res.text();
    try {
      return { email, success: true, response: JSON.stringify(JSON.parse(text), null, 2) };
    } catch {
      return { email, success: true, response: text };
    }
  } catch (e) {
    return { email, success: false, response: String(e) };
  }
}

router.post("/reset-link", async (req, res) => {
  const parsed = SendResetLinksBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const results = await Promise.all(parsed.data.emails.map(sendRecovery));
    return res.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
