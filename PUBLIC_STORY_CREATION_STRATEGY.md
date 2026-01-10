# Chiến lược mở rộng tính năng tạo truyện cho tất cả user

## 🎯 MỤC TIÊU

Cho phép **TẤT CẢ USER** có thể tạo truyện, nhưng với **KIỂM SOÁT CHẶT CHẼ** để:
- ✅ Tránh spam, nội dung rác
- ✅ Ngăn vi phạm bản quyền
- ✅ Đảm bảo chất lượng nội dung
- ✅ Tuân thủ pháp luật

---

## 🛡️ GIẢI PHÁP ĐỀ XUẤT

### **1. Approval System (Hệ thống phê duyệt) - QUAN TRỌNG NHẤT**

**Cơ chế:**
- ✅ **USER thường**: Tạo truyện → **Tự động DRAFT, chưa publish**
- ✅ **AUTHOR/ADMIN**: Tạo truyện → **Có thể publish ngay** (hoặc cần approval tùy cấu hình)
- ✅ **USER muốn publish**: Phải gửi **Approval Request** → Admin/Moderator duyệt

**Flow:**
```
USER tạo truyện
  ↓
Story status: DRAFT, isPublished: false
  ↓
User click "Gửi yêu cầu xuất bản"
  ↓
Tạo ApprovalRequest (status: PENDING)
  ↓
Admin/Moderator review
  ↓
APPROVED → isPublished: true, status: PUBLISHED
REJECTED → Giữ nguyên DRAFT, gửi thông báo lý do
```

**Lợi ích:**
- ✅ Kiểm soát 100% nội dung trước khi public
- ✅ Tránh spam, nội dung vi phạm
- ✅ Có thể từ chối với lý do rõ ràng

---

### **2. Rate Limiting (Giới hạn số lượng)**

**Cơ chế:**
- ✅ **USER mới**: Tối đa **3 truyện DRAFT** cùng lúc
- ✅ **USER có truyện đã được approve**: Tối đa **10 truyện DRAFT**
- ✅ **AUTHOR**: Không giới hạn
- ✅ **Giới hạn theo thời gian**: Tối đa **5 truyện/ngày** cho USER

**Implementation:**
```typescript
// Backend validation
async create(userId, userRole, createStoryDto) {
  if (userRole === UserRole.USER) {
    // Check draft limit
    const draftCount = await this.prisma.story.count({
      where: {
        authorId: userId,
        isPublished: false,
        status: StoryStatus.DRAFT,
      },
    });
    
    if (draftCount >= 3) {
      throw new BadRequestException('Bạn đã đạt giới hạn 3 truyện nháp. Vui lòng hoàn thành hoặc xóa truyện cũ.');
    }
    
    // Check daily limit
    const todayStories = await this.prisma.story.count({
      where: {
        authorId: userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    
    if (todayStories >= 5) {
      throw new BadRequestException('Bạn chỉ có thể tạo tối đa 5 truyện mỗi ngày.');
    }
  }
  
  // Continue with creation...
}
```

**Lợi ích:**
- ✅ Ngăn spam, tạo tràn lan
- ✅ Khuyến khích hoàn thiện truyện trước khi tạo mới
- ✅ Bảo vệ database khỏi quá tải

---

### **3. User Reputation System (Hệ thống uy tín)**

**Cơ chế:**
- ✅ **Reputation Score** dựa trên:
  - Số truyện đã được approve
  - Số lượt xem, like, rating
  - Số lần bị reject
  - Số lần bị report

**Reputation Levels:**
```
NEW_USER (0-10 điểm)
  - Giới hạn: 3 drafts, 5 truyện/ngày
  - Cần approval cho mọi publish

TRUSTED_USER (11-50 điểm)
  - Giới hạn: 10 drafts, 10 truyện/ngày
  - Vẫn cần approval nhưng ưu tiên review

VERIFIED_AUTHOR (51+ điểm)
  - Không giới hạn
  - Có thể tự publish (hoặc auto-approve)
  - Có thể được nâng lên role AUTHOR
```

