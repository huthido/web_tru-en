# Lộ Trình Triển Khai
## Nền Tảng Đọc Truyện/Manga

**Trạng thái**: Foundation Hoàn Thành | Sẵn Sàng Triển Khai  
**Phương pháp**: Từng Bước, Theo Giai Đoạn, Git-based Workflow

---

## 📊 Timeline Tổng Quan

```
Phase 1: Data Model & Relations        [Tuần 1]
Phase 2: Authentication System         [Tuần 2]
Phase 3: Core Reading Features         [Tuần 3-4]
Phase 4: User Features                 [Tuần 5]
Phase 5: Social Features               [Tuần 6]
Phase 6: Content Management            [Tuần 7]
Phase 7: Enhancements & Polish         [Tuần 8+]
```

**Ước tính tổng**: 8-10 tuần cho MVP, 12-16 tuần cho bộ tính năng đầy đủ

---

## Phase 1: Data Model & Relations
**Mục tiêu**: Hoàn thiện database schema với tất cả relations, indexes, và constraints

### Database Tasks

1. **Thêm Prisma Relations**
   - User → Stories (quan hệ author)
   - Story → Chapters (one-to-many)
   - Story → Categories (many-to-many qua junction table)
   - User → Comments (one-to-many)
   - Story/Chapter → Comments (polymorphic)
   - Comment → Comment (self-referential cho nested comments)
   - User → Follows → Story (many-to-many)
   - User → ReadingHistory → Chapter (one-to-many)
   - User → ViewLog (optional user tracking)

2. **Thêm Database Indexes**
   - Story: slug, authorId, status, createdAt
   - Chapter: storyId, order, slug
   - Comment: userId, storyId, chapterId, parentId
   - Follow: userId, storyId (composite unique)
   - ReadingHistory: userId, chapterId (composite unique)
   - ViewLog: storyId, chapterId, createdAt

3. **Thêm Constraints & Validations**
   - Story slug uniqueness
   - Chapter order trong story
   - Email/username uniqueness
   - Foreign key constraints

4. **Tạo Junction Table**
   - StoryCategory (storyId, categoryId) cho many-to-many

5. **Thêm Missing Fields (nếu cần)**
   - Story: tags, rating, completion status
   - User: bio, displayName
   - Chapter: wordCount, readingTime

### Backend Tasks

1. **Cập nhật Prisma Schema**
   - Thêm tất cả relation fields
   - Thêm indexes
   - Thêm constraints
   - Cập nhật enums nếu cần

2. **Tạo Migration**
   - Generate migration: `prisma migrate dev --name add_relations`
   - Review migration SQL
   - Test migration rollback

3. **Cập nhật Shared Types**
   - Thêm relation types (UserWithStories, StoryWithChapters, etc.)
   - Thêm DTO types cho API responses
   - Thêm pagination types

4. **Tạo Prisma Helpers**
   - Include helpers cho common queries
   - Type-safe include/select utilities

### Frontend Tasks

1. **Cập nhật Shared Types Package**
   - Đồng bộ types với Prisma schema
   - Thêm relation types
   - Export updated types

2. **Không có thay đổi UI** (chỉ data model)

### Validation Checklist

- [ ] Tất cả relations đã định nghĩa trong Prisma schema
- [ ] Migration chạy thành công
- [ ] Foreign keys hoạt động đúng
- [ ] Indexes đã tạo cho performance
- [ ] Shared types đã cập nhật
- [ ] Không có breaking changes với existing models
- [ ] Database constraints được enforce

### Phase Output

- ✅ Prisma schema hoàn chỉnh với relations
- ✅ Migration đã apply vào database
- ✅ Shared types đã cập nhật
- ✅ Database sẵn sàng cho application logic

**Effort**: Medium | **Dependencies**: None | **Risk**: Low

---

## Phase 2: Authentication System
**Mục tiêu**: Hoàn thiện user authentication với JWT và HTTP-only cookies

### Database Tasks

1. **Kiểm tra User Model**
   - Đảm bảo password field sẵn sàng
   - Thêm refreshToken field (optional, cho refresh token strategy)
   - Thêm emailVerified field (optional, cho email verification)

