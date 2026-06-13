# Gán bìa cho truyện Ác Nữ Hồi Quy trên production + ghi credit ảnh CC BY-SA.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient, connect, ROOT  # noqa: E402
import json

STORY_ID = "cmqbn5vd2000gss96k4cexzms"
SLUG = "ac-nu-hoi-quy-he-thong-ep-toi-lam-nguoi-tot"
COVER = os.path.join(ROOT, "tools", "cover-acnu.jpg")
CREDIT = (
    "\n\n—\nẢnh bìa: “Chinese Princess dress (Quedi)” — Patrick Theiner, "
    "CC BY-SA 2.0, Wikimedia Commons."
)

mcp = connect("yeu-author")
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
