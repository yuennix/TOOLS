import re
import json
import random
import requests
from urllib.parse import urlparse, parse_qs


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/16.6.2 Safari/605.1.15"
)

BLOKS_VER = "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd"


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
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })
    return s


def parse_reset_link(reset_link):
    parsed = urlparse(reset_link)
    qs = parse_qs(parsed.query)
    uidb36 = qs.get("uidb36", [None])[0]
    token_raw = qs.get("token", [None])[0]
    token = token_raw.split(":")[0] if token_raw else None
    return uidb36, token


def extract_lsd(html):
    """Extract the LSD token from a Facebook/Instagram page."""
    for pattern in [
        r'\["LSD",\[\],\{"token"\s*:\s*"([^"]+)"',
        r'"LSD"\s*,\s*\[\s*\]\s*,\s*\{\s*"token"\s*:\s*"([^"]+)"',
        r'"lsd"\s*:\s*\{"token"\s*:\s*"([^"]+)"',
        r'name="lsd"\s+value="([^"]+)"',
        r'"token"\s*:\s*"(Ad[A-Za-z0-9_\-]{10,})"',
    ]:
        m = re.search(pattern, html)
        if m:
            return m.group(1)
    return None


def warmup(session):
    """
    Visit instagram.com then facebook.com.
    facebook.com is where the lsd token and fb_dtsg sync call originate.
    """
    # Instagram first for csrftoken / mid
    session.get(
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
    # Facebook — this is where the lsd token lives and where the sync call is made FROM
    fb_r = session.get(
        "https://www.facebook.com/",
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1",
        },
        timeout=15,
    )
    lsd = extract_lsd(fb_r.text)
    return lsd


def fetch_fb_dtsg(session, lsd_token):
    """
    Replicate the browser call:
      GET facebook.com/instagram/sync/?fb_dtsg_ag
      Referer: https://www.facebook.com/
      Sec-Fetch-Site: same-origin  ← critical, browser is ON facebook.com
    Note: Accept-Encoding excludes 'br' so requests can decode gzip natively.
    """
    url = (
        "https://www.facebook.com/instagram/sync/"
        "?fb_dtsg_ag&__user=0&__a=1&__req=1&dpr=2"
        "&__ccg=EXCELLENT&__comet_req=15"
    )
    r = session.get(
        url,
        headers={
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate",
            "Referer": "https://www.facebook.com/",
            "x-fb-lsd": lsd_token or "",
            "x-asbd-id": "359341",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        timeout=15,
    )
    text = r.text
    # Strip for(;;); anti-hijacking prefix
    if text.startswith("for(;;);"):
        text = text[8:]
    try:
        data = json.loads(text)
        token = (
            data.get("o0", {})
                .get("data", {})
                .get("fb_dtsg", {})
                .get("token")
        )
        if token:
            return token, None
    except Exception:
        pass
    # Fallback regex
    m = re.search(r'"token"\s*:\s*"([A-Za-z0-9_\-]{10,})"', text)
    if m:
        return m.group(1), None
    return None, f"sync response (HTTP {r.status_code}): {text[:300]}"


def load_reset_page(session, uidb36, token):
    """Visit the reset confirm page — picks up jazoest / error_state."""
    r = session.get(
        f"https://www.instagram.com/accounts/password/reset/confirm/"
        f"?uidb36={uidb36}&token={token}",
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": "https://www.instagram.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Upgrade-Insecure-Requests": "1",
        },
        timeout=20,
    )
    html = r.text
    jazoest = None
    error_state = ""
    m = re.search(r'jazoest["\s:=]+([0-9]+)', html)
    if m:
        jazoest = m.group(1)
    m = re.search(r'"error_state"\s*:\s*"([^"]*)"', html)
    if m:
        error_state = m.group(1)
    return jazoest, error_state


def submit_password_reset(session, uidb36, token, fb_dtsg, jazoest, error_state, new_password):
    csrftoken = session.cookies.get("csrftoken", "")
    payload = {
        "uidb36": uidb36,
        "token": token,
        "new_password1": new_password,
        "new_password2": new_password,
        "fb_dtsg": fb_dtsg or "",
        "jazoest": jazoest or "",
        "error_state": error_state,
        "bk_client_context": json.dumps({
            "bloks_version": BLOKS_VER,
            "styles_id": "instagram",
        }),
        "bloks_versioning_id": BLOKS_VER,
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
            ),
            "X-CSRFToken": csrftoken,
            "X-IG-App-ID": "936619743392459",
            "X-Instagram-AJAX": "1",
            "X-Requested-With": "XMLHttpRequest",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        timeout=30,
    )
    return r


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

        # Step 1: instagram.com + facebook.com → cookies + lsd
        lsd_token = warmup(session)

        # Step 2: facebook.com/instagram/sync/ → fb_dtsg (same-origin from fb)
        fb_dtsg, sync_err = fetch_fb_dtsg(session, lsd_token)
        if not fb_dtsg:
            return {"success": False, "error": f"Could not fetch fb_dtsg. {sync_err}"}

        # Step 3: reset confirm page → jazoest, error_state
        jazoest, error_state = load_reset_page(session, uidb36, token)

        # Step 4: submit new password
        r = submit_password_reset(
            session, uidb36, token, fb_dtsg, jazoest, error_state, new_password
        )

        username = extract_username(r.text)
        success = r.status_code == 200 and (
            "success" in r.text.lower()
            or "password" in r.text.lower()
            or username is not None
        )

        if not success:
            return {"success": False, "error": f"Reset failed (HTTP {r.status_code}): {r.text[:400]}"}

        display = f"@{username}" if username else f"uidb36:{uidb36}"
        send_telegram(
            bot_token, chat_id,
            f"\U0001d4d7\U0001d4f8\U0001d4f5\U0001d4ea! Password changed.\n\n"
            f"Username: {display}\nPassword: {new_password}",
        )
        return {"success": True, "username": username, "password": new_password}

    except requests.HTTPError as e:
        return {"success": False, "error": f"HTTP error: {e.response.status_code} {e.response.text[:300]}"}
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
