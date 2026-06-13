# -*- coding: utf-8 -*-
"""Nội dung trọn bộ "Ác Nữ Hồi Quy: Hệ Thống Ép Tôi Làm Người Tốt" — chương 4..15.
Arc hoàn chỉnh, sáng tác gốc. Chương 1-3 đã có sẵn trên production.
Dùng bởi push-full-story.py (tạo nháp + đặt lịch)."""

# Mỗi phần tử: (order, title, content_html)
CHAPTERS = [
    (4, "Chương 4: Mạch nước nóng và ván cờ đầu tiên",
     """<p>Phố Đông buổi sớm, sương còn đọng trên mái ngói. Cửa hàng vải nhà họ Tô treo tấm biển "sang nhượng" xiêu vẹo, bên trong ông chủ Tô tóc bạc đang ngồi thở dài trước chồng sổ nợ.</p>
<p>Vân Khê bước vào, váy đỏ quét qua ngưỡng cửa mục. "Ông chủ Tô, ta nghe nói cửa hàng định bán. Ta mua."</p>
<p>Ông lão ngẩng lên, mắt đục ngầu. "Tiểu thư nhà tướng quân? Cô... cô mua cái nơi sắp sập này làm gì? Người ta trả ba trăm lượng ta còn chê rẻ chẳng buồn bán, vì bán đi cả nhà ta ra đường."</p>
<p>"Ta trả sáu trăm." Vân Khê đặt một tờ ngân phiếu lên bàn. "Với một điều kiện: ông và người nhà ở lại, tiếp tục coi sóc cửa hàng, ăn lương của ta."</p>
<p>Ông lão sững sờ. Sáu trăm lượng — gấp đôi giá, lại còn giữ chỗ làm. Trên đời làm gì có chuyện tốt thế.</p>
<p>「Ký chủ!」 hệ thống 707 lập tức gào lên trong đầu nàng. 「Cứu cả một gia đình khỏi phá sản: +30 điểm! Nhưng... nhưng sao ký chủ trả gấp đôi giá thị trường? Bản hệ thống không hiểu logic kinh tế này!」</p>
<p>Vân Khê không đáp. Nàng biết thứ ông lão không biết: dưới nền kho hàng phía sau, có một mạch nước khoáng nóng. Kiếp trước, ba tháng sau một thương nhân mua rẻ cửa hàng này, đào móng xây lại thì trúng mạch, mở nhà tắm nước nóng, một năm thành phú hộ nức tiếng kinh thành.</p>
<p>Kiếp này, mạch nước đó là của nàng. Nhưng nàng không cướp trắng của nhà họ Tô — nàng trả gấp đôi, giữ họ lại, chia họ một phần lợi sau này. Vừa được điểm thiện lương, vừa được mạch vàng, vừa được lòng người.</p>
<p>"Ông chủ Tô," nàng nói, "ba tháng nữa, nếu ta nói nơi này sẽ thành mỏ vàng, ông tin không?"</p>
<p>Ông lão cười khổ. "Tiểu thư nói đùa."</p>
<p>"Ta không bao giờ đùa chuyện tiền." Vân Khê mỉm cười. "Cho người đào thử nền kho sau. Đào sâu ba thước về phía góc Đông Nam."</p>
<p>Nửa canh giờ sau, tiếng reo hò vang lên từ sân sau. Hơi nước nóng bốc lên nghi ngút từ mạch ngầm vừa lộ ra, trong vắt, thoảng mùi khoáng. Ông lão Tô quỳ sụp xuống, run rẩy nhìn Vân Khê như nhìn thần tiên.</p>
<p>"Tiểu thư... cô là người hay là tiên?"</p>
<p>"Ta là người." Vân Khê nhặt tờ khế ước lên, thổi khô mực. "Một người tốt biết tính toán. Đứng dậy đi, ông chủ Tô. Chúng ta có một nhà tắm nước nóng đệ nhất kinh thành phải xây."</p>
<p>「+30 điểm thiện lương. Tổng: 40/1000.」 Hệ thống 707 ngập ngừng. 「Ký chủ, bản hệ thống tính ra ký chủ vừa kiếm được khoản lời gấp hai mươi lần vốn... Đây thật sự là làm việc thiện ạ?」</p>
<p>"Người nhà họ Tô từ ăn mày thành cổ đông. Dân kinh thành sắp có chỗ tắm nước nóng chữa bệnh. Ta có vốn để làm việc lớn hơn." Vân Khê bước ra cửa, nắng sớm đổ lên vai. "Ba bên đều lợi. Hệ thống, đó gọi là làm việc thiện ở quy mô lớn."</p>
<p>Phía bên kia đường, dưới bóng một tàng cây, một chiếc xe ngựa sang trọng đỗ im lìm. Sau rèm xe, Cửu hoàng tử Lý Thầm khẽ nhếch môi, ngón tay gõ nhẹ lên thành cửa.</p>
<p>"Sáu trăm lượng đổi một mạch nước nóng và lòng dân cả khu phố. Vân đại tiểu thư..." hắn lẩm bẩm, mắt sáng lên thứ ánh sáng không hề giống một kẻ bệnh tật, "...nàng biết trước có mạch nước đó. Thú vị thật. Càng lúc càng giống ta."</p>"""),

    (5, "Chương 5: Biểu muội không chịu thua",
     """<p>Tin Vân Khê mua lại cửa hàng vải nhà họ Tô và đào trúng mạch nước nóng lan khắp kinh thành chỉ trong ba ngày. Người ta bắt đầu xì xào theo hướng khác: "Vân đại tiểu thư đổi tính rồi", "Nghe nói cô ấy còn giữ cả nhà họ Tô lại, tử tế ghê".</p>
<p>Trong phủ tướng quân, biểu muội Vân Nhu nghe những lời này mà móng tay bấm trắng cả lòng bàn tay.</p>
<p>Kiếp này có gì đó không đúng. Vân Khê đáng lẽ phải càng ngày càng kiêu ngạo, càng gây thù chuốc oán, để rồi từng bước rơi vào cái bẫy mà nàng — Vân Nhu — đã dệt sẵn. Nhưng người tỷ tỷ này như biến thành một người khác: sắc bén, điềm tĩnh, và đáng sợ.</p>
<p>"Không sao," Vân Nhu tự nhủ. "Chỉ cần một vết nhơ đủ lớn, danh tiếng mới gây dựng của ngươi sẽ sụp trong một đêm."</p>
<p>Cơ hội đến vào tiệc mừng thọ Lão phu nhân Trấn quốc công. Giữa tiệc, Vân Nhu "vô tình" làm đổ một chén rượu lên áo một vị tiểu thư con nhà quyền quý, rồi khóc lóc đổ vấy: "Là tỷ tỷ đẩy muội! Tỷ ấy ghét muội từ lâu rồi!"</p>
<p>Cả đại sảnh quay nhìn Vân Khê. Đây là kịch bản quen thuộc — kiếp trước, chính trò này đã gắn cho nàng tội danh "ngỗ ngược, đố kỵ, hãm hại tỷ muội".</p>
<p>「Cảnh báo!」 hệ thống 707 hốt hoảng. 「Nếu ký chủ nổi giận cãi nhau, sẽ bị quy là hành vi xấu, TRỪ điểm! Bình tĩnh!」</p>
<p>Vân Khê không nổi giận. Nàng thậm chí còn mỉm cười, bước tới, rút khăn lụa của mình ra, dịu dàng lau vết rượu trên áo vị tiểu thư kia.</p>
<p>"Muội xin lỗi thay cho biểu muội. Vân Nhu vụng về từ nhỏ, tay chân lóng ngóng." Nàng quay sang Vân Nhu, ánh mắt hiền hòa nhưng giọng nói rõ từng chữ. "Biểu muội, lần trước ở yến tiệc trong cung muội cũng làm đổ trà, lần này lại đổ rượu. Hay là... mắt muội có vấn đề? Để tỷ mời thái y đến khám cho muội. Bệnh ở mắt mà không chữa, sau này gả vào nhà người ta, lỡ làm đổ vỡ đồ quý của nhà chồng thì khổ cả đời."</p>
<p>Cả sảnh lặng đi một thoáng, rồi có người bật cười khúc khích. Lời nàng nói dịu như nước, nhưng từng câu đều ghim Vân Nhu vào hai chữ: vụng về, vô dụng. Mà một tiểu thư chưa gả mà bị đồn "vụng về, hay làm đổ vỡ" thì còn ai dám rước.</p>
<p>Mặt Vân Nhu trắng bệch rồi đỏ bừng. "Ta... ta không có bệnh!"</p>
<p>"Không có bệnh mà làm đổ hai lần?" Vân Khê chớp mắt ngây thơ. "Vậy là cố ý rồi? Cố ý hất rượu vào khách quý của Lão phu nhân giữa tiệc thọ? Biểu muội, muội gan thật đấy."</p>
<p>Vân Nhu cứng họng. Tiến không được, lùi không xong — nhận vụng về thì mất danh, nhận cố ý thì mất mạng. Cuối cùng nàng chỉ biết bưng mặt chạy khỏi đại sảnh trong tiếng cười rì rầm.</p>
<p>「Ký chủ hóa giải vu oan + bảo vệ thể diện khách: +15 điểm. Tổng: 55/1000.」 Hệ thống 707 thở dài. 「Nhưng bản hệ thống lại thấy biểu muội bị ký chủ dồn đến đường cùng... Đây vẫn tính là thiện ạ?」</p>
<p>"Ta đâu có chửi nàng câu nào. Ta còn đề nghị mời thái y khám bệnh cho nàng cơ mà." Vân Khê nhón một miếng bánh, cắn một góc. "Quan tâm sức khỏe biểu muội — đó chẳng phải là thiện ý sao?"</p>
<p>Cuối đại sảnh, Lý Thầm nâng chén rượu che đi nụ cười, lòng thầm nghĩ: con dao bọc trong lụa này, sắc hơn cả gươm.</p>"""),

    (6, "Chương 6: Người cũng quay về",
     """<p>Nhà tắm nước nóng "Tô Tuyền Các" khai trương, khách nườm nượp. Vân Khê trích một phần lớn doanh thu mở một quầy cháo từ thiện trước cửa, mỗi sáng phát cháo nóng cho người nghèo.</p>
<p>「+5 điểm mỗi ngày phát cháo. Tổng đang tăng đều.」 Hệ thống 707 dạo này đã bớt hoảng, thậm chí còn hơi vui. 「Ký chủ, dân kinh thành bắt đầu gọi ký chủ là 'Vân Bồ Tát' rồi đấy.」</p>
<p>"Bồ Tát biết kiếm tiền." Vân Khê khuấy nồi cháo, hơi nóng phả lên mặt. "Hệ thống, ta hỏi thật. Một nghìn điểm thiện lương — đổi được gì ngoài chuyện 'không chết'?"</p>
<p>707 im lặng một lúc lâu. 「...Bản hệ thống không được phép tiết lộ. Nhưng ký chủ, có một điều bản hệ thống thấy lạ. Theo dữ liệu gốc, lẽ ra đến giờ ký chủ đã vướng tội danh thứ nhất. Nhưng dòng thời gian đang... lệch đi. Như thể có người khác cũng đang thay đổi nó.」</p>
<p>Vân Khê dừng tay. "Người khác?"</p>
<p>Đúng lúc ấy, một giọng nói quen thuộc vang lên sau lưng. "Cháo của Vân Bồ Tát, kẻ bệnh tật như ta có phần không?"</p>
<p>Cửu hoàng tử Lý Thầm đứng đó, vẫn khoác áo lông dù trời đã ấm, gương mặt nhợt nhạt nhưng đôi mắt thì sắc như dao. Hắn tự múc cho mình một bát cháo, ngồi xuống chiếc ghế gỗ thô bên quầy như thể đó là chuyện thường tình.</p>
<p>"Điện hạ tôn quý, sao lại ăn cháo từ thiện của dân nghèo?" Vân Khê hỏi, mắt không rời hắn.</p>
<p>"Vì ta tò mò." Lý Thầm thổi bát cháo. "Tò mò một ác nữ khét tiếng, trong một đêm, lại biến thành Bồ Tát biết đào mạch nước nóng, biết bắt bài biểu muội từng câu từng chữ, biết trước cả những việc chưa xảy ra." Hắn ngẩng lên, nhìn thẳng vào mắt nàng. "Vân đại tiểu thư, nàng có bao giờ thấy một giấc mơ rất dài không? Một giấc mơ về... pháp trường?"</p>
<p>Tim Vân Khê đập thót một nhịp. Tay cầm muôi cháo khẽ run.</p>
<p>「Ký chủ! Cảnh báo!」 707 rít lên. 「Hắn vừa nhắc tới pháp trường! Người này không bình thường! Dữ liệu về hắn vẫn trống trơn — như bị ai đó XÓA!」</p>
<p>Vân Khê hít sâu, ổn định lại. "Điện hạ nói gì, thần nữ không hiểu."</p>
<p>"Không hiểu cũng được." Lý Thầm uống cạn bát cháo, đứng dậy. Trước khi đi, hắn đặt lên bàn một vật nhỏ — một mảnh ngọc bội khắc hình chim phượng, sứt một góc.</p>
<p>Vân Khê nhìn mảnh ngọc, đồng tử co lại. Đó là ngọc bội của nàng. Mảnh ngọc kiếp trước nàng đã đập vỡ trong ngục, ném qua song sắt trong cơn tuyệt vọng, ba ngày trước khi bị xử trảm. Một vật mà ở kiếp này, nàng còn chưa từng sở hữu.</p>
<p>"Kiếp trước," Lý Thầm nói khẽ, không quay đầu lại, "nàng ném nó cho ta qua song ngục, nhờ ta tra ra kẻ hại nàng. Ta đến trễ một bước. Lần này..." hắn dừng lại, "...ta sẽ không trễ nữa."</p>
<p>Hắn bước đi, để lại Vân Khê đứng chết lặng giữa hơi cháo nghi ngút, mảnh ngọc phượng lạnh buốt trong lòng bàn tay.</p>
<p>Hắn cũng quay về. Hắn nhớ tất cả.</p>
<p>「...Bản hệ thống cập nhật dữ liệu,」 707 thì thầm, giọng lần đầu nghe có chút run. 「Lý Thầm: đồng dạng hồi quy. Ký chủ không phải người duy nhất được cho cơ hội thứ hai.」</p>"""),

    (7, "Chương 7: Một trận lụt, một tấm lòng",
     """<p>Mưa lớn ba ngày liền. Sông Vị tràn bờ, vùng ngoại ô phía Nam kinh thành ngập trắng, hàng nghìn dân chạy nạn kéo về cổng thành, đói rét, không nơi nương tựa.</p>
<p>Triều đình họp khẩn nhưng kho lương eo hẹp, các quan đùn đẩy nhau. Trong lúc đó, một đoàn xe chở đầy lương thực, chăn áo và thuốc men đã lăn bánh ra cổng Nam — dẫn đầu là một bóng váy đỏ quen thuộc.</p>
<p>"Mở kho Tô Tuyền Các. Toàn bộ lợi nhuận ba tháng, đổi thành gạo và thuốc." Vân Khê ra lệnh, giọng không chút do dự. "Dựng lều ở bãi đất cao phía Đông. Nấu cháo, đốt lửa, cách ly người bệnh sốt riêng một khu kẻo lây lan."</p>
<p>Ông chủ Tô xót của lắm nhưng không dám cãi, chỉ lẩm bẩm: "Tiểu thư, đây là cả gia sản ba tháng..."</p>
<p>"Tiền mất còn kiếm lại được. Người chết thì không." Vân Khê xắn tay áo, đích thân khiêng bao gạo xuống xe. "Hơn nữa, ông chủ Tô, ông nghĩ vì sao ta lại cứu cả nghìn người này?"</p>
<p>「+10 điểm mỗi người được cứu khỏi cảnh chết đói chết rét!」 Hệ thống 707 gần như hét lên, con số nhảy vọt. 「Tổng: 320/1000! Ký chủ, chỉ một trận lụt này thôi đã gần một phần ba chỉ tiêu! Đây là... đây là làm việc thiện ở quy mô mà bản hệ thống chưa từng thấy!」</p>
<p>Nhưng Vân Khê không làm vì điểm. Hoặc không chỉ vì điểm. Kiếp trước, trận lụt này cũng xảy ra — và triều đình cứu trợ chậm trễ, hàng nghìn người chết, xác trôi đầy sông Vị. Một trong những tội danh người ta gán cho nàng chính là "thiêu rụi kho lương cứu đói" — một tội nàng chưa từng phạm, nhưng không ai tin.</p>
<p>Kiếp này, nàng đứng giữa biển người chạy nạn, tự tay phát từng bát cháo, băng từng vết thương. Để cả kinh thành chứng kiến: kho lương không bị nàng thiêu — nó được nàng mở ra.</p>
<p>Đến ngày thứ ba, một chuyện không ngờ xảy ra. Cửu hoàng tử Lý Thầm xuất hiện ở khu cứu trợ, mang theo cả ngự y và thuốc men từ phủ hoàng tử. Hắn không nói nhiều, chỉ lặng lẽ cùng nàng cách ly khu bệnh, kê đơn, chia thuốc.</p>
<p>"Điện hạ không sợ bị lây bệnh sao?" Vân Khê hỏi.</p>
<p>"Ta bệnh tật quanh năm, còn sợ gì thêm một bệnh nữa." Lý Thầm cười nhạt, tay vẫn thoăn thoắt băng vết thương cho một đứa trẻ. "Vả lại, kiếp trước ta đứng ngoài nhìn nàng chết oan. Kiếp này, ít nhất ta muốn đứng cùng phía với nàng một lần."</p>
<p>Đêm đó, dưới mái lều dột, hai người ngồi cạnh đống lửa, vây quanh là hàng trăm người được cứu đang ngủ say. Lần đầu tiên, Vân Khê kể cho hắn nghe về kiếp trước của mình — mười tám tội danh, pháp trường, lưỡi đao. Lý Thầm lặng nghe, rồi nói một câu khiến nàng giật mình.</p>
<p>"Mười tám tội danh đó," hắn nói, ánh lửa nhảy múa trong mắt, "không phải do biểu muội nàng dựng nên. Vân Nhu chỉ là quân cờ. Kẻ thật sự muốn nàng chết... đứng cao hơn nhiều. Cao đến mức, ngay cả ta khi điều tra cũng suýt mất mạng. Đó là lý do dữ liệu về ta bị xóa — ta đã chạm vào thứ không nên chạm."</p>
<p>"Là ai?" Vân Khê hỏi, tim thắt lại.</p>
<p>Lý Thầm nhìn về phía hoàng cung xa xa, nơi những mái ngói vàng lấp lánh dưới mưa. "Người ngồi gần ngai vàng nhất. Và muốn ngồi lên đó."</p>"""),

    (8, "Chương 8: Liên minh của hai kẻ hồi quy",
     """<p>Sau trận lụt, danh tiếng Vân Khê lên như diều gặp gió. Dân kinh thành dựng cả bài vè ca ngợi "Vân Bồ Tát mở kho cứu dân". Cái danh "ác nữ" của kiếp trước, ở kiếp này, gần như đã bị xóa sạch — thay vào đó là hình ảnh một tiểu thư nghĩa hiệp, vừa giàu vừa tốt.</p>
<p>Nhưng Vân Khê biết, danh tiếng tốt chỉ là tấm khiên. Muốn sống sót qua ba năm, nàng cần thanh kiếm. Và thanh kiếm đó, lần đầu tiên, nàng không cầm một mình.</p>
<p>Trong mật thất dưới Tô Tuyền Các, Vân Khê và Lý Thầm trải ra một tấm địa đồ kinh thành, đánh dấu chi chít.</p>
<p>"Kể ta nghe," Vân Khê nói, "kẻ đứng sau là ai. Và vì sao hắn muốn ta chết — ta chỉ là con gái một tướng quân, không tranh quyền đoạt vị."</p>
<p>"Đó chính là lý do." Lý Thầm chỉ vào tấm địa đồ, vào vị trí phủ tướng quân — nhà nàng. "Cha nàng, Vân tướng quân, nắm trong tay binh phù Tây Bắc — hai mươi vạn đại quân. Người muốn soán ngôi cần binh quyền đó. Nhưng Vân tướng quân trung thành với hoàng thượng, không thể mua chuộc. Vậy thì..."</p>
<p>"...thì hủy hoại cả gia tộc ta, lấy cớ tru di, rồi nuốt lấy binh quyền." Vân Khê tiếp lời, lạnh sống lưng. Nàng hiểu ra rồi. Mười tám tội danh của nàng kiếp trước không phải nhắm vào nàng — chúng nhắm vào cha nàng, vào hai mươi vạn quân. Nàng chỉ là cái cớ, là quân domino đầu tiên bị xô đổ để kéo sập cả gia tộc.</p>
<p>「Dữ liệu khớp.」 Hệ thống 707 xác nhận, giọng nghiêm trọng. 「Kiếp trước, sau khi ký chủ bị xử trảm ba tháng, toàn bộ phủ tướng quân bị tru di với tội danh 'thông địch phản quốc'. Binh phù Tây Bắc đổi chủ. Người tiếp quản là...」</p>
<p>"Nhiếp chính vương Triệu Khải." Lý Thầm nói ra cái tên. "Hoàng thúc của ta. Kẻ nắm nửa triều đình, và đang nhắm nửa còn lại — chiếc ngai vàng."</p>
<p>Vân Khê nắm chặt mảnh ngọc phượng. Mọi mảnh ghép cuối cùng đã vào đúng chỗ. Biểu muội Vân Nhu, những tội danh vu khống, cái chết của nàng, sự diệt vong của gia tộc — tất cả chỉ là từng nước đi trong ván cờ soán ngôi của Triệu Khải.</p>
<p>"Vậy chúng ta làm gì?" nàng hỏi.</p>
<p>"Chúng ta làm điều hắn không ngờ tới." Lý Thầm mỉm cười, lần đầu tiên nụ cười ấy có chút ấm áp. "Hắn nghĩ nàng vẫn là con tốt thí vô danh. Hắn không biết nàng đã quay về, đã giàu, đã có lòng dân, và đã có ta. Hắn vẫn đang đi theo kịch bản cũ — nghĩa là ta biết trước mọi nước đi của hắn."</p>
<p>"Biết trước nước cờ của địch..." Vân Khê chậm rãi mỉm cười, ánh mắt sáng rực. "...là lợi thế lớn nhất của kẻ hồi quy."</p>
<p>「Ký chủ,」 hệ thống 707 dè dặt chen vào, 「bản hệ thống nhắc nhẹ: chống lại Nhiếp chính vương là phản nghịch, cực kỳ nguy hiểm. Nhưng... nếu cứu được cả gia tộc và hai mươi vạn dân Tây Bắc khỏi chiến loạn, điểm thiện lương sẽ là con số khổng lồ. Bản hệ thống... ủng hộ ký chủ.」</p>
<p>"Lần đầu tiên ngươi với ta cùng phe đấy, 707." Vân Khê bật cười, rồi quay sang Lý Thầm, chìa tay ra. "Hợp tác chứ, Cửu điện hạ?"</p>
<p>Lý Thầm nắm lấy tay nàng. "Hợp tác. Lần này, chúng ta viết lại kết cục."</p>"""),

    (9, "Chương 9: Bẫy ngược",
     """<p>Nhiếp chính vương Triệu Khải ra tay đúng như Lý Thầm tiên đoán.</p>
<p>Một buổi sáng, cấm vệ quân bao vây Tô Tuyền Các. Một vị ngự sử dẫn đầu, lớn tiếng tuyên đọc: "Có người tố giác Vân thị cấu kết gian thương, tích trữ lương thực, mưu đồ thao túng giá gạo kinh thành trong lúc thiên tai — tội khi quân!"</p>
<p>Đây là tội danh đầu tiên trong mười tám tội. Kiếp trước, nàng đã không kịp trở tay. Nhưng kiếp này...</p>
<p>"Khi quân?" Vân Khê bước ra, thong dong như đang dạo chơi. "Đại nhân nói ta tích trữ lương thực thao túng giá gạo? Lạ thật. Ba ngày qua ta phát không ba trăm thạch gạo cho dân nạn ngoài thành Nam. Tích trữ kiểu gì mà càng tích càng ít thế, đại nhân chỉ giúp ta với?"</p>
<p>Đám đông dân chúng vây quanh — những người từng được nàng cứu đói — lập tức xôn xao phẫn nộ. "Vân Bồ Tát phát cháo cứu chúng tôi mà bảo tích trữ?!" "Vu oan! Vu oan người tốt!"</p>
<p>Vị ngự sử cứng họng, mồ hôi rịn trán. Kịch bản của ông ta là vu cho một ác nữ bị dân ghét — chứ không phải một ân nhân được cả nghìn người đội ơn.</p>
<p>"Còn nữa," Vân Khê rút trong tay áo ra một xấp sổ sách, giơ cao. "Đây là sổ thu chi Tô Tuyền Các ba tháng, có dấu của nha môn phủ Kinh Triệu. Từng đồng ra vào đều minh bạch. Đại nhân muốn kiểm tra, ta xin mời. À mà—" nàng mỉm cười ngọt ngào, "—ai mướn đại nhân tới đây vu cho ta, chắc cũng nên kiểm tra sổ sách của người đó luôn nhỉ? Người trong sạch thì sợ gì kiểm tra."</p>
<p>Vị ngự sử biến sắc. Câu nói cuối cùng như một mũi tên — ám chỉ rằng kẻ giật dây phía sau mới là người có vấn đề.</p>
<p>Đúng lúc ấy, một giọng nói lạnh lùng vang lên từ phía sau đám đông. Cửu hoàng tử Lý Thầm bước ra, theo sau là cấm vệ quân của chính hoàng thượng — không phải người của Nhiếp chính vương.</p>
<p>"Bản vương vừa từ chỗ phụ hoàng tới." Lý Thầm giơ một đạo thánh chỉ. "Hoàng thượng nghe tin có người vu hãm ân nhân cứu nạn của trăm họ, long nhan đại nộ, lệnh điều tra tận gốc kẻ chủ mưu. Ngự sử đại nhân, ngài nhận lệnh của ai mà tới đây? Nói rõ trước mặt cấm vệ quân của hoàng thượng đi."</p>
<p>Vị ngự sử quỳ sụp xuống, run như cầy sấy. Ông ta là người của Triệu Khải, nhưng trước thánh chỉ và cấm vệ quân, ông ta không dám khai — khai ra là chết, không khai cũng chết. Cuối cùng ông ta chỉ biết dập đầu xin tha, đổ hết tội cho "nghe lời đồn nhảm".</p>
<p>「Hóa giải tội danh thứ nhất + bảo toàn danh dự: +25 điểm. Tổng: 360/1000.」 Hệ thống 707 reo lên. 「Ký chủ! Nước cờ đầu của Nhiếp chính vương bị bẻ gãy hoàn toàn!」</p>
<p>Tối đó, trong mật thất, Lý Thầm rót cho nàng một chén trà. "Triệu Khải sẽ không dừng lại. Hắn vừa mất một quân cờ, sẽ tung ra quân lớn hơn. Nàng sợ không?"</p>
<p>Vân Khê nâng chén trà, ánh nến soi nghiêng gương mặt điềm tĩnh. "Kiếp trước ta sợ, vì ta không biết kẻ thù là ai, đòn đánh từ đâu tới. Kiếp này ta biết hết. Người không sợ nhất trên đời, là người đã từng chết một lần rồi." Nàng nhấp trà, mỉm cười. "Đến lượt chúng ta ra đòn."</p>"""),

    (10, "Chương 10: Lật mặt nạ biểu muội",
     """<p>Muốn đánh rắn, phải đánh từ đuôi lên đầu. Quân cờ gần nhất của Triệu Khải trong phủ tướng quân, chính là biểu muội Vân Nhu.</p>
<p>Vân Khê bày một cái bẫy đơn giản. Nàng cố ý để lộ tin rằng cha nàng — Vân tướng quân — giấu một bản mật tấu tố giác Nhiếp chính vương trong thư phòng, chuẩn bị dâng lên hoàng thượng. Tin này, nàng chỉ "vô tình" để Vân Nhu nghe được.</p>
<p>Đêm đó, đúng như dự liệu, một bóng người lẻn vào thư phòng tướng quân, lục tung bàn giấy tìm bản mật tấu. Khi đèn đuốc bừng sáng, Vân Nhu bị bắt quả tang giữa thư phòng, tay còn cầm cây nến đang định châm lửa đốt.</p>
<p>"Biểu muội," Vân Khê bước ra từ bóng tối, giọng nhẹ như ru, "muội tìm gì trong thư phòng của cữu phụ giữa đêm khuya thế? Mà còn mang theo lửa nữa. Định sưởi ấm à?"</p>
<p>Vân Nhu run rẩy, lắp bắp: "Ta... ta..."</p>
<p>"Đừng phí lời." Vân Khê khoát tay. Hai gia nhân lôi ra một cái rương — bên trong là cả xấp thư từ qua lại giữa Vân Nhu và phủ Nhiếp chính vương, từng lá ghi rõ mệnh lệnh hãm hại, từng khoản ngân lượng nhận hối lộ. "Ta đã cho người theo dõi muội từ lâu rồi, biểu muội. Mỗi lá thư muội gửi cho Triệu Khải, ta đều có một bản sao."</p>
<p>Mặt Vân Nhu sụp đổ hoàn toàn. "Ngươi... ngươi biết hết từ đầu?"</p>
<p>"Từ cái chén trà ở yến tiệc mùa xuân." Vân Khê ngồi xuống, rót cho mình một chén trà như đang đàm đạo. "Vân Nhu, ta cho muội một cơ hội — cơ hội mà kiếp trước ta không có. Khai ra toàn bộ âm mưu của Triệu Khải trước mặt hoàng thượng, ta xin cho muội một con đường sống. Bằng không..." nàng đẩy xấp thư về phía biểu muội, "...những thứ này đủ để tru di chín họ nhà muội, gồm cả mẹ muội — di nương mà muội hết lòng bảo vệ."</p>
<p>Nhắc đến mẹ, Vân Nhu vỡ òa. Hóa ra suốt bao năm, nàng hãm hại Vân Khê cũng chỉ vì bị Triệu Khải nắm thóp, đe dọa tính mạng mẹ con nàng. Nàng vừa là thủ phạm, vừa là nạn nhân.</p>
<p>"Ta... ta khai. Ta khai hết." Vân Nhu quỳ sụp, nước mắt giàn giụa. "Chỉ xin tỷ tỷ cứu mẹ ta."</p>
<p>「Ký chủ cho kẻ thù một con đường sống thay vì trả thù: +20 điểm. Cảm hóa quân cờ thành nhân chứng: +15 điểm. Tổng: 395/1000.」 Hệ thống 707 lặng đi một lúc, rồi nói khẽ. 「Ký chủ... lần này bản hệ thống không thắc mắc nữa. Đây đúng là thiện lương thật sự — tha thứ cho kẻ từng hại mình.」</p>
<p>Vân Khê đỡ Vân Nhu dậy, lần đầu tiên giọng nàng dịu dàng không pha sắc bén. "Kiếp trước, ta với muội đều là quân cờ trong tay người khác. Kiếp này, ta không muốn chúng ta tiếp tục là quân cờ nữa. Đứng dậy đi, biểu muội. Chúng ta cùng lật bàn cờ."</p>"""),

    (11, "Chương 11: Bản mật tấu giả và cái bẫy thật",
     """<p>Có lời khai và thư từ của Vân Nhu, Vân Khê và Lý Thầm nắm trong tay bằng chứng động trời. Nhưng Triệu Khải là Nhiếp chính vương, nắm nửa triều đình — chỉ vài lá thư chưa đủ để hạ một con sói già như hắn. Cần dồn hắn vào thế phải tự lộ mặt.</p>
<p>Lý Thầm bày kế. "Triệu Khải đang chờ bản mật tấu mà cha nàng định dâng lên. Hắn nhất định sẽ tìm cách chặn nó giữa đường, vì hắn sợ nội dung trong đó. Vậy ta cho hắn một bản mật tấu — nhưng là bản ta dựng sẵn."</p>
<p>Họ tung tin Vân tướng quân sẽ đích thân dâng mật tấu vạch tội Nhiếp chính vương vào buổi đại triều ba ngày tới. Quả nhiên, Triệu Khải cắn câu. Hắn không thể để bản mật tấu đó đến tay hoàng thượng — nên hắn phải ra tay trước, hoặc cướp, hoặc giết.</p>
<p>Đêm trước đại triều, sát thủ của Triệu Khải đột nhập phủ tướng quân để cướp bản mật tấu và ám sát Vân tướng quân. Nhưng chờ sẵn chúng không phải một lão tướng già, mà là cấm vệ quân tinh nhuệ của hoàng thượng — do chính Lý Thầm bí mật điều tới, mai phục từ trước.</p>
<p>Toàn bộ toán sát thủ bị bắt sống. Trên người chúng, mang theo lệnh bài và mật lệnh có ấn triện của phủ Nhiếp chính vương — bằng chứng không thể chối cãi về tội mưu sát trọng thần và đại nghịch.</p>
<p>"Hắn cẩn thận cả đời," Lý Thầm nhìn đống tang vật, khẽ nói, "nhưng kẻ quá tự tin luôn để lại sơ hở. Hắn nghĩ kịch bản vẫn như kiếp trước — Vân tướng quân không đề phòng, phủ tướng quân không có cấm vệ. Hắn không biết, lần này ta đã thay đổi từng quân cờ trên bàn."</p>
<p>「Ngăn chặn vụ ám sát + cứu mạng Vân tướng quân: +30 điểm. Tổng: 425/1000.」 Hệ thống 707 reo vang. 「Ký chủ, đêm nay không ai phải chết! Kiếp trước cha ký chủ bị ám sát chính trong đêm này — ký chủ đã thay đổi nó!」</p>
<p>Vân Khê đứng trên hành lang, nhìn cha mình — Vân tướng quân — an toàn vô sự, đang quát mắng đám sát thủ bị trói. Sống mũi nàng cay xè. Kiếp trước, đêm này là đêm cha nàng ngã xuống, mở màn cho sự diệt vong của cả gia tộc. Kiếp này, ông vẫn đứng đó, lưng thẳng như cây tùng.</p>
<p>"Cha..." nàng khẽ gọi, giọng nghẹn lại.</p>
<p>Vân tướng quân quay sang, nhìn cô con gái mà gần đây ông nghe đồn đã "thay tính đổi nết", trở thành Vân Bồ Tát của kinh thành. Ông không hiểu hết, nhưng ông thấy trong mắt con gái mình một thứ ánh sáng kiên định mà một thiếu nữ mười sáu tuổi không nên có — ánh sáng của người đã đi qua sinh tử.</p>
<p>"Con gái ngoan," ông vỗ vai nàng, giọng khàn khàn. "Cha không biết con đã trải qua những gì. Nhưng cha biết, con đã cứu cả nhà này. Cảm ơn con."</p>
<p>Vân Khê cúi đầu, để nước mắt rơi xuống trong bóng tối. Lần đầu tiên sau hai kiếp người, nàng được nghe cha nói lời cảm ơn, thay vì nhìn ông chết trong oan khuất.</p>
<p>"Ngày mai," nàng lau nước mắt, ngẩng lên, ánh mắt lại sắc như gươm, "là đại triều. Đến lúc trả lại cho Triệu Khải tất cả những gì hắn nợ — của cả hai kiếp."</p>"""),

    (12, "Chương 12: Đại triều phong vân",
     """<p>Điện Thái Hòa, đại triều. Văn võ bá quan đứng chật hai hàng. Trên ngai vàng, hoàng thượng ngồi trầm mặc. Bên dưới, Nhiếp chính vương Triệu Khải đứng ở vị trí cao nhất của hàng thân vương, vẻ mặt ung dung như mọi khi — hắn còn chưa biết toán sát thủ đêm qua đã bị bắt sống.</p>
<p>Lý Thầm bước ra giữa điện, quỳ xuống. "Nhi thần có bản tấu, tố giác đại tội mưu nghịch."</p>
<p>Triệu Khải hơi nhíu mày nhưng vẫn bình thản. Hắn nghĩ đây là bản mật tấu của Vân tướng quân mà hắn đã cho người chặn — hắn tin nó không bao giờ tới được điện này.</p>
<p>Nhưng rồi cửa điện mở. Cấm vệ quân áp giải toán sát thủ bị bắt đêm qua vào điện, cùng với toàn bộ tang vật: lệnh bài, mật lệnh có ấn triện phủ Nhiếp chính vương, và những lá thư của Vân Nhu. Theo sau là chính Vân Nhu, quỳ xuống giữa điện, khai ra toàn bộ âm mưu — từ việc Triệu Khải sai nàng hãm hại Vân Khê, đến kế hoạch tru di phủ tướng quân để cướp binh phù Tây Bắc.</p>
<p>Mặt Triệu Khải lần đầu tiên biến sắc. "Vu cáo! Đây là trò bịa đặt hãm hại bản vương!"</p>
<p>"Vu cáo?" Vân Khê bước vào điện, váy đỏ rực rỡ giữa triều phục xám của bá quan. Nàng giơ cao xấp thư và lệnh bài. "Ấn triện này là giả? Lệnh bài này là giả? Toán sát thủ đêm qua đột nhập phủ tướng quân, mang lệnh của vương gia, cũng là giả? Nhiếp chính vương, ngài muốn nói cả cấm vệ quân của hoàng thượng cũng dựng chuyện hại ngài sao?"</p>
<p>Từng bằng chứng được trưng ra. Từng nhân chứng lên tiếng. Bức tường quyền lực mà Triệu Khải xây cả chục năm bắt đầu nứt vỡ. Những vị quan vốn theo hắn, thấy đại thế đã mất, lần lượt cúi đầu im lặng — không ai muốn chết chung với một kẻ phản nghịch đã bại lộ.</p>
<p>"Phụ hoàng," Lý Thầm dập đầu, "Nhiếp chính vương Triệu Khải kết bè kết đảng, mưu sát trọng thần, ý đồ soán nghịch. Chứng cứ rành rành. Xin phụ hoàng minh xét."</p>
<p>Hoàng thượng — người đã nghi ngờ đứa em quyền khuynh triều dã của mình từ lâu nhưng thiếu bằng chứng — lúc này đập tay xuống long ỷ, long nhan đại nộ. "Triệu Khải! Trẫm đối đãi ngươi không bạc, ngươi lại dám mưu đồ ngai vàng, hãm hại trung lương! Người đâu — tước bỏ tước vị, tống giam chờ xử!"</p>
<p>Cấm vệ quân ập vào. Triệu Khải, kẻ Nhiếp chính vương từng một tay che trời, bị lôi đi giữa điện Thái Hòa trong tiếng gào thét bất lực. Khi bị kéo ngang qua Vân Khê, hắn trừng mắt nhìn nàng, rít lên: "Một tiểu nha đầu... rốt cuộc ngươi là ai?"</p>
<p>Vân Khê nhìn hắn, mỉm cười nhẹ. "Ta là người mà kiếp trước ngài đã đẩy lên pháp trường. Kiếp này, ta đến để đẩy ngài xuống." Lời này nàng nói rất khẽ, chỉ đủ cho một mình hắn nghe — và nhìn vẻ kinh hoàng vụt qua mắt hắn, nàng biết, có lẽ trong thâm tâm, hắn đã lờ mờ hiểu.</p>
<p>「Lật đổ kẻ mưu nghịch + giải oan cho gia tộc: +50 điểm. Tổng: 475/1000.」 Hệ thống 707 gần như nghẹn ngào. 「Ký chủ... mười tám tội danh của kiếp trước... không một tội nào còn cơ hội rơi xuống đầu ký chủ nữa.」</p>"""),

    (13, "Chương 13: Bí mật của một nghìn điểm",
     """<p>Triệu Khải sụp đổ. Phủ tướng quân được rửa sạch hiềm nghi, binh phù Tây Bắc vẫn nằm trong tay người trung thành. Hai mươi vạn quân và muôn dân biên ải tránh được một cuộc chiến loạn mà kiếp trước đã nhấn chìm cả một vùng trong máu lửa.</p>
<p>Đêm đó, Vân Khê ngồi một mình bên cửa sổ, ngắm vầng trăng. Mọi tai họa của kiếp trước đã được hóa giải. Nàng đã sống. Cha nàng đã sống. Gia tộc đã an toàn.</p>
<p>"Hệ thống," nàng khẽ gọi. "Ta hỏi ngươi một câu, ngươi đáp thật được không?"</p>
<p>「Ký chủ cứ hỏi.」</p>
<p>"Một nghìn điểm thiện lương. Rốt cuộc đổi được gì? Và ngươi — ngươi thật sự là cái gì?"</p>
<p>707 im lặng rất lâu. Rồi, lần đầu tiên, giọng nó không còn lảnh lót máy móc, mà trầm xuống, gần như giọng người.</p>
<p>「Ký chủ, đã đến lúc nói thật. Bản hệ thống không phải máy móc của một 'tổng bộ' nào cả. Bản hệ thống... là một mảnh hồn.」</p>
<p>Vân Khê sững người.</p>
<p>「Kiếp trước, trước khi ký chủ bị xử trảm, có một người đã quỳ trước cổng pháp trường suốt ba ngày ba đêm, cầu xin trời đất cho ký chủ một cơ hội thứ hai. Người đó dùng chính dương thọ của mình, đổi lấy một cơ duyên hồi quy cho ký chủ. Nhưng cơ duyên ấy cần một thứ neo giữ — một 'người dẫn đường' đi cùng ký chủ qua kiếp thứ hai. Bản hệ thống... chính là mảnh hồn nguyện mà người đó để lại. Một nghìn điểm thiện lương không phải điều kiện để ký chủ sống — ký chủ đã được ban cho sự sống từ đầu. Một nghìn điểm... là để chuộc lại dương thọ cho người đã hi sinh vì ký chủ.」</p>
<p>Tay Vân Khê run lên. "Người đó... là ai?"</p>
<p>Cửa phòng khẽ mở. Lý Thầm đứng đó, ánh trăng đổ sau lưng. Gương mặt hắn, đêm nay, không còn vẻ nhợt nhạt bệnh tật giả tạo — mà bình thản, và buồn.</p>
<p>"Là ta," hắn nói khẽ. "Kiếp trước, ta đến pháp trường trễ một bước, không cứu được nàng. Sau khi nàng chết, ta mới biết toàn bộ sự thật, mới biết nàng chết oan. Ta đã quỳ ba ngày ba đêm trước miếu Thành Hoàng, nguyện đổi dương thọ lấy cho nàng một cơ hội làm lại. Lời nguyện thành, nhưng cái giá là... ta hồi quy cùng nàng, mang theo mảnh hồn nguyện ấy, và dương thọ của ta cứ cạn dần theo mỗi ngày trôi qua. Đó là lý do dữ liệu về ta 'bị xóa' — vì ta vốn không nên còn tồn tại ở kiếp này."</p>
<p>Vân Khê đứng bật dậy, nước mắt trào ra. Hóa ra "hệ thống 707" lảnh lót bên nàng suốt bao ngày qua, chính là một mảnh hồn của người đàn ông này. Hóa ra hắn không chỉ là đồng minh hồi quy — hắn là người đã dùng cả sinh mệnh để cho nàng kiếp thứ hai.</p>
<p>"Đồ ngốc," nàng nghẹn ngào, đấm vào ngực hắn. "Sao ngươi không nói sớm? Một nghìn điểm... ngươi để ta tích một nghìn điểm để chuộc thọ cho ngươi, mà ngươi giấu ta?"</p>
<p>Lý Thầm nắm lấy tay nàng, mỉm cười. "Vì ta sợ nàng tích điểm vì ta, chứ không vì lòng nàng muốn làm điều thiện. Nhưng nàng đã làm rồi — bốn trăm bảy mươi lăm điểm, không phải vì ta, mà vì nàng thật sự muốn cứu người. Vân Khê, nàng đã trở thành người tốt thật, không phải vì hệ thống ép."</p>"""),

    (14, "Chương 14: Một nghìn điểm cuối cùng",
     """<p>Sự thật phơi bày khiến Vân Khê thay đổi. Trước đây nàng làm việc thiện một phần vì điểm, một phần vì tính toán. Giờ đây, nàng làm vì một lẽ giản dị hơn: nàng muốn người đàn ông đã hi sinh vì mình được sống.</p>
<p>Nhưng nghịch lý thay, càng làm việc thiện không vì điểm, điểm lại càng tăng nhanh. Nàng mở rộng Tô Tuyền Các thành chuỗi nhà tắm và y quán khắp kinh thành, lập quỹ cứu tế cho cô nhi quả phụ, mở trường dạy chữ miễn phí cho con nhà nghèo. Mỗi việc làm không còn là một nước cờ, mà là một tấm lòng.</p>
<p>「+15... +20... +30...」 Hệ thống 707 — giờ nàng đã biết đó là mảnh hồn Lý Thầm — đếm điểm với giọng ngày một ấm. 「Tổng: 870/1000. Ký chủ, sắp rồi.」</p>
<p>Nhưng dương thọ của Lý Thầm cũng cạn nhanh hơn. Sắc mặt hắn ngày một nhợt, có những đêm hắn ho ra máu. Cái giá của lời nguyện hồi quy đang đòi hắn trả.</p>
<p>"Đừng làm vội," hắn nắm tay nàng, giọng yếu ớt trong một đêm trở bệnh. "Nếu nàng tích đủ một nghìn điểm, dương thọ ta được chuộc lại — nhưng mảnh hồn nguyện trong nàng, tức 'hệ thống', sẽ tan biến. Ta sợ... khi ta khỏe lại, ta sẽ không còn nhớ những ngày này, không còn nhớ kiếp trước, không còn nhớ ta đã từng là tiếng nói bên nàng."</p>
<p>Vân Khê nắm chặt tay hắn. "Vậy thì ta sẽ kể lại cho ngươi nghe. Mỗi ngày, ta sẽ kể lại cho ngươi nghe về hai kiếp người của chúng ta, cho đến khi ngươi nhớ. Ngươi đã cho ta một cơ hội thứ hai — giờ để ta cho ngươi một cuộc đời mới."</p>
<p>Đêm rằm tháng tám, dưới ánh trăng tròn vành vạnh, Vân Khê hoàn thành việc thiện cuối cùng: nàng đem toàn bộ gia sản kếch xù tích lũy được, lập nên "Vân Thị Nghĩa Trang" — một quỹ từ thiện vĩnh viễn nuôi dưỡng người nghèo khổ cô độc của kinh thành, không phải cho một mùa đói, mà cho muôn đời sau.</p>
<p>「+130 điểm. Tổng: 1000/1000.」 Giọng hệ thống 707 vang lên, run run. 「Ký chủ... đủ rồi. Một nghìn điểm thiện lương. Dương thọ của Lý Thầm... được chuộc lại trọn vẹn.」</p>
<p>Một luồng ánh sáng ấm áp tỏa ra từ lồng ngực Vân Khê, bay về phía Lý Thầm đang nằm trên giường bệnh. Sắc mặt hắn hồng hào trở lại, hơi thở đều đặn, vết bệnh tan biến như chưa từng tồn tại.</p>
<p>「Ký chủ...」 giọng 707 nhỏ dần, như gió thoảng. 「Nhiệm vụ hoàn thành. Mảnh hồn nguyện... đến lúc trở về rồi. Cảm ơn ký chủ, đã thay ta... sống tử tế. Đã chứng minh rằng... một ác nữ cũng có thể trở thành người tốt nhất thế gian. Tạm biệt... Vân Khê.」</p>
<p>"Khoan—" Vân Khê bật khóc. "707, đừng đi—"</p>
<p>Nhưng tiếng nói lảnh lót đã từng bên nàng suốt một kiếp người, lặng lẽ tan vào ánh trăng. Lần đầu tiên sau bao tháng, trong đầu nàng trở nên yên tĩnh hoàn toàn.</p>
<p>Trên giường, Lý Thầm từ từ mở mắt.</p>"""),

    (15, "Chương 15: Kết — Kiếp này, ta tự viết",
     """<p>Lý Thầm tỉnh dậy, khỏe mạnh như một người chưa từng bệnh tật. Nhưng đúng như hắn lo sợ, ký ức về hai kiếp người, về mảnh hồn nguyện, về những ngày làm "tiếng nói trong đầu" Vân Khê — tất cả đã mờ nhạt như một giấc mơ xa.</p>
<p>Hắn nhìn người con gái váy đỏ đang ngồi khóc bên giường mình, ngơ ngác. "Nàng... vì sao lại khóc?"</p>
<p>Vân Khê lau nước mắt, rồi mỉm cười. Nàng không buồn. Nàng đã hứa rồi — nàng sẽ kể lại cho hắn nghe, từ đầu.</p>
<p>"Để ta kể ngươi nghe một câu chuyện," nàng nói, nắm lấy tay hắn. "Chuyện về một ác nữ bị xử trảm giữa pháp trường. Và một chàng hoàng tử đã quỳ ba ngày ba đêm, đổi cả sinh mệnh để cho nàng một cơ hội làm lại..."</p>
<p>Nàng kể, ngày này qua ngày khác. Có những chi tiết hắn không nhớ, nhưng khi nàng kể đến đoạn hắn ném vò rượu xuống pháp trường, đến đoạn hắn quỳ trước miếu Thành Hoàng, khóe mắt Lý Thầm lại ươn ướt một cách vô thức — như thể trái tim hắn nhớ những điều mà lý trí đã quên.</p>
<p>Một năm sau, kinh thành mở hội lớn. Vân Khê — giờ đã là "Vân Thiện Nhân" được muôn dân kính ngưỡng — đứng trên lầu cao của Vân Thị Nghĩa Trang, nhìn xuống dòng người tấp nập. Đám trẻ mồ côi nàng cưu mang đang nô đùa dưới sân. Những người già cô độc được nàng phụng dưỡng đang phơi nắng, cười móm mém.</p>
<p>Đây là kết cục mà kiếp trước nàng không dám mơ tới. Không pháp trường. Không lưỡi đao. Không mười tám tội danh oan khuất. Chỉ có một cuộc đời nàng tự tay gây dựng — bằng mưu trí, bằng lòng thiện, và bằng cả một tình yêu đã vượt qua sinh tử.</p>
<p>Lý Thầm bước đến bên nàng, choàng một chiếc áo lên vai nàng. Hắn không còn là Cửu hoàng tử bệnh tật giả tạo — sau khi Triệu Khải sụp đổ, hắn được phong làm Hiền vương, nắm thực quyền nhưng từ chối ngai vàng, chọn ở lại bên nàng.</p>
<p>"Hôm nay nàng lại kể tiếp chuyện cũ chứ?" hắn hỏi, mỉm cười.</p>
<p>"Hôm nay thì không." Vân Khê tựa đầu vào vai hắn, ngắm hoàng hôn nhuộm đỏ cả kinh thành — màu đỏ của váy nàng, màu đỏ của lửa, màu đỏ của một khởi đầu. "Hôm nay, chúng ta không kể chuyện cũ nữa. Hôm nay, chúng ta bắt đầu viết chuyện mới."</p>
<p>"Chuyện mới?"</p>
<p>"Ừ." Nàng ngẩng lên nhìn hắn, đôi mắt phượng cong cong, sáng rực rỡ. "Kiếp trước, người ta viết kịch bản cho đời ta — và họ viết ta thành ác nữ, viết ta chết trên pháp trường. Kiếp này..." nàng nắm chặt tay hắn, "...kiếp này, cây bút trong tay ta. Và ta sẽ viết một câu chuyện thật dài, thật đẹp, về hai kẻ đã được trời cho cơ hội thứ hai."</p>
<p>Gió chiều thổi qua, mang theo tiếng cười trẻ thơ từ sân nghĩa trang vọng lên. Vân Khê nhắm mắt, lắng nghe. Trong đầu nàng, nơi từng có một giọng nói lảnh lót, giờ đã yên tĩnh — nhưng không hề trống vắng. Bởi nàng biết, mảnh hồn nguyện ấy chưa từng rời đi thật sự. Nó đã hóa thành chính nàng — thành một người tốt, không phải vì bị ép, mà vì nàng đã chọn như thế.</p>
<p>Pháp trường của kiếp trước, vĩnh viễn chỉ còn là một giấc mơ xa.</p>
<p>Còn kiếp này — kiếp này, nàng tự viết.</p>
<p>【HẾT】</p>"""),
]
