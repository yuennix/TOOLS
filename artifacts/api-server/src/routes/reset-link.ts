import { Router } from "express";
import { SendResetLinksBody } from "@workspace/api-zod";
import https from "https";
import http from "http";

const router = Router();

const cookies = {
  csrftoken: "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
  mid: "adiAuAAEAAFqNhj2f7KBf56OjV5_",
  ig_did: "6C2A174F-093F-4BAC-8DDF-B7D6527F73AE",
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
  const body = new URLSearchParams({
    email_or_username: email,
    jazoest,
  }).toString();

  return new Promise((resolve) => {
    const options = {
      hostname: "www.instagram.com",
      path: "/api/v1/web/accounts/account_recovery_send_ajax/?hl=en",
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=1.0",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "x-ig-app-id": "936619743392459",
        "x-csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
        "x-requested-with": "XMLHttpRequest",
        cookie: cookieString(),
        "content-length": Buffer.byteLength(body).toString(),
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ email, success: true, response: data });
      });
    });

    req.on("error", (err) => {
      resolve({ email, success: false, response: err.message });
    });

    req.write(body);
    req.end();
  });
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
