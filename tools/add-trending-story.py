# Thêm truyện gốc theo trend "ác nữ hồi quy + hệ thống" vào trang qua mcp-author.
# Nội dung 100% sáng tác mới — không sao chép tác phẩm có bản quyền.
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
            "clientInfo": {"name": "add-story", "version": "1.0"},
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


TITLE = "Ác Nữ Hồi Quy: Hệ Thống Ép Tôi Làm Người Tốt"

DESCRIPTION = (
    "Vân Khê — ác nữ khét tiếng nhất Đại Lương, kẻ cả kinh thành nguyền rủa — "
    "bị xử trảm giữa pháp trường trong tiếng hò reo của muôn dân.\n\n"
    "Mở mắt ra, nàng quay về ba năm trước, thời điểm mọi tội danh còn chưa kịp "
    "ụp xuống đầu. Kèm theo đó là một giọng nói lảnh lót trong đầu:\n\n"
    "「Chào ký chủ! Hệ Thống Cải Tà Quy Chính xin phép được phục vụ. Chỉ tiêu: "
    "1000 điểm thiện lương. Không đạt — hồn phi phách tán!」\n\n"
    "Làm người tốt? Được thôi. Nhưng hệ thống ơi, không ai quy định người tốt "
    "thì không được... dọa cho kẻ ác sợ mất mật, đúng không?\n\n"
    "Truyện sáng tác gốc theo phong cách nữ phản diện hồi quy — nữ cường, hài "
    "hước, đứng đầu xu hướng 2026."
)

TAGS = ["Ngôn Tình", "Huyền Huyễn", "Nữ Cường", "Hệ Thống", "Trọng Sinh", "Hài Hước", "Cổ Đại", "Lãng Mạn"]

CH1_TITLE = "Chương 1: Chết rồi mới biết mình là ác nữ"
CH1 = """<p>Tiếng trống pháp trường vang lên ba hồi, đục và nặng như đất đổ xuống quan tài.</p>
<p>Vân Khê quỳ giữa đài cao, tóc xõa rối che nửa gương mặt từng được khen là đẹp nhất kinh thành. Dưới kia, muôn dân chen chúc, người ném rau thối, kẻ ném cả giày rách. Họ gào lên hai chữ mà ba năm qua nàng nghe đến thuộc lòng: ác nữ.</p>
<p>Ác nữ Vân Khê — hãm hại trung lương, đầu độc thái tử phi, thiêu rụi kho lương cứu đói. Mười tám tội danh, tội nào cũng đáng chết.</p>
<p>Buồn cười ở chỗ, chính nàng cũng chỉ mới biết mình "làm" những chuyện đó khi nghe quan tuyên án đọc to trước pháp trường.</p>
<p>"Còn lời nào muốn nói không?" — giám trảm quan hỏi, giọng đều đều như đã hỏi câu này cả trăm lần.</p>
<p>Vân Khê ngẩng đầu, môi khô nứt nhưng vẫn cong lên thành một nụ cười: "Có. Kiếp sau, ta sẽ không ngu như kiếp này nữa."</p>
<p>Đao rơi.</p>
<p>Không đau như nàng tưởng. Chỉ thấy thế giới tối sầm, rồi — </p>
<p>"Tiểu thư! Tiểu thư dậy đi, hôm nay phải vào cung dự yến!"</p>
<p>Vân Khê bật dậy như bị bỏng, tay ôm chặt cổ. Còn nguyên. Đầu còn dính trên cổ, tim còn đập thình thịch, và trước mặt là khuôn mặt tròn xoe quen thuộc của nha hoàn Tiểu Đào — đứa nha hoàn đã chết để bảo vệ nàng vào năm ngoái... không, vào hai năm sau.</p>
<p>Tấm gương đồng trên bàn trang điểm phản chiếu một gương mặt mười sáu tuổi, chưa có vết sẹo nơi đuôi mày trái.</p>
<p>Yến tiệc mùa xuân năm Cảnh Hòa thứ chín. Ba năm trước ngày nàng mất đầu. Thời điểm mọi thứ bắt đầu.</p>
<p>Nàng... quay về rồi.</p>
<p>「Tinh! Chào ký chủ Vân Khê!」 — một giọng nói lảnh lót vang thẳng trong đầu, vui vẻ đến phát bực. — 「Hệ Thống Cải Tà Quy Chính số hiệu 707 chính thức kích hoạt! Nhiệm vụ của ký chủ: tích lũy 1000 điểm thiện lương trong ba năm. Thành công — sống tiếp, đổi vận. Thất bại — lịch sử lặp lại, pháp trường chờ sẵn!」</p>
<p>Vân Khê nhắm mắt, hít một hơi thật sâu. Được. Quay về đã đủ kỳ quái, thêm một con ma biết nói trong đầu cũng chẳng kỳ quái hơn bao nhiêu.</p>
<p>"Điểm thiện lương," nàng hỏi thầm, "tính kiểu gì?"</p>
<p>「Làm việc tốt là có điểm! Cứu người: 10 điểm. Quyên góp: 5 điểm. Nhường nhịn tha thứ: 3 điểm. Lưu ý: hành vi độc ác sẽ BỊ TRỪ điểm gấp đôi!」</p>
<p>"Vậy nếu ta dọa cho một kẻ ác sợ đến mức hắn tự bỏ làm việc ác, tính là cộng hay trừ?"</p>
<p>Hệ thống 707 im lặng mất ba giây. 「...Để bản hệ thống tra cứu điều khoản.」</p>
<p>Vân Khê cười, chậm rãi búi tóc lên trước gương. Trong trí nhớ của nàng, tại yến tiệc hôm nay, biểu muội Vân Nhu sẽ "vô tình" trượt chân đẩy nàng ngã vào người Tam hoàng tử, mở màn cho chuỗi mười tám tội danh oan khuất kéo dài ba năm.</p>
<p>Kiếp trước nàng ngu ngơ để mặc người ta viết kịch bản. Kiếp này, xin lỗi — cây bút đổi chủ rồi.</p>
<p>"Tiểu Đào," nàng nói, giọng dịu dàng làm con bé sững người, "chuẩn bị xe. À, với lấy cho ta bộ váy đỏ."</p>
<p>"Váy... váy đỏ ạ? Nhưng phu nhân dặn tiểu thư mặc màu nhạt cho hợp lễ—"</p>
<p>"Người tốt," Vân Khê nhìn vào gương, nơi đôi mắt phượng đang sáng lên thứ ánh sáng khiến chính nàng cũng thấy lạ lẫm, "thì mặc màu gì cũng vẫn là người tốt."</p>
<p>Trong đầu, hệ thống 707 yếu ớt lên tiếng: 「Ký chủ... sao bản hệ thống thấy hơi sợ nhỉ?」</p>"""