**Implementation:**
```typescript
// Add to User model
model User {
  // ... existing fields
  reputationScore  Int      @default(0)
  totalStories     Int      @default(0)
  approvedStories  Int      @default(0)
  rejectedStories Int      @default(0)
  reportsReceived  Int      @default(0)
}

// Calculate reputation
function calculateReputation(user: User): number {
  let score = 0;
  score += user.approvedStories * 10;
  score += user.totalStories * 1;
  score -= user.rejectedStories * 5;
  score -= user.reportsReceived * 3;
  return Math.max(0, score);
}
```

**Lợi ích:**
- ✅ Khuyến khích tạo nội dung chất lượng
- ✅ Tự động phân loại user
- ✅ Giảm workload cho admin

---

### **4. Content Filtering (Lọc nội dung tự động)**

**Cơ chế:**
- ✅ **Từ khóa cấm**: Check title, description
- ✅ **Duplicate detection**: Check title tương tự
- ✅ **Image validation**: Check ảnh bìa (NSFW, watermark)
- ✅ **Spam detection**: Pattern matching

**Implementation:**
```typescript
// Backend validation
async create(userId, userRole, createStoryDto) {
  // 1. Check banned keywords
  const bannedKeywords = await this.getBannedKeywords();
  const titleLower = createStoryDto.title.toLowerCase();
  const descLower = (createStoryDto.description || '').toLowerCase();
  
  for (const keyword of bannedKeywords) {
    if (titleLower.includes(keyword) || descLower.includes(keyword)) {
      throw new BadRequestException(`Nội dung chứa từ khóa không phù hợp: ${keyword}`);
    }
  }
  
  // 2. Check duplicate title
  const similarStories = await this.prisma.story.findMany({
    where: {
      title: {
        contains: createStoryDto.title,
        mode: 'insensitive',
      },
    },
  });
  
  if (similarStories.length > 0) {
    // Flag for manual review
    createStoryDto.needsReview = true;
  }
  
  // 3. Image validation (optional - can use AI service)
  if (createStoryDto.coverImage) {
    const imageCheck = await this.validateImage(createStoryDto.coverImage);
    if (!imageCheck.isValid) {
      throw new BadRequestException(imageCheck.reason);
    }
  }
  
  // Continue...
}
```

**Lợi ích:**
- ✅ Tự động chặn nội dung vi phạm
- ✅ Phát hiện duplicate
- ✅ Giảm workload cho admin

---

### **5. Auto-Moderation Queue (Hàng đợi kiểm duyệt tự động)**

**Cơ chế:**
- ✅ **Priority Queue** dựa trên:
  - User reputation
  - Story quality score
  - Urgency (user request)

**Queue System:**
```
HIGH PRIORITY (review trong 24h)
  - Verified authors
  - Stories với nhiều chapters
  - Stories đã được edit nhiều lần

NORMAL PRIORITY (review trong 3-5 ngày)
  - Regular users
  - New stories

LOW PRIORITY (review trong 7 ngày)
  - Users với nhiều rejections
  - Stories flagged by system
```

**Implementation:**
```typescript
// Add priority to ApprovalRequest
model ApprovalRequest {
  // ... existing fields
  priority      Int      @default(5) // 1-10, 10 = highest
  estimatedTime DateTime? // When admin should review
}

// Calculate priority
function calculatePriority(request: ApprovalRequest): number {
  let priority = 5; // default
  
  const user = request.user;
  priority += user.reputationScore / 10;
  
  if (request.story?.chapters?.length > 5) {
    priority += 2; // Has content
  }
  
  if (user.rejectedStories > 5) {
    priority -= 2; // Low quality user
  }
  
  return Math.min(10, Math.max(1, priority));
}
```

