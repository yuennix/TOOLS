import os
import re
import json
import string
import random
import uuid
import time
from datetime import datetime
from threading import Thread, Lock
import requests
from requests import post as pp
from random import choice, randrange
import base64
import secrets
from hashlib import md5
import webbrowser

try:
    from rich.console import Console
except ImportError:
    os.system("pip install requests rich")

b = random.randint(5, 208)
bo = f'\x1b[38;5;{b}m'
ED = '\x1b[38;5;208m'
BLUE = '\033[94m'
Z = '\033[1;31m'
YELLOW = '\033[1;33m'
N = '\033[1;37m'
J = '\033[2;36m'


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
    if custom_password:
        raw_pass = custom_password
    else:
        nums = ''.join([str(random.randint(1, 100)) for _ in range(4)])
        raw_pass = f'@pass{nums}'
    PASSWORD = f'#PWD_INSTAGRAM:0:{timestamp}:{raw_pass}'
    return ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD


def make_headers(mid="", user_agent=""):
    return {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Bloks-Version-Id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
        "X-Mid": mid,
        "User-Agent": user_agent,
        "Content-Length": "9481"
    }


def id_user(user_id):
    try:
        url = f"https://i.instagram.com/api/v1/users/{user_id}/info/"
        headers = {"User-Agent": "Instagram 219.0.0.12.117 Android"}
        r = requests.get(url, headers=headers)
        try:
            username = r.json()["user"]["username"]
            return username
        except:
            print("Failed to get username:", r.text)
    except:
        pass


def send_telegram(bot_token, chat_id, text):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    try:
        r = requests.post(url, data=payload, timeout=10)
        return r.json()
    except Exception as e:
        print("[-] Telegram send error:", e)
        return None


def reset_instagram_password(reset_link, custom_password=None):
    try:
        ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD = generate_device_info(custom_password)
        uidb36 = reset_link.split("uidb36=")[1].split("&token=")[0]
        token = reset_link.split("&token=")[1].split(":")[0]

        url = "https://i.instagram.com/api/v1/accounts/password_reset/"
        data = {
            "source": "one_click_login_email",
            "uidb36": uidb36,
            "device_id": ANDROID_ID,
            "token": token,
            "waterfall_id": WATERFALL_ID
        }
        r = requests.post(url, headers=make_headers(user_agent=USER_AGENT), data=data)

        if "user_id" not in r.text:
            return {"success": False, "error": f"Error in reset request: {r.text}"}

        mid = r.headers.get("Ig-Set-X-Mid")
        resp_json = r.json()
        user_id = resp_json.get("user_id")
        cni = resp_json.get("cni")
        nonce_code = resp_json.get("nonce_code")
        challenge_context = resp_json.get("challenge_context")

        url2 = "https://i.instagram.com/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/"
        data2 = {
            "user_id": str(user_id),
            "cni": str(cni),
            "nonce_code": str(nonce_code),
            "bk_client_context": '{"bloks_version":"e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd","styles_id":"instagram"}',
            "challenge_context": str(challenge_context),
            "bloks_versioning_id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
            "get_challenge": "true"
        }
        r2 = requests.post(url2, headers=make_headers(mid, USER_AGENT), data=data2).text

        challenge_context_final = (
            r2.replace('\\', '')
            .split(f'(bk.action.i64.Const, {cni}), "')[1]
            .split('", (bk.action.bool.Const, false)))')[0]
        )

        data3 = {
            "is_caa": "False",
            "source": "",
            "uidb36": "",
            "error_state": {"type_name": "str", "index": 0, "state_id": 1048583541},
            "afv": "",
            "cni": str(cni),
            "token": "",
            "has_follow_up_screens": "0",
            "bk_client_context": {
                "bloks_version": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
                "styles_id": "instagram"
            },
            "challenge_context": challenge_context_final,
            "bloks_versioning_id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
            "enc_new_password1": PASSWORD,
            "enc_new_password2": PASSWORD
        }

        requests.post(url2, headers=make_headers(mid, USER_AGENT), data=data3)
        new_password = PASSWORD.split(":")[-1]

        return {
            "success": True,
            "password": new_password,
            "user_id": user_id
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    chat_id = input("Enter Telegram Chat ID: ").strip()
    bot_token = input("Enter Telegram Bot Token: ").strip()

    email = input("Enter Email: ").strip()
    reset_link = input("Enter Reset Link: ").strip()
    custom_password = input("Enter New Password (leave blank to auto-generate): ").strip()
    print()

    result = reset_instagram_password(reset_link, custom_password if custom_password else None)

    if result.get("success"):
        user_id = result.get("user_id")
        new_password = result.get("password")
        username = id_user(user_id)

        msg = (
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"   WEYN INSTAGRAM RESET PASS\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"USERNAME ➪  {username}\n"
            f"EMAIL ➪  {email}\n"
            f"NEW PASSWORD ➪  {new_password}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"        BY: @jinbelowg\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        print(msg)
        send_telegram(bot_token, chat_id, msg)
        print("\nDone.")
    else:
        print("Failed:", result.get("error", "Unknown error"))


if __name__ == "__main__":
    main()
