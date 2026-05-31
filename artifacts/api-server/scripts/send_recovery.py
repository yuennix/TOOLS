import httpx
import random
import ssl
import json
import sys

cookies = {
    "csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
    "mid": "adiAuAAEAAFqNhj2f7KBf56OjV5_",
    "ig_did": "6C2A174F-093F-4BAC-8DDF-B7D6527F73AE",
}

headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=1.0",
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    "x-ig-app-id": "936619743392459",
    "x-csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
    "x-requested-with": "XMLHttpRequest",
}

jazoest_list = ["22603", "22913", "22785", "22841", "22567"]

def get_safe_context():
    context = ssl.create_default_context()
    context.set_ciphers('DEFAULT@SECLEVEL=1')
    return context

def send_recovery(email):
    url = "https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/?hl=en"
    data = {
        "email_or_username": email,
        "jazoest": random.choice(jazoest_list)
    }
    try:
        with httpx.Client(http2=True, verify=get_safe_context(), timeout=20) as client:
            r = client.post(url, headers=headers, cookies=cookies, data=data)
            try:
                parsed = r.json()
                return {"email": email, "success": True, "response": json.dumps(parsed, indent=2)}
            except Exception:
                return {"email": email, "success": True, "response": r.text}
    except Exception as e:
        return {"email": email, "success": False, "response": str(e)}

if __name__ == "__main__":
    emails = sys.argv[1:]
    results = [send_recovery(email) for email in emails]
    print(json.dumps({"results": results}))
