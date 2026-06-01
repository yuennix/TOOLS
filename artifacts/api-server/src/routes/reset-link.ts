import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import http2 from "http2";

const router = Router();

const COOKIES = "csrftoken=qXbOywPKhDdMfdTceKhs2DcocVgMz4q8; mid=adiAuAAEAAFqNhj2f7KBf56OjV5_; ig_did=6C2A174F-093F-4BAC-8DDF-B7D6527F73AE";
const CSRF = "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8";

const JAZOEST = ["22603", "22913", "22785", "22841", "22567"];

function sendViaHttp2(bodyStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = http2.connect("https://www.instagram.com", {
      rejectUnauthorized: false,
    });

    client.on("error", (err) => {
      client.destroy();
      reject(err);
    });

    const path = "/api/v1/web/accounts/account_recovery_send_ajax/?hl=en";

    const req = client.request({
      ":method": "POST",
      ":path": path,
      ":scheme": "https",
      ":authority": "www.instagram.com",
      "accept": "*/*",
      "accept-language": "en-US,en;q=1.0",
      "content-type": "application/x-www-form-urlencoded",
      "content-length": String(Buffer.byteLength(bodyStr)),
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      "x-ig-app-id": "936619743392459",
      "x-csrftoken": CSRF,
      "x-requested-with": "XMLHttpRequest",
      "cookie": COOKIES,
    });

    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => {
      client.close();
      resolve(data);
    });
    req.on("error", (err: Error) => {
      client.destroy();
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
}

async function sendRecovery(email: string): Promise<{ email: string; success: boolean; response: string }> {
  const jazoest = JAZOEST[Math.floor(Math.random() * JAZOEST.length)];
  const body = new URLSearchParams({ email_or_username: email, jazoest }).toString();

  try {
    const text = await sendViaHttp2(body);
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
