"""Client MCP stdio dùng chung cho các script trong tools/.

Dùng:
    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from mcp_client import McpClient, connect, ROOT

    mcp = connect("yeu-author")          # đọc command/args/env từ .mcp.json
    ok, data = mcp.tool("login")
    mcp.close()

Ghi chú bảo mật: .mcp.json là ranh giới tin cậy (file local, gitignored, và
vốn chứa `command` được thực thi trực tiếp). Lớp chặn env dưới đây chỉ là
defense-in-depth cho trường hợp tương lai script chạy với config không
tin cậy (CI, config tải về...) — không phải lá chắn chính.
"""
import json
import os
import queue
import subprocess
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Các biến môi trường có thể chiếm quyền process con (preload/option injection).
DANGEROUS_ENV_PREFIXES = (
    "LD_", "DYLD_", "PYTHONPATH", "PYTHONSTARTUP", "NODE_OPTIONS",
    "PERL5OPT", "RUBYOPT", "BASH_ENV", "GCONV_PATH", "GIT_SSH_COMMAND",
)


def _safe_env(env_extra):
    for k in env_extra:
        if any(k.upper().startswith(p) for p in DANGEROUS_ENV_PREFIXES):
            raise ValueError(f"Chặn biến môi trường nguy hiểm từ config: {k}")
    return env_extra


class McpClient:
    """Nói chuyện với một MCP server qua stdio JSON-RPC (line-delimited)."""

    def __init__(self, command, args, env_extra=None, client_name="tools-script"):
        env = {**os.environ, **_safe_env(env_extra or {})}
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
            "clientInfo": {"name": client_name, "version": "1.0"},
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
        """Gọi tool. Trả (ok, payload) — payload là JSON đã parse nếu có thể."""
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


def load_config():
    """Đọc .mcp.json ở root dự án."""
    with open(os.path.join(ROOT, ".mcp.json"), encoding="utf-8") as f:
        return json.load(f)


def connect(server_name, client_name=None):
    """Spawn MCP server theo tên trong .mcp.json và trả về client đã handshake."""
    sc = load_config()["mcpServers"][server_name]
    return McpClient(
        sc["command"], sc["args"], sc.get("env", {}),
        client_name or f"tools-{server_name}",
    )
