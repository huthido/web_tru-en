# Gán bìa cho truyện Ác Nữ Hồi Quy trên production + ghi credit ảnh CC BY-SA.
import json
import os
import subprocess
import threading
import queue

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class McpClient:
    def __init__(self, command, args, env_extra):
        env = {**os.environ, **env_extra}
        self.proc = subprocess.Popen(
            [command, *args], cwd=ROOT, env=env,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8",
        )
        self.q = queue.Queue()
        self._id = 0
        threading.Thread(target=self._reader, daemon=True).start()
        self.request("initialize", {
            "protocolVersion": "2025-03-26", "capabilities": {},
            "clientInfo": {"name": "set-cover", "version": "1.0"},
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

    def request(self, method, params=None, timeout=120):
        self._id += 1
        rid = self._id
        self._send({"jsonrpc": "2.0", "id": rid, "method": method, **({"params": params} if params else {})})
        while True:
            msg = self.q.get(timeout=timeout)
            if msg.get("id") == rid:
                return msg

    def tool(self, name, args=None, timeout=120):
        res = self.request("tools/call", {"name": name, "arguments": args or {}}, timeout)
        if "error" in res:
            return False, res["error"].get("message", res["error"])
        result = res["result"]
        text = result["content"][0]["text"] if result.get("content") else ""
        if result.get("isError"):
            return False, text
        try:
            return True, json.loads(text)
        except Exception:
            return True, text

    def close(self):
        try:
            self.proc.stdin.close()
            self.proc.terminate()
        except Exception:
            pass


STORY_ID = "cmqbn5vd2000gss96k4cexzms"
SLUG = "ac-nu-hoi-quy-he-thong-ep-toi-lam-nguoi-tot"
COVER = os.path.join(ROOT, "tools", "cover-acnu.jpg")
CREDIT = (
    "\n\n—\nẢnh bìa: “Chinese Princess dress (Quedi)” — Patrick Theiner, "
    "CC BY-SA 2.0, Wikimedia Commons."
)

cfg = json.load(open(os.path.join(ROOT, ".mcp.json"), encoding="utf-8"))
ac = cfg["mcpServers"]["yeu-author"]
mcp = McpClient(ac["command"], ac["args"], ac.get("env", {}))

ok, _ = mcp.tool("login")
print("login:", "OK" if ok else "FAIL")

ok, res = mcp.tool("upload_story_cover", {"storyId": STORY_ID, "source": COVER})
print("upload_story_cover:", "OK" if ok else "FAIL", "--", str(res)[:200])

ok, story = mcp.tool("get_story", {"slugOrId": SLUG})
if ok:
    desc = story.get("description") or ""
    if "Patrick Theiner" not in desc:
        ok2, res2 = mcp.tool("update_story", {"storyId": STORY_ID, "description": desc + CREDIT})
        print("update_story (credit):", "OK" if ok2 else f"FAIL -- {res2}")
    else:
        print("credit đã có sẵn trong mô tả")
mcp.close()
