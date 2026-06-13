# Test 2 tool upload ảnh của mcp-author với backend LOCAL (:3009).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient, connect, ROOT  # noqa: E402
import json

mcp = McpClient("node", ["tools/mcp-author/index.js"], {
    "YEU_API_URL": "http://localhost:3009/api",
    "YEU_EMAIL": "e2e-author@test.local",
    "YEU_PASSWORD": "E2eTest!2026",
})

png = os.path.join(ROOT, "tools", "test-cover.png")

ok, res = mcp.tool("upload_chapter_image", {"source": png})
print("upload_chapter_image (file local):", "OK" if ok else "FAIL", "--", str(res)[:200])

ok, res = mcp.tool("upload_story_cover", {
    "storyId": "cmqbipg4y000ak1xgkctsujiy",
    "source": png,
})
print("upload_story_cover (file local):", "OK" if ok else "FAIL", "--", str(res)[:200])

mcp.close()