CH2_TITLE = "Chương 2: Việc tốt đầu tiên, dọa người đầu tiên"
CH2 = """<p>Yến tiệc mùa xuân của hoàng cung Đại Lương, hoa hạnh rơi trắng cả sân điện.</p>
<p>Vân Khê bước xuống xe ngựa trong bộ váy đỏ rực như lửa, lập tức hút hết ánh nhìn của đám quý nữ đang xúng xính các tông màu phấn nhạt. Có tiếng xì xào. Nàng nghe rõ từng chữ — "kiêu căng", "phô trương", "đúng là con gái nhà tướng quân, thô lỗ".</p>
<p>Kiếp trước, những lời này từng làm nàng đỏ mặt cúi đầu. Kiếp này, nàng chỉ thấy buồn cười. Người sắp mất đầu một lần rồi thì da mặt dày lắm, mấy mũi kim này đâm không thủng.</p>
<p>「Ký chủ! Phát hiện cơ hội thiện lương!」 — hệ thống 707 reo lên. — 「Phía hồ sen, một cung nữ sắp bị trách phạt oan vì làm vỡ chén ngọc! Ra tay cứu giúp: +10 điểm!」</p>
<p>Vân Khê liếc mắt. Bên hồ sen, một cung nữ nhỏ đang quỳ rạp dưới chân một ma ma mặt mỏng, bên cạnh là mảnh chén vỡ. Và cách đó ba bước — nàng nheo mắt — biểu muội Vân Nhu của nàng đang đứng, tay áo còn vương một giọt trà.</p>
<p>À. Hóa ra chén đó là Vân Nhu làm vỡ, rồi tiện tay đẩy cho cung nữ. Nét diễn quen thuộc. Kiếp trước biểu muội nàng diễn vở này suốt ba năm mà nàng không nhận ra.</p>
<p>Nàng thong thả đi tới. "Ma ma định phạt người sao?"</p>
<p>Ma ma kia thấy váy đỏ thì khựng lại, nhận ra ai thì lập tức cười nhạt: "Vân đại tiểu thư. Nô tì làm vỡ chén ngự dụng, theo quy củ phải—"</p>
<p>"Quy củ hay lắm." Vân Khê gật đầu tán thưởng, rồi đột nhiên nghiêng người, nhặt mảnh chén vỡ lên soi dưới nắng. "Chén ngọc Lưu Ly, men trong như nước. Mà lạ thật, vết trà trên mảnh vỡ còn ấm, lại là trà ô long ướp quế — thứ trà này cả yến tiệc chỉ bưng cho hàng quý nữ, cung nữ làm sao chạm tới?"</p>
<p>Nàng quay sang, mắt phượng cong cong nhìn thẳng Vân Nhu: "Biểu muội, muội uống trà gì thế?"</p>
<p>Mặt Vân Nhu trắng bệch. "Tỷ... tỷ tỷ nói gì lạ vậy, muội không hiểu..."</p>
<p>"Không hiểu thì thôi." Vân Khê cười tươi rói, đặt mảnh chén vào tay ma ma. "Ma ma cứ điều tra cho kỹ. À mà, bổn tiểu thư nghe nói hình phạt cho tội vu oan giá họa trong cung là hai mươi trượng? Chậc, da thịt con gái, đánh hai mươi trượng chắc nằm ba tháng. Đau lắm. Đau hơn cả... rơi đầu ấy chứ."</p>
<p>Câu cuối nàng nói rất khẽ, rất dịu, mà Vân Nhu run lên như bị tạt nước đá.</p>
<p>"Th-thôi!" Vân Nhu lắp bắp. "Là... là muội lỡ tay làm vỡ, định nói mà chưa kịp! Ma ma đừng phạt chị cung nữ này, là lỗi của muội!"</p>
<p>Cung nữ nhỏ được tha, dập đầu lia lịa với Vân Khê rồi chạy biến. Ma ma dẫn Vân Nhu đi "uống trà nói chuyện". Bên hồ sen chỉ còn lại Vân Khê đứng giữa hoa hạnh bay, lòng thư thái chưa từng có.</p>
<p>「Tinh! Cứu cung nữ thành công: +10 điểm thiện lương!」 — hệ thống vui vẻ thông báo, rồi ngập ngừng — 「Nhưng mà ký chủ này... hành vi "gợi ý hình phạt khiến mục tiêu sợ hãi tột độ"... bản hệ thống không biết nên trừ hay nên cộng...」</p>
<p>"Cộng chứ," Vân Khê nói, phủi nhẹ cánh hoa trên vai. "Ta vừa giúp biểu muội thành thật nhận lỗi. Giúp người hướng thiện — chẳng phải đó là cốt lõi của cải tà quy chính sao, hệ thống?"</p>
<p>「...707 cảm thấy giáo trình đào tạo của tổng bộ chưa bao quát trường hợp này.」</p>
<p>Đúng lúc đó, sau lưng vang lên một giọng nam trầm, nhàn nhạt mà rõ từng chữ:</p>
<p>"Trà ô long ướp quế, nhận ra trong một cái liếc mắt. Vân đại tiểu thư có con mắt thú vị đấy."</p>
<p>Vân Khê quay lại — và trông thấy người mà kiếp trước, cho đến tận lúc đao rơi, vẫn đứng ngoài mọi ân oán của nàng: Cửu hoàng tử Lý Thầm, kẻ cả kinh thành đồn là bệnh tật yếu ớt, không tranh không đoạt.</p>
<p>Cũng là kẻ duy nhất, trong trí nhớ mơ hồ cuối cùng nơi pháp trường, đã sai người ném xuống cho nàng một vò rượu ngon thay cho bát rượu đắng tiễn biệt.</p>"""

