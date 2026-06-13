# Gửi yêu cầu phê duyệt STORY_PUBLISH cho truyện qua mcp-author.
# Dùng: python tools/request-approval.py <storyId> [message]
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient, connect, ROOT  # noqa: E402
import json

story_id = sys.argv[1]
message = sys.argv[2] if len(sys.argv) > 2 else None

mcp = connect("yeu-author")
ok, _ = mcp.tool("login")
print("login:", "OK" if ok else "FAIL")
args = {"storyId": story_id}
if message:
    args["message"] = message
ok, res = mcp.tool("request_story_approval", args)
print("request_approval:", "OK" if ok else "FAIL", "--", str(res)[:300])
mcp.close()
