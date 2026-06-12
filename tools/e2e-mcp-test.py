# E2E driver: drive cả 2 MCP server qua stdio JSON-RPC, đánh vào backend thật.
# Chạy: python tools/e2e-mcp-test.py  (backend phải đang chạy ở :3009)
import json
import os
import subprocess
import sys
import threading
import queue

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "http://localhost:3009/api"
EMAIL = "e2e-author@test.local"
PASSWORD = "E2eTest!2026"

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  -- {detail}" if detail else ""))


class McpClient:
    def __init__(self, script, env_extra):
        env = {**os.environ, **env_extra}
        self.proc = subprocess.Popen(
            ["node", script], cwd=ROOT, env=env,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8",
        )
        self.q = queue.Queue()
        self._id = 0
        threading.Thread(target=self._reader, daemon=True).start()
        self.request("initialize", {
            "protocolVersion": "2025-03-26", "capabilities": {},
            "clientInfo": {"name": "e2e", "version": "1.0"},
        })
        self.notify("notifications/initialized")

    def _reader(self):
        for line in self.proc.stdout:
            line = line.strip()
            if line:
                try:
                    self.q.put(json.loads(line))
                except json.JSONDecodeError:
                    pass

    def _send(self, msg):
        self.proc.stdin.write(json.dumps(msg) + "\n")
        self.proc.stdin.flush()

    def notify(self, method, params=None):
        self._send({"jsonrpc": "2.0", "method": method, **({"params": params} if params else {})})

    def request(self, method, params=None, timeout=30):
        self._id += 1
        rid = self._id
        self._send({"jsonrpc": "2.0", "id": rid, "method": method, **({"params": params} if params else {})})
        while True:
            msg = self.q.get(timeout=timeout)
            if msg.get("id") == rid:
                return msg

    def tool(self, name, args=None, timeout=30):
        """Gọi tool, trả (ok, payload). payload = JSON đã parse từ text content."""
        res = self.request("tools/call", {"name": name, "arguments": args or {}}, timeout)
        if "error" in res:
            return False, res["error"]
        result = res["result"]
        if result.get("isError"):
            return False, result.get("content")
        try:
            return True, json.loads(result["content"][0]["text"])
        except Exception:
            return True, result.get("content")

    def close(self):
        try:
            self.proc.stdin.close()
            self.proc.terminate()
        except Exception:
            pass