**Lợi ích:**
- ✅ Ưu tiên review nội dung chất lượng
- ✅ Quản lý workload hiệu quả
- ✅ User biết khi nào được review

---

### **6. Two-Stage Publishing (Xuất bản 2 giai đoạn)**

**Cơ chế:**
- ✅ **Stage 1: Soft Publish** (Chỉ hiển thị cho user đó)
  - User có thể xem preview
  - Chưa public
  - Có thể chỉnh sửa

- ✅ **Stage 2: Full Publish** (Public cho mọi người)
  - Sau khi được approve
  - Hiển thị trên website
  - Không thể chỉnh sửa lớn (cần approval)

**Implementation:**
```typescript
// Add to Story model
model Story {
  // ... existing fields
  isPublished     Boolean  @default(false)
  isPublic        Boolean  @default(false) // Full publish
  publishRequested Boolean @default(false) // User requested publish
}

// Flow
USER tạo truyện → DRAFT
USER click "Preview" → Soft publish (chỉ user thấy)
USER click "Gửi yêu cầu xuất bản" → publishRequested: true
Admin approve → isPublic: true, isPublished: true
```

**Lợi ích:**
- ✅ User có thể test trước
- ✅ Giảm số lần reject
- ✅ Better UX

---

### **7. Content Guidelines & Warnings (Hướng dẫn & cảnh báo)**

**Cơ chế:**
- ✅ **Hiển thị guidelines** khi tạo truyện
- ✅ **Checklist** trước khi submit
- ✅ **Warning** nếu vi phạm

**UI Implementation:**
```typescript
// Show modal before creating
<GuidelinesModal>
  <h3>Quy định tạo truyện</h3>
  <ul>
    <li>✅ Nội dung phải do bạn sáng tác hoặc có bản quyền</li>
    <li>✅ Không được vi phạm bản quyền</li>
    <li>✅ Không được chứa nội dung nhạy cảm</li>
    <li>✅ Phải có ít nhất 1 chương trước khi xuất bản</li>
  </ul>
  <Checkbox> Tôi đã đọc và đồng ý với quy định </Checkbox>
</GuidelinesModal>
```

**Lợi ích:**
- ✅ Giảm vi phạm
- ✅ User hiểu rõ quy định
- ✅ Bảo vệ pháp lý

---

### **8. Reporting & Penalty System (Báo cáo & phạt)**

**Cơ chế:**
- ✅ **Content Report** (đã có sẵn)
- ✅ **Penalty system**:
  - 1 lần vi phạm: Warning
  - 2 lần: Tạm khóa tạo truyện 7 ngày
  - 3 lần: Tạm khóa 30 ngày
  - 5 lần: Ban vĩnh viễn

**Implementation:**
```typescript
// Add to User model
model User {
  // ... existing fields
  violations      Int      @default(0)
  bannedUntil     DateTime?
  canCreateStory  Boolean  @default(true)
}

// Check before create
async create(userId, userRole, createStoryDto) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  
  if (!user.canCreateStory) {
    throw new ForbiddenException('Bạn đã bị tạm khóa tạo truyện do vi phạm quy định.');
  }
  
  if (user.bannedUntil && user.bannedUntil > new Date()) {
    throw new ForbiddenException(`Bạn bị tạm khóa đến ${user.bannedUntil.toLocaleDateString()}`);
  }
  
  // Continue...
}
```

**Lợi ích:**
- ✅ Răn đe vi phạm
- ✅ Bảo vệ cộng đồng
- ✅ Tự động xử lý

---

### **9. Moderation Dashboard (Dashboard kiểm duyệt)**

**Cơ chế:**
- ✅ **Admin/Moderator dashboard** để:
  - Xem danh sách approval requests
  - Filter theo priority, user reputation
  - Bulk approve/reject
  - Xem story preview
  - Thêm notes

**Features:**
- Quick review (approve/reject với 1 click)
- Bulk actions
- Search & filter
- Statistics (approval rate, average review time)