2. **Tạo Seed Data** (optional)
   - Admin user để test
   - Test users với các roles khác nhau

### Backend Tasks

1. **Auth Module - DTOs**
   - Tạo RegisterDto (email, username, password, confirmPassword)
   - Tạo LoginDto (email/username, password)
   - Tạo ChangePasswordDto
   - Tạo UpdateProfileDto

2. **Auth Module - Service**
   - Implement register() - hash password, tạo user, return tokens
   - Implement login() - validate credentials, return tokens
   - Implement logout() - invalidate tokens (nếu dùng token blacklist)
   - Implement refreshToken() - generate new access token
   - Implement validateUser() - cho Passport strategy
   - Password hashing với bcrypt
   - JWT token generation (access + refresh)
   - Token validation

3. **Auth Module - Strategies**
   - Implement JWT Strategy (Passport)
   - Implement Local Strategy (cho login)
   - Tạo JWT Guard
   - Tạo Roles Guard (cho ADMIN, MODERATOR)

4. **Auth Module - Controller**
   - POST /auth/register
   - POST /auth/login
   - POST /auth/logout
   - POST /auth/refresh
   - GET /auth/me (current user)
   - POST /auth/change-password

5. **Auth Module - Guards**
   - JwtAuthGuard (protect routes)
   - RolesGuard (role-based access)
   - Optional: Public decorator (skip auth)

6. **Auth Module - Interceptors**
   - Cookie interceptor (set HTTP-only cookies)
   - Response interceptor (remove sensitive data)

7. **Users Module - Service**
   - Implement getProfile(userId)
   - Implement updateProfile(userId, data)
   - Implement getUserById(id)
   - Implement getUserByEmail(email)

8. **Users Module - Controller**
   - GET /users/me (protected)
   - PATCH /users/me (protected)
   - GET /users/:id (public, limited data)

9. **Error Handling**
   - Custom exceptions (UnauthorizedException, ForbiddenException)
   - Proper error messages

### Frontend Tasks

1. **Cài đặt TanStack React Query**
   - Setup QueryClient
   - Configure default options
   - Setup devtools (optional)

2. **Auth API Functions**
   - Tạo auth API service (register, login, logout, refresh, getMe)
   - Tạo users API service (getProfile, updateProfile)
   - Handle HTTP-only cookies trong Axios

3. **Auth Context Implementation**
   - Implement login() function
   - Implement logout() function
   - Implement checkAuth() function
   - Thêm loading states
   - Thêm error handling
   - Persist auth state (optional: localStorage cho UI state only)

4. **Auth Pages**
   - Tạo /login page (form, validation, error handling)
   - Tạo /register page (form, validation, error handling)
   - Tạo /forgot-password page (optional)
   - Redirect logic (sau login/register)

5. **Protected Route Component**
   - Implement authentication check
   - Implement role-based access
   - Loading states
   - Redirect to login nếu chưa authenticated

6. **User Profile Components**
   - Profile page structure
   - Profile edit form
   - Avatar upload (UI only, upload logic sau)

7. **Cập nhật API Client**
   - Thêm token refresh interceptor
   - Handle 401 errors (redirect to login)
   - Handle 403 errors (show forbidden message)

8. **Shared Types**
   - Thêm AuthResponse type
   - Thêm UserProfile type
   - Thêm Login/Register request types

### Validation Checklist

- [ ] User có thể register với email/username
- [ ] User có thể login với credentials
- [ ] JWT tokens được generate đúng
- [ ] HTTP-only cookies được set đúng
- [ ] Protected routes yêu cầu authentication
- [ ] Role-based access hoạt động
- [ ] Token refresh hoạt động
- [ ] Logout xóa cookies
- [ ] Password hashing secure
- [ ] Input validation trên tất cả endpoints
- [ ] Error handling đúng
- [ ] Frontend auth state management hoạt động
- [ ] Protected routes redirect đúng

### Phase Output

- ✅ Hệ thống authentication hoàn chỉnh
- ✅ User registration và login
- ✅ Protected routes hoạt động
- ✅ Role-based access control
- ✅ User profile management
- ✅ Secure token handling