CH3_TITLE = "Chương 3: Hệ thống ơi, người tốt được phép giàu không?"
CH3 = """<p>"Cửu điện hạ." Vân Khê thu liễm nét cười, hành lễ đúng chuẩn mực một quý nữ — thứ lễ nghi mà kiếp trước nàng học mất ba tháng, kiếp này làm trong ba giây.</p>
<p>Lý Thầm khoác áo lông mỏng giữa tiết xuân, gương mặt nhợt nhạt đúng kiểu "bệnh tật triền miên" như lời đồn. Nhưng Vân Khê chết một lần rồi mới nhìn ra: đôi mắt kia không hề có lấy nửa phần yếu ớt. Đó là mắt của loại người đứng trong bóng tối xem cả bàn cờ.</p>
<p>"Bổn vương chỉ tò mò một chuyện," Lý Thầm nói, hơi nghiêng đầu. "Vân đại tiểu thư trong lời đồn ngang ngược kiêu căng, hôm nay sao lại đi cứu một cung nữ vô danh?"</p>
<p>"Điện hạ nghe đồn nhiều quá rồi." Vân Khê đáp, mặt không đổi sắc. "Thần nữ từ hôm nay quyết chí làm người tốt."</p>
<p>"Ồ? Vì sao?"</p>
<p>"Vì làm người xấu..." nàng ngừng một nhịp, nhớ tới lưỡi đao lạnh buốt sau gáy, "...không có kết cục tốt."</p>
<p>Lý Thầm nhìn nàng chăm chú hai giây, rồi bật cười khẽ — tiếng cười làm mấy cung nữ gần đó suýt làm rơi khay. Cửu hoàng tử bệnh tật trước nay chưa từng cười với ai.</p>
<p>"Hay. Vậy bổn vương chờ xem tiểu thư làm người tốt được bao lâu."</p>
<p>Hắn đi rồi, hệ thống 707 mới dè dặt lên tiếng: 「Ký chủ, cảnh báo: nhân vật Lý Thầm không có trong kịch bản gốc mà bản hệ thống được cấp. Dữ liệu về người này... trống trơn.」</p>
<p>"Trống trơn?" Vân Khê nhíu mày.</p>
<p>「Giống như có ai đó... xóa sạch.」</p>
<p>Thú vị. Nàng cất chi tiết đó vào lòng, xoay người đi về phía đại điện. Còn ba năm. Muốn sống, chỉ làm "người tốt" thôi chưa đủ — kiếp trước nàng chết không phải vì thiếu thiện lương, mà vì thiếu tiền, thiếu quyền, thiếu vây cánh, để mặc người ta muốn vu gì thì vu.</p>
<p>"Hệ thống, hỏi cái này: người tốt có được phép giàu không?"</p>
<p>「Hả? Được chứ ạ. Làm giàu chính đáng không vi phạm điều khoản.」</p>
<p>"Tốt." Vân Khê gật gù. "Vậy bắt đầu từ cửa hàng vải nhà họ Tô sắp phá sản ở phố Đông — kiếp trước ba tháng nữa nó bị thâu tóm với giá rẻ mạt, sau đó người chủ mới phát hiện dưới kho hàng có mạch nước khoáng nóng, một bước thành phú hộ. Kiếp này, mạch nước đó là của ta. À không—" nàng sửa lại, mắt sáng long lanh, "—ta sẽ mua giá cao gấp đôi, cứu cả nhà họ Tô khỏi cảnh màn trời chiếu đất. Việc tốt, đúng không? Cộng điểm, đúng không?"</p>
<p>「Đúng... đúng vậy...」 — hệ thống 707 trả lời mà giọng nghe như sắp khóc. — 「Nhưng sao bản hệ thống cảm giác ký chủ vừa làm việc thiện vừa... thu lợi khổng lồ?」</p>
<p>"Đấy gọi là song thắng, hệ thống ạ." Vân Khê bước vào đại điện, váy đỏ quét qua bậc thềm đá trắng như một đốm lửa nhỏ vừa châm vào cánh đồng khô. "Người tốt thời nay, phải tốt một cách có não."</p>
<p>Ba năm nữa, pháp trường đó nàng sẽ không quay lại.</p>
<p>Mà nếu có quay lại — thì cũng là đứng ở vị trí khác. Vị trí của người... cầm bút viết kịch bản.</p>
<p>— Hết chương 3 —</p>"""

