import re
import json
import random
import struct
import base64
import os
import time
import requests
from urllib.parse import urlparse, parse_qs


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/16.6.2 Safari/605.1.15"
)

# Updated from live HAR capture — must match what wbloks/fetch uses
BLOKS_VER = "9710744400aad993bd60d4784987ff111f0f5d8a9859069ba8ae7485ed483e3f"


def generate_password(custom_password=None):
    if custom_password:
        return custom_password
    nums = ''.join([str(random.randint(1, 100)) for _ in range(4)])
    return f'@hasu{nums}'


def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    })
    return s


def parse_reset_link(reset_link):
    parsed = urlparse(reset_link)
    qs = parse_qs(parsed.query)
    uidb36 = qs.get("uidb36", [None])[0]
    # Keep the FULL token — including any ":one_click_login_email" suffix.
    # HAR shows the POST body uses the complete token, not just the part before ":".
    token = qs.get("token", [None])[0]
    return uidb36, token


def warmup(session):
    """
    Visit instagram.com — get csrftoken + mid cookies.
    Also parse __rev for the x-instagram-ajax header value.
    HAR shows x-instagram-ajax = 1042647521 (the revision number), not "1".
    """
    r = session.get(
        "https://www.instagram.com/",
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1",
        },
        timeout=15,
    )
    m = re.search(r'"__rev"\s*:\s*(\d+)', r.text)
    rev = m.group(1) if m else "1"
    return rev


