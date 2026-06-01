import { Router } from "express";
import { ResetPasswordBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

const BLOKS_VERSION = "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd";

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDeviceInfo(customPassword?: string | null) {
  const hexChars = "0123456789abcdef";
  const androidId = "android-" + Array.from({ length: 16 }, () => hexChars[Math.floor(Math.random() * 16)]).join("");

  const userAgent =
    `Instagram 394.0.0.46.81 Android (` +
    `${rand(["28/9", "29/10", "30/11", "31/12"])}; ` +
    `${rand(["240dpi", "320dpi", "480dpi"])}; ` +
    `${rand(["720x1280", "1080x1920", "1440x2560"])}; ` +
    `${rand(["samsung", "xiaomi", "huawei", "oneplus", "google"])}; ` +
    `${rand(["SM-G975F", "Mi-9T", "P30-Pro", "ONEPLUS-A6003", "Pixel-4"])}; ` +
    `intel; en_US; ${randInt(100000000, 999999999)})`;

  const waterfallId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const rawPass = customPassword || `@pass${Array.from({ length: 4 }, () => randInt(1, 100)).join("")}`;
  const password = `#PWD_INSTAGRAM:0:${timestamp}:${rawPass}`;

  return { androidId, userAgent, waterfallId, password, rawPass };
}

function makeHeaders(mid = "", userAgent = ""): Record<string, string> {
  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Bloks-Version-Id": BLOKS_VERSION,
    "X-Mid": mid,
    "User-Agent": userAgent,
    "Content-Length": "9481",
  };
}

async function getUsername(userId: string, userAgent: string): Promise<string | null> {
  try {
    const ua = userAgent || "Instagram 394.0.0.46.81 Android (30/11; 480dpi; 1080x1920; samsung; SM-G975F; intel; en_US; 123456789)";
    const res = await fetch(`https://i.instagram.com/api/v1/users/${userId}/info/`, {
      headers: { "User-Agent": ua, "X-IG-App-ID": "567067343352427", "Accept-Language": "en-US" },
    });
    const data = await res.json() as { user?: { username?: string } };
    return data?.user?.username ?? null;
  } catch {
    return null;
  }
}

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ chat_id: chatId, text }).toString(),
    });
  } catch {
    // silent
  }
}

async function resetInstagramPassword(
  resetLink: string,
  chatId: string,
  botToken: string,
  customPassword?: string | null
): Promise<{ success: boolean; username?: string | null; password?: string | null; error?: string }> {
  try {
    const { androidId, userAgent, waterfallId, password, rawPass } = generateDeviceInfo(customPassword);

    const uidb36 = resetLink.split("uidb36=")[1]?.split("&token=")[0];
    const token = resetLink.split("&token=")[1]?.split("&")[0];
    if (!uidb36 || !token) {
      return { success: false, error: "Invalid reset link format" };
    }

    // Step 1: password_reset
    const r1 = await fetch("https://i.instagram.com/api/v1/accounts/password_reset/", {
      method: "POST",
      headers: makeHeaders("", userAgent),
      body: new URLSearchParams({
        source: "one_click_login_email",
        uidb36,
        device_id: androidId,
        token,
        waterfall_id: waterfallId,
      }).toString(),
    });

    const r1Text = await r1.text();
    if (!r1Text.includes("user_id")) {
      return { success: false, error: `Error in reset request: ${r1Text}` };
    }

    const mid = r1.headers.get("Ig-Set-X-Mid") ?? "";
    const r1Json = JSON.parse(r1Text) as { user_id?: string; cni?: string; nonce_code?: string; challenge_context?: string };
    const { user_id: userId, cni, nonce_code: nonceCode, challenge_context: challengeContext } = r1Json;

    const challengeUrl = "https://i.instagram.com/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/";
    const bkClientContext = `{"bloks_version":"${BLOKS_VERSION}","styles_id":"instagram"}`;

    // Step 2: get challenge
    const r2 = await fetch(challengeUrl, {
      method: "POST",
      headers: makeHeaders(mid, userAgent),
      body: new URLSearchParams({
        user_id: String(userId),
        cni: String(cni),
        nonce_code: String(nonceCode),
        bk_client_context: bkClientContext,
        challenge_context: String(challengeContext),
        bloks_versioning_id: BLOKS_VERSION,
        get_challenge: "true",
      }).toString(),
    });

    const r2Text = await r2.text();

    const marker = `(bk.action.i64.Const, ${cni}), "`;
    const markerEnd = `", (bk.action.bool.Const, false)))`;
    const cleaned = r2Text.replace(/\\/g, "");
    const idx = cleaned.indexOf(marker);
    if (idx === -1) {
      return { success: false, error: "Could not parse challenge context from response" };
    }
    const after = cleaned.slice(idx + marker.length);
    const challengeContextFinal = after.split(markerEnd)[0];

    // Step 3: set new password
    await fetch(challengeUrl, {
      method: "POST",
      headers: makeHeaders(mid, userAgent),
      body: new URLSearchParams({
        is_caa: "False",
        source: "",
        uidb36: "",
        afv: "",
        cni: String(cni),
        token: "",
        has_follow_up_screens: "0",
        bk_client_context: bkClientContext,
        challenge_context: challengeContextFinal,
        bloks_versioning_id: BLOKS_VERSION,
        enc_new_password1: password,
        enc_new_password2: password,
      }).toString(),
    });

    const username = await getUsername(String(userId), userAgent);
    const displayUsername = username ?? `uid:${userId}`;

    const msg =
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `   WEYN INSTAGRAM RESET PASS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `USERNAME ➪  ${displayUsername}\n` +
      `NEW PASSWORD ➪  ${rawPass}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `        BY: @jinbelowg\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegram(botToken, chatId, msg);

    return { success: true, username, password: rawPass };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

router.post("/reset-pass", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { resetLink, chatId, botToken, customPassword } = parsed.data;

  try {
    const data = await resetInstagramPassword(resetLink, chatId, botToken, customPassword);
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

export default router;