cfg = json.load(open(os.path.join(ROOT, ".mcp.json"), encoding="utf-8"))
ac = cfg["mcpServers"]["yeu-author"]
mcp = McpClient(ac["command"], ac["args"], ac.get("env", {}))

ok, user = mcp.tool("login")
print("login:", "OK" if ok else f"FAIL {user}")

ok, story = mcp.tool("create_story", {
    "title": TITLE,
    "description": DESCRIPTION,
    "tags": TAGS,
})
if not ok:
    raise SystemExit(f"create_story FAIL: {story}")
slug = story["slug"]
print(f"create_story: OK — id={story['id']} slug={slug}")

# Lịch phát hành: mỗi ngày chỉ ra 1-2 chương. Hôm nay đăng chương 1-2,
# chương 3 giữ nháp cho ngày mai (cron daily-chapter sẽ đăng + viết tiếp).
PUBLISH_TODAY = 2

for i, (t, c) in enumerate([(CH1_TITLE, CH1), (CH2_TITLE, CH2), (CH3_TITLE, CH3)], 1):
    ok, ch = mcp.tool("create_chapter", {"storySlug": slug, "title": t, "content": c, "order": i})
    if not ok:
        raise SystemExit(f"create_chapter {i} FAIL: {ch}")
    print(f"chapter {i}: OK — {ch['slug']} ({ch.get('wordCount', '?')} từ)")
    if i <= PUBLISH_TODAY:
        ok, pub = mcp.tool("publish_chapter", {"storySlug": slug, "chapterId": ch["id"], "publish": True})
        print(f"  publish chương {i}:", "OK" if ok else f"FAIL — {pub}")
    else:
        print(f"  chương {i}: giữ nháp — đăng ngày mai")

mcp.close()
print("\nXong. Slug truyện:", slug)
