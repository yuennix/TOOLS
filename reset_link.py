import httpx
import random
import ssl
import json

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
                parsed_json = json.loads(r.text)
                print(f"[{email}] {json.dumps(parsed_json, indent=4)}")
            except:
                print(f"[{email}] {r.text}")
    except Exception as e:
        print(f"[{email}] ERROR: {e}")

if __name__ == "__main__":
    print("Enter Gmail addresses separated by commas:")
    raw = input("> ").strip()
    emails = [e.strip() for e in raw.split(",") if e.strip()]

    if not emails:
        print("No emails entered.")
    else:
        print(f"\nProcessing {len(emails)} email(s)...\n")
        for email in emails:
            send_recovery(email)
        print("\nDone.")
