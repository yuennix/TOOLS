import httpx
import random
import ssl
import json
import sys

jazoest_list = ["22603", "22913", "22785", "22841", "22567"]

BASE_HEADERS = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=1.0",
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "x-ig-app-id": "936619743392459",
    "x-requested-with": "XMLHttpRequest",
}

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.set_ciphers("DEFAULT@SECLEVEL=1")
    return ctx

def fetch_fresh_cookies(client: httpx.Client) -> dict:
    try:
        r = client.get(
            "https://www.instagram.com/accounts/password/reset/",
            headers={
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language": "en-US,en;q=1.0",
                "user-agent": BASE_HEADERS["user-agent"],
            },
            follow_redirects=True,
            timeout=15,
        )
        cookies = dict(r.cookies)
        return cookies
    except Exception:
        return {}

def send_recovery(email: str) -> dict:
    try:
        with httpx.Client(http2=True, verify=get_ssl_context(), timeout=25) as client:
            cookies = fetch_fresh_cookies(client)
            csrf = cookies.get("csrftoken", "")

            headers = {
                **BASE_HEADERS,
                "x-csrftoken": csrf,
                "referer": "https://www.instagram.com/accounts/password/reset/",
            }

            data = {
                "email_or_username": email,
                "jazoest": random.choice(jazoest_list),
            }

            r = client.post(
                "https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/?hl=en",
                headers=headers,
                cookies=cookies,
                data=data,
                timeout=20,
            )

            try:
                parsed = r.json()
            except Exception:
                return {"email": email, "success": False, "response": f"Non-JSON response (HTTP {r.status_code}): {r.text[:300]}"}

            status = parsed.get("status", "")
            success = status == "ok"

            return {
                "email": email,
                "success": success,
                "response": json.dumps(parsed, indent=2),
            }

    except httpx.TimeoutException:
        return {"email": email, "success": False, "response": "Request timed out"}
    except Exception as e:
        return {"email": email, "success": False, "response": str(e)}

if __name__ == "__main__":
    emails = sys.argv[1:]
    if not emails:
        print(json.dumps({"results": []}))
        sys.exit(0)
    results = [send_recovery(email) for email in emails]
    print(json.dumps({"results": results}))
