# Smoke check: đọc .mcp.json local, kết nối từng MCP server qua stdio,
# gọi tool read-only để xác nhận chuỗi MCP -> backend production hoạt động.
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
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8",
        )
        self.q = queue.Queue()
        self._id = 0
        threading.Thread(target=self._reader, daemon=True).start()
        self.request("initialize", {
            "protocolVersion": "2025-03-26", "capabilities": {},
            "clientInfo": {"name": "connect-check", "version": "1.0"},
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

    def request(self, method, params=None, timeout=45):
        self._id += 1
        rid = self._id
        self._send({"jsonrpc": "2.0", "id": rid, "method": method, **({"params": params} if params else {})})
        while True:
            msg = self.q.get(timeout=timeout)
            if msg.get("id") == rid:
                return msg

    def tool(self, name, args=None, timeout=45):
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


cfg = json.load(open(os.path.join(ROOT, ".mcp.json"), encoding="utf-8"))
servers = cfg["mcpServers"]

print("=== bug-reports MCP -> production ===")
bc = servers["bug-reports"]
bugs = McpClient(bc["command"], bc["args"], bc.get("env", {}))
ok, out = bugs.tool("list_bug_reports", {"limit": 5})
if ok:
    meta = out.get("meta", {})
    print(f"  OK — ket noi thanh cong. Tong bug tren server: {meta.get('total')}")
    for b in out.get("data", [])[:5]:
        print(f"    - [{b.get('status')}/{b.get('severity')}] {b.get('title')} ({b.get('platform')})")
else:
    print(f"  FAIL — {out}")
bugs.close()

print("=== yeu-author MCP -> production ===")
ac = servers["yeu-author"]
author = McpClient(ac["command"], ac["args"], ac.get("env", {}))
ok, out = author.tool("login")
if ok:
    u = out.get("user", {})
    print(f"  OK login — user: {u.get('username')} (role {u.get('role')})")
    ok2, me = author.tool("whoami")
    print(f"  whoami: {'OK — ' + str((me.get('user', me) or {}).get('email')) if ok2 else 'FAIL — ' + str(me)}")
    ok3, lst = author.tool("list_my_stories", {"limit": 5})
    if ok3:
        data = lst.get("data", lst)
        if isinstance(data, dict):
            data = data.get("data", [])
        total = lst.get("meta", {}).get("total", len(data))
        print(f"  list_my_stories: OK — {total} truyen")
        for s in data[:5]:
            print(f"    - {s.get('title')} [{s.get('status')}] slug={s.get('slug')}")
    else:
        print(f"  list_my_stories: FAIL — {lst}")
else:
    print(f"  FAIL login — {out}")
author.close()
