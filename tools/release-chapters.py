# Đăng N chương nháp cũ nhất của truyện qua mcp-author.
# Dùng: python tools/release-chapters.py <storySlug> [N=1]
import json
import os
import subprocess
import sys
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
            "clientInfo": {"name": "release", "version": "1.0"},
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

    def request(self, method, params=None, timeout=60):
        self._id += 1
        rid = self._id
        self._send({"jsonrpc": "2.0", "id": rid, "method": method, **({"params": params} if params else {})})
        while True:
            msg = self.q.get(timeout=timeout)
            if msg.get("id") == rid:
                return msg

    def tool(self, name, args=None, timeout=60):
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


slug = sys.argv[1]
count = int(sys.argv[2]) if len(sys.argv) > 2 else 1

cfg = json.load(open(os.path.join(ROOT, ".mcp.json"), encoding="utf-8"))
ac = cfg["mcpServers"]["yeu-author"]
mcp = McpClient(ac["command"], ac["args"], ac.get("env", {}))

ok, _ = mcp.tool("login")
if not ok:
    raise SystemExit("login FAIL")

ok, chapters = mcp.tool("list_chapters", {"storySlug": slug})
if not ok:
    raise SystemExit(f"list_chapters FAIL: {chapters}")
arr = chapters if isinstance(chapters, list) else chapters.get("data", [])
arr = sorted(arr, key=lambda c: c.get("order", 0))

drafts = [c for c in arr if not c.get("isPublished")]
published = [c for c in arr if c.get("isPublished")]
print(f"Truyện {slug}: {len(published)} chương đã đăng, {len(drafts)} nháp")

for c in drafts[:count]:
    ok, res = mcp.tool("publish_chapter", {"storySlug": slug, "chapterId": c["id"], "publish": True})
    status = "ĐÃ ĐĂNG" if ok else f"FAIL — {res}"
    print(f"  [{c.get('order')}] {c.get('title')}: {status}")

remaining = len(drafts) - min(count, len(drafts))
print(f"Còn lại {remaining} chương nháp buffer.")
mcp.close()
