import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import got from "got";

const router = Router();

const cookies = {
  csrftoken: "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
  mid: "adiAuAAEAAFqNhj2f7KBf56OjV5_",
  ig_did: "6C2A174F-093F-4BAC-8DDF-B7D6527F73AE",
};

const headers = {
  accept: "*/*",
  "accept-language": "en-US,en;q=1.0",
  "content-type": "application/x-www-form-urlencoded",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "x-ig-app-id": "936619743392459",
  "x-csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
  "x-requested-with": "XMLHttpRequest",
};

const jazoestList = ["22603", "22913", "22785", "22841", "22567"];

function cookieString() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function sendRecovery(
  email: string,
): Promise<{ email: string; success: boolean; response: string }> {
  const jazoest = jazoestList[Math.floor(Math.random() * jazoestList.length)];

  try {
    const r = await got.post(
      "https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/?hl=en",
      {
        http2: true,
        headers: {
          ...headers,
          cookie: cookieString(),
        },
        form: {
          email_or_username: email,
          jazoest,
        },
        https: {
          rejectUnauthorized: false,
        },
        timeout: { request: 20000 },
        throwHttpErrors: false,
      },
    );

    let parsed: string;
    try {
      parsed = JSON.stringify(JSON.parse(r.body), null, 2);
    } catch {
      parsed = r.body;
    }

    return { email, success: true, response: parsed };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { email, success: false, response: msg };
  }
}

router.post("/reset-link", async (req, res) => {
  const parsed = SendResetLinksBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { emails } = parsed.data;
  const results = await Promise.all(emails.map((email) => sendRecovery(email)));
  return res.json({ results });
});

export default router;
