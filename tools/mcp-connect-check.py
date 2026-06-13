# Smoke check: đọc .mcp.json local, kết nối từng MCP server qua stdio,
# gọi tool read-only để xác nhận chuỗi MCP -> backend production hoạt động.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient, connect, ROOT  # noqa: E402
import json

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