def get_encryption_key(session):
    """
    Fetch Instagram's public RSA key for browser password encryption.
    Endpoint: /api/v1/web/encryption/key/?version=10&signed_key=1
    Returns: (key_id: int, public_key_b64: str) or raises with helpful message.
    """
    csrftoken = session.cookies.get("csrftoken", "")
    r = session.get(
        "https://www.instagram.com/api/v1/web/encryption/key/?version=10&signed_key=1",
        headers={
            "Accept": "*/*",
            "X-CSRFToken": csrftoken,
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.instagram.com/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        timeout=15,
    )
    text = r.text.strip()
    if not text:
        raise RuntimeError(
            f"Encryption key endpoint returned empty body (HTTP {r.status_code})"
        )
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise RuntimeError(
            f"Encryption key endpoint returned non-JSON (HTTP {r.status_code}): {text[:200]}"
        )
    key_id = data.get("public_key_id")
    pub_key = data.get("public_key")
    if not key_id or not pub_key:
        raise RuntimeError(
            f"Encryption key missing from response: {text[:200]}"
        )
    return key_id, pub_key


def encrypt_password(password, pub_key_id, pub_key_b64):
    """
    Replicate Instagram's browser encryption (#PWD_INSTAGRAM_BROWSER:10:ts:b64).

    Binary payload layout (before base64):
      [1 byte: 1]  [1 byte: key_id]  [12 bytes: IV]
      [2 bytes LE: len(rsa_encrypted_aes_key)]
      [N bytes: RSA-OAEP-SHA256 encrypted AES key]
      [16 bytes: AES-256-GCM tag]
      [M bytes: AES-256-GCM ciphertext]

    AAD for GCM = str(timestamp).encode()
    """
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.asymmetric.padding import OAEP, MGF1
    from cryptography.hazmat.primitives.hashes import SHA256
    from cryptography.hazmat.primitives.serialization import load_der_public_key

    pub_key = load_der_public_key(base64.b64decode(pub_key_b64))
    timestamp = int(time.time())

    aes_key = os.urandom(32)
    iv = os.urandom(12)

    rsa_encrypted = pub_key.encrypt(
        aes_key,
        OAEP(mgf=MGF1(SHA256()), algorithm=SHA256(), label=None),
    )

    aesgcm = AESGCM(aes_key)
    aad = str(timestamp).encode("utf-8")
    enc_with_tag = aesgcm.encrypt(iv, password.encode("utf-8"), aad)
    ciphertext = enc_with_tag[:-16]
    tag = enc_with_tag[-16:]

    payload = (
        bytes([1, pub_key_id])
        + iv
        + struct.pack("<H", len(rsa_encrypted))
        + rsa_encrypted
        + tag
        + ciphertext
    )

    return f"#PWD_INSTAGRAM_BROWSER:10:{timestamp}:{base64.b64encode(payload).decode()}"


def check_eligibility(session, uidb36, token, rev):
    """
    HAR entry [27]: confirmation_web is called as an eligibility check only.
    Response is always {"is_eligible":true,"status":"ok"} — does NOT return fb_dtsg.
    We call it to match the browser flow exactly.
    """
    csrftoken = session.cookies.get("csrftoken", "")
    session.get(
        "https://www.instagram.com/api/v1/accounts/password/reset/confirmation_web/"
        f"?afv=pre_mt_behavior&cni=&is_caa=true&source=one_click_login_email"
        f"&token={token}&uidb36={uidb36}",
        headers={
            "Accept": "*/*",
            "X-CSRFToken": csrftoken,
            "X-IG-App-ID": "936619743392459",
            "X-Instagram-AJAX": rev,
            "X-Requested-With": "XMLHttpRequest",
            "X-ASBD-ID": "359341",
            "Referer": (
                f"https://www.instagram.com/accounts/password/reset/confirm/"
                f"?uidb36={uidb36}&token={token}"
                f"&s=one_click_login_email&is_caa=1&afv=pre_mt_behavior"
            ),
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        timeout=15,
    )


def submit_password_reset(session, uidb36, token, enc_password, rev):
    """
    HAR entries [49] and [52].

    POST body (from HAR):
      enc_new_password1  — encrypted password
      enc_new_password2  — same encrypted password
      uidb36             — from reset link
      token              — FULL token from reset link (keep ":one_click_login_email")

    Key headers (from HAR):
      x-instagram-ajax   — revision number (e.g. 1042647521), not "1"
      x-bloks-version-id — BLOKS_VER
      x-asbd-id          — 359341
      x-ig-www-claim     — NOT sent (we don't have it; HAR shows it only after session cookie acquired)

    Entry [49] → failure (logging event, password_reset_recovery_failure_client)
    Entry [52] → success (OpenUrlV2 → /auth_platform/?apc=...)
    Both use identical structure; [52] succeeds likely because the bloks state
    was initialized by [49]'s response. We POST once and detect success.
    """
    csrftoken = session.cookies.get("csrftoken", "")
    payload = {
        "enc_new_password1": enc_password,
        "enc_new_password2": enc_password,
        "uidb36": uidb36,
        "token": token,
    }
    r = session.post(
        "https://www.instagram.com/api/v1/bloks/apps/"
        "com.instagram.account_security.password_reset_submit_action_handler/",
        data=payload,
        headers={
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": "https://www.instagram.com",
            "Referer": (
                f"https://www.instagram.com/accounts/password/reset/confirm/"
                f"?uidb36={uidb36}&token={token}"
                f"&s=one_click_login_email&is_caa=1&afv=pre_mt_behavior"
            ),
            "X-CSRFToken": csrftoken,
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
            "X-Instagram-AJAX": rev,
            "X-Bloks-Version-Id": BLOKS_VER,
            "X-ASBD-ID": "359341",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        timeout=30,
    )
    return r


def is_success(r):
    """
    HAR entry [52] success response contains:
      "handler":"(bk.action.navigation.OpenUrlV2, \"/auth_platform/...
    Entry [49] failure response contains:
      "password_reset_recovery_failure_client"
    """
    if r.status_code != 200:
        return False
    text = r.text
    if "auth_platform" in text and "OpenUrlV2" in text:
        return True
    return False


def extract_username(text):
    m = re.search(r'"username"\s*[,:]\s*"([^"]+)"', text)
    return m.group(1) if m else None


def send_telegram(bot_token, chat_id, text):
    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            data={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except Exception:
        pass


def reset_instagram_password(reset_link, chat_id, bot_token, custom_password=None):
    try:
        uidb36, token = parse_reset_link(reset_link)
        if not uidb36 or not token:
            return {"success": False, "error": "Could not parse uidb36/token from reset link"}

        session = make_session()
        new_password = generate_password(custom_password)

        # 1. Visit instagram.com — cookies + revision number
        rev = warmup(session)

        # 2. Fetch Instagram's RSA public key for password encryption
        pub_key_id, pub_key_b64 = get_encryption_key(session)
        if not pub_key_id or not pub_key_b64:
            return {"success": False, "error": "Could not fetch Instagram encryption key"}

        # 3. Encrypt password exactly as the browser does
        try:
            enc_password = encrypt_password(new_password, pub_key_id, pub_key_b64)
        except Exception as e:
            return {"success": False, "error": f"Password encryption failed: {e}"}

        # 4. Eligibility check — matches browser flow (confirmation_web)
        check_eligibility(session, uidb36, token, rev)

        # 5. Submit new password
        r = submit_password_reset(session, uidb36, token, enc_password, rev)

        if not is_success(r):
            return {
                "success": False,
                "error": f"Reset failed (HTTP {r.status_code}): {r.text[:500]}",
            }

        username = extract_username(r.text)
        display = f"@{username}" if username else f"uidb36:{uidb36}"
        send_telegram(
            bot_token, chat_id,
            f"\U0001d4d7\U0001d4f8\U0001d4f5\U0001d4ea! Password changed.\n\n"
            f"Username: {display}\nPassword: {new_password}",
        )
        return {"success": True, "username": username, "password": new_password}

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
    parser.add_argument("--reset-link", required=True)
    parser.add_argument("--chat-id", required=True)
    parser.add_argument("--bot-token", required=True)
    parser.add_argument("--custom-password", default=None)
    args = parser.parse_args()
    result = reset_instagram_password(
        args.reset_link, args.chat_id, args.bot_token, args.custom_password or None
    )
    print(json.dumps(result))