**Effort**: High | **Dependencies**: Phase 1 | **Risk**: Medium (security critical)

---

## Phase 3: Core Reading Features
**Mục tiêu**: Users có thể browse, xem stories, và đọc chapters

### Database Tasks

1. **Kiểm tra Story & Chapter Models**
   - Đảm bảo tất cả required fields có mặt
   - Thêm indexes nếu thiếu
   - Verify slug generation logic

2. **Tạo Seed Data** (optional)
   - Sample stories với categories
   - Sample chapters để test
   - Sample categories

### Backend Tasks

1. **Categories Module - Service**
   - Implement findAll() - lấy tất cả categories
   - Implement findOne(slug) - lấy category theo slug
   - Implement create() - admin only
   - Implement update() - admin only
   - Implement delete() - admin only

2. **Categories Module - Controller**
   - GET /categories (public)
   - GET /categories/:slug (public)
   - POST /categories (admin)
   - PATCH /categories/:id (admin)
   - DELETE /categories/:id (admin)

3. **Stories Module - Service**
   - Implement findAll() - paginated, filtered theo category, status, search
   - Implement findOne(slug) - lấy story với chapters, author, categories
   - Implement create() - author tạo story
   - Implement update() - author update story của mình
   - Implement delete() - author hoặc admin
   - Implement publish() - đổi status thành PUBLISHED
   - Implement incrementViewCount() - track views
   - Slug generation utility
   - Search functionality (title, description)