**Lợi ích:**
- ✅ Review nhanh chóng
- ✅ Quản lý hiệu quả
- ✅ Tracking tốt

---

### **10. Auto-Promote to AUTHOR (Tự động nâng cấp)**

**Cơ chế:**
- ✅ **Tự động nâng lên AUTHOR** khi:
  - Có ít nhất 5 truyện được approve
  - Reputation score > 50
  - Không có vi phạm trong 30 ngày
  - Tổng lượt xem > 10,000

**Implementation:**
```typescript
// Cron job hoặc trigger
async checkAndPromoteUser(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      authoredStories: {
        where: { isPublished: true },
      },
    },
  });
  
  const conditions = [
    user.approvedStories >= 5,
    user.reputationScore >= 50,
    user.violations === 0,
    user.authoredStories.reduce((sum, s) => sum + s.viewCount, 0) >= 10000,
  ];
  
  if (conditions.every(c => c === true)) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.AUTHOR },
    });
    
    // Notify user
    await this.notifyUser(userId, 'Chúc mừng! Bạn đã được nâng cấp lên tác giả.');
  }
}
```

**Lợi ích:**
- ✅ Khuyến khích tạo nội dung chất lượng
- ✅ Tự động hóa
- ✅ Giảm workload admin

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1 - Foundation (Tuần 1-2)
1. ✅ **Mở quyền tạo truyện cho USER**
   - Update backend: Cho phép USER tạo (nhưng DRAFT)
   - Update frontend: Hiển thị form cho USER

2. ✅ **Rate Limiting**
   - Implement draft limit
   - Implement daily limit
   - Add validation

3. ✅ **Approval System Integration**
   - Tích hợp với ApprovalRequest hiện có
   - Button "Gửi yêu cầu xuất bản" cho USER

### Phase 2 - Quality Control (Tuần 3-4)
4. ✅ **Content Filtering**
   - Banned keywords check
   - Duplicate detection
   - Basic validation

5. ✅ **User Reputation System**
   - Add fields to User model
   - Calculate reputation
   - Display reputation

6. ✅ **Guidelines & Warnings**
   - Modal hiển thị quy định
   - Checklist before submit

### Phase 3 - Advanced Features (Tuần 5-6)
7. ✅ **Priority Queue**
   - Add priority to ApprovalRequest
   - Auto-calculate priority
   - Admin dashboard filter

8. ✅ **Two-Stage Publishing**
   - Soft publish feature
   - Preview mode

9. ✅ **Penalty System**
   - Violation tracking
   - Auto-ban logic

### Phase 4 - Optimization (Tuần 7-8)
10. ✅ **Auto-Promote**
    - Cron job check
    - Notification system

11. ✅ **Moderation Dashboard Enhancement**
    - Better UI/UX
    - Statistics
    - Bulk actions

---

## 🎯 KẾT LUẬN

**Giải pháp đề xuất:**
1. ✅ **Approval System** - Kiểm soát 100% nội dung
2. ✅ **Rate Limiting** - Ngăn spam
3. ✅ **Reputation System** - Khuyến khích chất lượng
4. ✅ **Content Filtering** - Tự động chặn vi phạm
5. ✅ **Penalty System** - Răn đe

**Kết quả mong đợi:**
- ✅ Mọi user có thể tạo truyện
- ✅ Chất lượng được đảm bảo
- ✅ Giảm spam, vi phạm
- ✅ Workload admin quản lý được
- ✅ User experience tốt

**Rủi ro & Giảm thiểu:**
- ⚠️ **Rủi ro**: Admin quá tải với approval requests
  - **Giải pháp**: Priority queue, auto-filter, reputation system

- ⚠️ **Rủi ro**: User tạo nhiều nhưng không hoàn thiện
  - **Giải pháp**: Draft limit, yêu cầu có chapter trước khi publish

- ⚠️ **Rủi ro**: Vi phạm bản quyền
  - **Giải pháp**: Content filtering, approval required, penalty system