def read_agent_key():
    with open(os.path.join(ROOT, "apps/backend/.env"), encoding="utf-8") as f:
        for line in f:
            if line.startswith("AGENT_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("AGENT_API_KEY not found in apps/backend/.env")


SKIP_AUTHOR = bool(os.environ.get("SKIP_AUTHOR"))

print("=== 1. mcp-author: login -> tao truyen -> tao/sua chuong ===")
if SKIP_AUTHOR:
    print("  (bo qua — SKIP_AUTHOR dat, phan nay da pass o lan chay truoc)")
if not SKIP_AUTHOR:
    author = McpClient("tools/mcp-author/index.js", {
        "YEU_API_URL": API, "YEU_EMAIL": EMAIL, "YEU_PASSWORD": PASSWORD,
    })

    ok, user = author.tool("login")
    check("login", ok and user.get("user", {}).get("username") == "e2e_author", str(user)[:200])

    ok, me = author.tool("whoami")
    check("whoami", ok and (me.get("user", me) or {}).get("email") == EMAIL, str(me)[:200])

    ok, story = author.tool("create_story", {
        "title": "Đại Mạc Phong Vân E2E",
        "description": "Truyện test e2e qua MCP — sẽ xoá.",
        "tags": ["e2e", "test"],
    })
    slug = story.get("slug") if ok else None
    story_id = story.get("id") if ok else None
    check("create_story", ok and bool(slug), str(story)[:200])
    check("slug tieng Viet dung (dai-mac-phong-van-e2e)", slug is not None and slug.startswith("dai-mac-phong-van-e2e"), f"slug={slug}")

    ok, mylist = author.tool("list_my_stories", {"limit": 50})
    items = mylist.get("data", mylist) if ok else []
    if isinstance(items, dict):
        items = items.get("data", [])
    check("list_my_stories chua truyen vua tao", ok and any(s.get("id") == story_id for s in items), f"{len(items)} stories")

    ok, ch = author.tool("create_chapter", {
        "storySlug": slug,
        "title": "Chương 1: Khởi đầu nơi sa mạc",
        "content": "<p>Gió cát mịt mù, một bóng người chậm rãi bước đi giữa sa mạc vô tận. "
        "Hoàng hôn nhuộm đỏ cả chân trời, từng đợt gió nóng cuốn theo cát vàng phủ kín dấu chân phía sau. "
        "Không ai biết hắn từ đâu đến, cũng không ai biết hắn sẽ đi về đâu.</p>",
    })
    ch_id = ch.get("id") if ok else None
    check("create_chapter", ok and bool(ch_id), str(ch)[:200])
    check("chapter slug tieng Viet", ok and str(ch.get("slug", "")).startswith("chuong-1-khoi-dau-noi-sa-mac"), f"slug={ch.get('slug') if ok else None}")

    ok, chapters = author.tool("list_chapters", {"storySlug": slug})
    arr = chapters if isinstance(chapters, list) else (chapters.get("data", []) if ok else [])
    check("list_chapters", ok and any(c.get("id") == ch_id for c in arr), f"{len(arr)} chapters")

    ok, full = author.tool("get_chapter", {"storySlug": slug, "chapterSlug": ch.get("slug")})
    old_content = (full.get("content") or "") if ok else ""
    check("get_chapter doc noi dung", ok and "Gió cát" in old_content, str(full)[:150])

    ok, upd = author.tool("update_chapter", {
        "storySlug": slug, "chapterId": ch_id,
        "content": old_content + "<p>Hắn tên là Lăng Thiên, kiếm khách cuối cùng của Đại Mạc.</p>",
    })
    check("update_chapter noi them noi dung", ok, str(upd)[:200])

    ok, full2 = author.tool("get_chapter", {"storySlug": slug, "chapterSlug": ch.get("slug")})
    check("noi dung sau update co ca cu lan moi", ok and "Gió cát" in (full2.get("content") or "") and "Lăng Thiên" in (full2.get("content") or ""))

    author.close()

print("=== 2. user gui bug qua REST (nhu web/app) ===")
import urllib.request

def rest(method, path, token=None, body=None, api_key=None):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("X-Client-Type", "mobile")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    if api_key:
        req.add_header("x-api-key", api_key)
    data = json.dumps(body).encode() if body else None
    try:
        with urllib.request.urlopen(req, data=data) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

import time

token = None
for attempt in range(6):
    st, login_body = rest("POST", "/auth/login", body={"emailOrUsername": EMAIL, "password": PASSWORD})
    token = ((login_body.get("data") or login_body) or {}).get("accessToken")
    if token:
        break
    print(f"  ... login bi throttle (status={st}), cho 20s roi thu lai ({attempt + 1}/6)")
    time.sleep(20)
st, bug = rest("POST", "/bug-reports", token=token, body={
    "title": "E2E: nút lưu không hoạt động",
    "description": "Các bước: 1. Mở trang viết chương. 2. Nhấn Lưu. 3. Không có gì xảy ra.",
    "platform": "ANDROID", "severity": "HIGH", "deviceInfo": "e2e-harness",
})
bug_data = bug.get("data") or bug
bug_id = bug_data.get("id")
check("POST /bug-reports (JWT)", st == 201 and bool(bug_id), f"status={st}")

st, _ = rest("GET", "/agent/bug-reports")
check("agent endpoint khong key -> 401", st == 401, f"status={st}")
st, _ = rest("GET", "/agent/bug-reports", api_key="sai-key")
check("agent endpoint sai key -> 401", st == 401, f"status={st}")

print("=== 3. mcp-bug-reports: AI doc & xu ly bug qua API key ===")
bugs = McpClient("tools/mcp-bug-reports/index.js", {
    "BUG_API_URL": API, "BUG_API_KEY": read_agent_key(),
})

ok, lst = bugs.tool("list_bug_reports", {"status": "OPEN", "platform": "ANDROID"})
found = ok and any(b.get("id") == bug_id for b in lst.get("data", []))
check("list_bug_reports loc OPEN+ANDROID thay bug", found, f"total={lst.get('meta', {}).get('total') if ok else '?'}")

ok, detail = bugs.tool("get_bug_report", {"id": bug_id})
check("get_bug_report chi tiet + nguoi bao", ok and detail.get("reporter", {}).get("username") == "e2e_author", str(detail)[:150])

ok, upd = bugs.tool("update_bug_report", {"id": bug_id, "status": "IN_PROGRESS", "adminNote": "AI đang điều tra."})
check("update -> IN_PROGRESS", ok and upd.get("status") == "IN_PROGRESS")

ok, upd = bugs.tool("update_bug_report", {"id": bug_id, "status": "RESOLVED", "adminNote": "Nguyên nhân: thiếu handler onClick. Đã fix."})
check("update -> RESOLVED co resolvedAt", ok and upd.get("status") == "RESOLVED" and bool(upd.get("resolvedAt")))

bugs.close()

print(f"\n=== KET QUA: {len(PASS)} pass / {len(FAIL)} fail ===")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