4. **Stories Module - Controller**
   - GET /stories (public, paginated, filters)
   - GET /stories/:slug (public)
   - POST /stories (protected, author)
   - PATCH /stories/:id (protected, author hoặc admin)
   - DELETE /stories/:id (protected, author hoặc admin)
   - POST /stories/:id/publish (protected, author)
   - GET /stories/me (protected, author's stories)

5. **Chapters Module - Service**
   - Implement findAll(storyId) - lấy tất cả chapters của story, ordered
   - Implement findOne(storyId, chapterSlug) - lấy chapter content
   - Implement create() - author tạo chapter
   - Implement update() - author update chapter của mình
   - Implement delete() - author hoặc admin
   - Implement publish() - làm chapter visible
   - Implement incrementViewCount() - track views
   - Chapter ordering logic
   - Slug generation utility

6. **Chapters Module - Controller**
   - GET /stories/:storySlug/chapters (public)
   - GET /stories/:storySlug/chapters/:chapterSlug (public)
   - POST /stories/:storyId/chapters (protected, author)
   - PATCH /chapters/:id (protected, author hoặc admin)
   - DELETE /chapters/:id (protected, author hoặc admin)
   - POST /chapters/:id/publish (protected, author)

7. **ViewLog Module - Service** (optional, có thể trong Statistics)
   - Implement logView() - track story/chapter views
   - Implement getViewStats() - analytics

8. **Shared Utilities**
   - Slug generation helper
   - Pagination helper
   - Search helper
   - File upload helper (cho Cloudinary, structure only)

### Frontend Tasks

1. **Home Page**
   - Featured stories section
   - Recent stories section
   - Categories navigation
   - Search bar

2. **Stories Listing Page**
   - Paginated story grid/list
   - Filter theo category
   - Search functionality
   - Sort options (newest, popular, etc.)
   - Story card component (cover, title, author, stats)

3. **Story Detail Page**
   - Story information (title, description, cover, author)
   - Categories tags
   - Chapter list
   - Action buttons (follow, like - UI only)
   - Related stories section

4. **Chapter Reading Page**
   - Chapter content display
   - Reading progress indicator
   - Navigation (prev/next chapter)
   - Chapter list sidebar
   - Reading settings (font size, theme)
   - Save reading progress

5. **Author Dashboard** (nếu user là author)
   - My stories list
   - Create story button
   - Story management (edit, delete, publish)

6. **Story Creation/Edit Pages**
   - Story form (title, description, cover upload, categories)
   - Chapter creation form
   - Chapter editor (rich text hoặc markdown)
   - Preview functionality
   - Save as draft / Publish

7. **API Integration**
   - Stories API hooks (useStories, useStory, useCreateStory, etc.)
   - Chapters API hooks (useChapters, useChapter, etc.)
   - Categories API hooks (useCategories)
   - React Query mutations và queries
   - Optimistic updates nơi phù hợp

8. **Components**
   - StoryCard component
   - ChapterList component
   - ReadingView component
   - CategoryFilter component
   - SearchBar component
   - Pagination component

9. **State Management**
   - Reading progress state (current chapter, scroll position)
   - Reading preferences (font size, theme)
   - Story filters state

### Validation Checklist

- [ ] Users có thể browse tất cả stories
- [ ] Users có thể filter theo category
- [ ] Users có thể search stories
- [ ] Users có thể xem story details
- [ ] Users có thể đọc chapters
- [ ] Authors có thể tạo stories
- [ ] Authors có thể tạo chapters
- [ ] Authors có thể edit stories/chapters của họ
- [ ] Authors có thể publish stories/chapters
- [ ] View counts tăng đúng
- [ ] Pagination hoạt động
- [ ] Reading progress lưu
- [ ] Navigation giữa chapters hoạt động
- [ ] Tất cả API endpoints return đúng data
- [ ] Error handling trên tất cả pages
- [ ] Loading states được hiển thị

### Phase Output

- ✅ Trải nghiệm browse story hoàn chỉnh
- ✅ Chức năng đọc chapter
- ✅ Tạo và quản lý story
- ✅ Hệ thống category
- ✅ Search và filtering
- ✅ Tracking reading progress

**Effort**: High | **Dependencies**: Phase 2 | **Risk**: Medium

---

## Phase 4: User Features
**Mục tiêu**: User profiles, reading history, follows, và personalization

### Database Tasks

1. **Kiểm tra Models**
   - ReadingHistory model sẵn sàng
   - Follow model sẵn sàng
   - User model có tất cả fields cần thiết

2. **Thêm Indexes** (nếu chưa có trong Phase 1)
   - ReadingHistory: userId, lastRead
   - Follow: userId, createdAt

### Backend Tasks

1. **Follows Module - Service**
   - Implement followStory(userId, storyId)
   - Implement unfollowStory(userId, storyId)
   - Implement isFollowing(userId, storyId)
   - Implement getUserFollows(userId) - paginated
   - Implement getStoryFollowers(storyId) - paginated

2. **Follows Module - Controller**
   - POST /stories/:storyId/follow (protected)
   - DELETE /stories/:storyId/follow (protected)
   - GET /users/me/follows (protected)
   - GET /stories/:storyId/followers (public)

3. **ReadingHistory Module - Service**
   - Implement saveProgress(userId, chapterId, progress)
   - Implement getHistory(userId) - paginated, sorted theo lastRead
   - Implement getChapterProgress(userId, chapterId)
   - Implement clearHistory(userId) - optional
   - Implement getContinueReading(userId) - lấy last read chapters

4. **ReadingHistory Module - Controller**
   - POST /chapters/:chapterId/progress (protected)
   - GET /users/me/history (protected)
   - GET /chapters/:chapterId/progress (protected)
   - GET /users/me/continue-reading (protected)
   - DELETE /users/me/history (protected, optional)

5. **Users Module - Enhancements**
   - Implement getUserStats(userId) - stories count, followers, etc.
   - Implement getPublicProfile(userId) - public user info
   - Implement updateAvatar() - handle image upload to Cloudinary

6. **Stories Module - Enhancements**
   - Thêm like/unlike functionality (nếu chưa có trong Phase 3)
   - Implement getLikedStories(userId)
   - Update likeCount trên story model

### Frontend Tasks

1. **User Profile Page**
   - Hiển thị thông tin profile
   - Avatar upload
   - Bio editing
   - User statistics (stories read, stories followed, etc.)
   - Public profile view

2. **Reading History Page**
   - Danh sách recently read stories
   - Continue reading section
   - Progress indicators
   - Clear history option

3. **My Library Page**
   - Followed stories list
   - Liked stories list (nếu đã implement)
   - Reading history
   - Personal collections

4. **Story Actions**
   - Follow/Unfollow button (với state)
   - Like button (nếu đã implement)
   - Bookmark functionality (optional)

5. **Continue Reading Widget**
   - Home page widget
   - Quick access đến last read chapters
   - Progress indicators

6. **API Integration**
   - Follows API hooks (useFollowStory, useUnfollowStory, useIsFollowing)
   - ReadingHistory API hooks (useSaveProgress, useHistory, useContinueReading)
   - User stats hooks

7. **Components**
   - FollowButton component
   - ReadingHistoryList component
   - ContinueReadingCard component
   - UserStats component

8. **State Management**
   - Follow state (optimistic updates)
   - Reading progress state (auto-save)
   - User preferences

### Validation Checklist

- [ ] Users có thể follow/unfollow stories
- [ ] Follow state persist
- [ ] Reading progress tự động lưu
- [ ] Users có thể xem reading history
- [ ] Continue reading hoạt động
- [ ] User profile hiển thị đúng
- [ ] Avatar upload hoạt động (nếu đã implement)
- [ ] User statistics chính xác
- [ ] Tất cả protected endpoints yêu cầu auth
- [ ] Optimistic updates hoạt động mượt

### Phase Output

- ✅ User profiles hoạt động
- ✅ Tracking reading history
- ✅ Hệ thống follow/unfollow
- ✅ Tính năng continue reading
- ✅ Personal library

**Effort**: Medium | **Dependencies**: Phase 3 | **Risk**: Low

---

## Phase 5: Social Features
**Mục tiêu**: Comments, nested replies, và user interactions

### Database Tasks

1. **Kiểm tra Comment Model**
   - Đảm bảo parentId cho nesting hoạt động
   - Thêm indexes: userId, storyId, chapterId, parentId, createdAt

2. **Optional Enhancements**
   - Thêm likeCount vào Comment
   - Thêm isEdited flag
   - Thêm editedAt timestamp

### Backend Tasks

1. **Comments Module - Service**
   - Implement create(userId, storyId/chapterId, content, parentId)
   - Implement findAll(storyId/chapterId) - lấy tất cả comments với nested replies
   - Implement findOne(commentId)
   - Implement update(commentId, userId, content) - chỉ comments của mình
   - Implement delete(commentId, userId) - soft delete hoặc hard delete
   - Implement likeComment(commentId, userId) - optional
   - Nested comment tree building logic
   - Comment moderation (admin/moderator có thể xóa bất kỳ)

2. **Comments Module - Controller**
   - GET /stories/:storyId/comments (public)
   - GET /chapters/:chapterId/comments (public)
   - POST /stories/:storyId/comments (protected)
   - POST /chapters/:chapterId/comments (protected)
   - POST /comments/:commentId/reply (protected)
   - PATCH /comments/:commentId (protected, own comment)
   - DELETE /comments/:commentId (protected, own hoặc admin)
   - POST /comments/:commentId/like (protected, optional)

3. **Comments Module - DTOs**
   - CreateCommentDto
   - UpdateCommentDto
   - CommentResponseDto (với nested replies)

### Frontend Tasks

1. **Comments Section Component**
   - Hiển thị comments với nesting
   - Reply functionality
   - Edit/Delete own comments
   - Like button (nếu đã implement)
   - Load more comments (pagination)
   - Sort options (newest, oldest, most liked)

2. **Comment Form Component**
   - Text input/textarea
   - Character count
   - Submit button
   - Validation
   - Rich text editor (optional)

3. **Comment Item Component**
   - User avatar và name
   - Comment content
   - Timestamp
   - Reply button
   - Edit/Delete buttons (nếu own comment)
   - Like button (nếu đã implement)
   - Hiển thị nested replies

4. **Story/Chapter Pages Integration**
   - Thêm comments section vào story detail page
   - Thêm comments section vào chapter reading page
   - Scroll to comments functionality

5. **API Integration**
   - Comments API hooks (useComments, useCreateComment, useUpdateComment, useDeleteComment)
   - Nested comment tree building
   - Optimistic updates

6. **Moderation** (nếu admin)
   - Admin comment deletion
   - Report comment functionality (optional)

### Validation Checklist

- [ ] Users có thể post comments trên stories
- [ ] Users có thể post comments trên chapters
- [ ] Users có thể reply comments (nested)
- [ ] Nested comments hiển thị đúng
- [ ] Users có thể edit own comments
- [ ] Users có thể delete own comments
- [ ] Admin có thể delete bất kỳ comment
- [ ] Comments pagination hoạt động
- [ ] Comment validation hoạt động
- [ ] Real-time updates (nếu đã implement) hoặc refresh hoạt động

### Phase Output

- ✅ Hệ thống commenting hoàn chỉnh
- ✅ Nested replies
- ✅ Comment moderation
- ✅ User interactions

**Effort**: Medium | **Dependencies**: Phase 2, Phase 3 | **Risk**: Low

---

## Phase 6: Content Management
**Mục tiêu**: Admin panel, category management, content moderation

### Database Tasks

1. **Admin-Specific Data**
   - Verify User model có role field
   - Thêm admin-specific indexes nếu cần

2. **Analytics Tables** (nếu không dùng ViewLog)
   - Tạo analytics aggregation tables (optional)

### Backend Tasks

1. **Admin Module - Service**
   - Implement getDashboardStats() - users, stories, views, etc.
   - Implement getAllUsers() - paginated, filtered
   - Implement updateUserRole(userId, role)
   - Implement banUser(userId)
   - Implement getAllStories() - tất cả stories, filtered
   - Implement moderateStory(storyId, action)
   - Implement getAllComments() - tất cả comments, filtered
   - Implement moderateComment(commentId, action)
   - Implement getSystemStats() - database size, etc.

2. **Admin Module - Controller**
   - GET /admin/dashboard (admin only)
   - GET /admin/users (admin only)
   - PATCH /admin/users/:id/role (admin only)
   - PATCH /admin/users/:id/ban (admin only)
   - GET /admin/stories (admin only)
   - PATCH /admin/stories/:id/moderate (admin only)
   - GET /admin/comments (admin only)
   - PATCH /admin/comments/:id/moderate (admin only)
   - GET /admin/statistics (admin only)

3. **Categories Module - Admin Endpoints**
   - Đã có trong Phase 3, verify admin guards

4. **Statistics Module - Service**
   - Implement getStoryStats(storyId)
   - Implement getPlatformStats()
   - Implement getUserActivity(userId)
   - Implement getPopularStories(timeframe)
   - Implement getTrendingStories()

5. **Statistics Module - Controller**
   - GET /statistics/stories/:storyId (public hoặc protected)
   - GET /statistics/platform (admin)
   - GET /statistics/popular (public)
   - GET /statistics/trending (public)

6. **Cloudinary Integration** (nếu chưa làm trước đó)
   - Implement image upload service
   - Implement image deletion service
   - Implement image optimization settings

### Frontend Tasks

1. **Admin Dashboard Page**
   - Overview statistics cards
   - Charts/graphs (users, stories, views theo thời gian)
   - Recent activity feed
   - Quick actions

2. **Admin Users Management**
   - Users list table
   - Filter và search
   - Role management
   - Ban/unban users
   - User details view

3. **Admin Stories Management**
   - Tất cả stories list
   - Filter theo status, author
   - Moderate stories (approve, reject, feature)
   - Story details view

4. **Admin Comments Management**
   - Tất cả comments list
   - Filter theo story, user
   - Moderate comments (approve, delete)
   - Comment details view

5. **Admin Categories Management**
   - Categories list
   - Create/edit/delete categories
   - Category details

6. **Statistics Pages**
   - Story statistics page (views, likes, comments)
   - Platform statistics (admin only)
   - Popular stories page
   - Trending stories page

7. **Image Upload Components**
   - Image upload component (cho stories, avatars)
   - Image preview
   - Image cropping (optional)
   - Progress indicator

8. **API Integration**
   - Admin API hooks (useAdminDashboard, useAdminUsers, etc.)
   - Statistics API hooks
   - Image upload hooks

9. **Role-Based UI**
   - Show/hide admin sections dựa trên role
   - Admin navigation menu
   - Admin layout wrapper

### Validation Checklist

- [ ] Admin có thể truy cập dashboard
- [ ] Admin có thể xem tất cả users
- [ ] Admin có thể đổi user roles
- [ ] Admin có thể ban users
- [ ] Admin có thể moderate stories
- [ ] Admin có thể moderate comments
- [ ] Admin có thể quản lý categories
- [ ] Statistics hiển thị đúng
- [ ] Image upload hoạt động
- [ ] Role-based access được enforce
- [ ] Non-admins không thể truy cập admin routes

### Phase Output

- ✅ Admin panel hoàn chỉnh
- ✅ Content moderation tools
- ✅ Statistics và analytics
- ✅ Hệ thống image upload
- ✅ Role-based access control

**Effort**: High | **Dependencies**: Phase 2, Phase 3, Phase 5 | **Risk**: Medium

---

## Phase 7: Enhancements & Polish
**Mục tiêu**: Search, recommendations, performance, và UX improvements

### Database Tasks

1. **Search Optimization**
   - Thêm full-text search indexes (PostgreSQL)
   - Thêm search vectors nếu dùng full-text search
   - Optimize slow queries

2. **Performance Indexes**
   - Review và thêm missing indexes
   - Analyze query performance

### Backend Tasks

1. **Search Module - Service** (nếu chưa có trong Stories)
   - Implement full-text search (stories, chapters)
   - Implement advanced search (filters, sorting)
   - Implement search suggestions
   - Implement search history (optional)

2. **Search Module - Controller**
   - GET /search?q=query (public)
   - GET /search/suggestions?q=query (public)

3. **Recommendations Module - Service**
   - Implement getSimilarStories(storyId) - dựa trên categories, tags
   - Implement getRecommendedStories(userId) - dựa trên reading history
   - Implement getTrendingStories() - dựa trên views, likes, time
   - Implement getNewReleases() - recently published

4. **Recommendations Module - Controller**
   - GET /stories/:storyId/similar (public)
   - GET /stories/recommended (protected)
   - GET /stories/trending (public)
   - GET /stories/new (public)

5. **Notifications Module** (optional)
   - Implement notification service
   - Implement email notifications (optional)
   - Implement in-app notifications

6. **Performance Optimizations**
   - Thêm response caching (Redis optional, hoặc in-memory)
   - Optimize database queries
   - Thêm pagination vào tất cả list endpoints
   - Implement lazy loading cho images

7. **API Enhancements**
   - Thêm API versioning (optional)
   - Thêm rate limiting per endpoint
   - Thêm request logging
   - Thêm health check endpoint

### Frontend Tasks

1. **Search Page**
   - Search input với autocomplete
   - Search results display
   - Advanced filters
   - Search history
   - No results state

2. **Recommendations**
   - Similar stories section
   - Recommended for you section
   - Trending stories section
   - New releases section

3. **Performance Optimizations**
   - Image lazy loading
   - Code splitting
   - Route-based code splitting
   - Optimize bundle size
   - Thêm service worker (optional, PWA)

4. **UX Improvements**
   - Loading skeletons
   - Error boundaries
   - Toast notifications
   - Confirmation dialogs
   - Keyboard shortcuts
   - Accessibility improvements (ARIA labels, keyboard navigation)

5. **Mobile Responsiveness**
   - Test tất cả pages trên mobile
   - Optimize touch interactions
   - Responsive images
   - Mobile navigation

6. **SEO Enhancements**
   - Meta tags cho tất cả pages
   - Open Graph tags
   - Structured data (JSON-LD)
   - Sitemap generation
   - robots.txt

7. **Analytics Integration** (optional)
   - Google Analytics hoặc tương tự
   - Event tracking
   - User behavior tracking

8. **Error Handling**
   - Global error boundary
   - 404 page
   - 500 error page
   - Network error handling
   - Retry mechanisms

### Validation Checklist

- [ ] Search hoạt động đúng
- [ ] Recommendations có liên quan
- [ ] Performance chấp nhận được (< 3s load time)
- [ ] Tất cả pages responsive trên mobile
- [ ] SEO tags đúng
- [ ] Error handling hoạt động
- [ ] Loading states mượt
- [ ] Images load hiệu quả
- [ ] Accessibility standards đạt được
- [ ] Tất cả features hoạt động trên mobile

### Phase Output

- ✅ Full-text search
- ✅ Recommendation system
- ✅ Performance optimizations
- ✅ Mobile responsive
- ✅ SEO optimized
- ✅ Production-ready polish

**Effort**: High | **Dependencies**: Tất cả previous phases | **Risk**: Low

---

## Technical Risks & Mitigation

### Risk 1: Database Performance
**Risk**: Slow queries khi data tăng  
**Mitigation**: 
- Thêm indexes trong Phase 1
- Dùng pagination ở mọi nơi
- Monitor query performance
- Cân nhắc database read replicas để scale

### Risk 2: Authentication Security
**Risk**: Security vulnerabilities trong auth implementation  
**Mitigation**:
- Dùng proven libraries (bcrypt, JWT)
- Tuân theo OWASP guidelines
- Regular security audits
- Test authentication kỹ lưỡng

### Risk 3: Image Upload & Storage
**Risk**: Large files, storage costs, CDN performance  
**Mitigation**:
- Dùng Cloudinary (handles optimization)
- Implement file size limits
- Compress images
- Dùng lazy loading trên frontend

### Risk 4: Nested Comments Performance
**Risk**: Slow loading với deep nesting  
**Mitigation**:
- Giới hạn nesting depth
- Dùng efficient tree building algorithm
- Paginate comments
- Cân nhắc caching

### Risk 5: Real-time Features (nếu thêm)
**Risk**: Complexity của WebSocket implementation  
**Mitigation**:
- Bắt đầu với polling
- Thêm WebSocket sau nếu cần
- Dùng proven libraries (Socket.io)

### Risk 6: Search Scalability
**Risk**: Full-text search có thể chậm  
**Mitigation**:
- Dùng PostgreSQL full-text search
- Thêm proper indexes
- Cân nhắc Elasticsearch nếu cần sau này
- Implement search result caching

---

## Git Workflow Recommendations

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/phase-X-task-name` - Feature branches
- `hotfix/issue-name` - Critical fixes

### Commit Strategy
- Một commit cho mỗi logical task
- Clear commit messages
- Reference phase/task trong commit

### Example Workflow
```bash
# Bắt đầu phase mới
git checkout -b develop
git checkout -b feature/phase-2-auth-login

# Làm việc trên task
# ... implement login ...

# Commit
git commit -m "Phase 2: Implement user login endpoint"

# Merge vào develop
git checkout develop
git merge feature/phase-2-auth-login

# Sau khi phase hoàn thành, merge vào main
git checkout main
git merge develop
```

---

## Estimated Effort Summary

| Phase | Effort | Duration | Priority |
|-------|--------|----------|----------|
| Phase 1: Data Model | Medium | 1 tuần | Critical |
| Phase 2: Authentication | High | 1 tuần | Critical |
| Phase 3: Core Reading | High | 2 tuần | Critical |
| Phase 4: User Features | Medium | 1 tuần | High |
| Phase 5: Social Features | Medium | 1 tuần | High |
| Phase 6: Content Management | High | 1 tuần | Medium |
| Phase 7: Enhancements | High | 2+ tuần | Medium |

**MVP (Phases 1-4)**: 5 tuần  
**Full Feature Set**: 8-10 tuần  
**With Polish**: 12-16 tuần

---

## Success Criteria

### MVP Complete Khi:
- ✅ Users có thể register và login
- ✅ Users có thể browse và đọc stories
- ✅ Authors có thể tạo stories và chapters
- ✅ Users có thể track reading progress
- ✅ Users có thể follow stories

### Full Platform Complete Khi:
- ✅ Tất cả MVP features
- ✅ Comments và social features
- ✅ Admin panel hoạt động
- ✅ Search và recommendations
- ✅ Mobile responsive
- ✅ Production-ready performance

---

**Document Version**: 1.0  
**Last Updated**: Initial Creation  
**Next Review**: Sau khi Phase 1 hoàn thành
