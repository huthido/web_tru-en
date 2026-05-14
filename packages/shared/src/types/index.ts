// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  displayName?: string;
  bio?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  provider?: string;
  providerId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'USER',
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN',
}

// Story types
export interface Story {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  authorId: string;
  authorName?: string;
  status: StoryStatus;
  isPublished: boolean;
  viewCount: number;
  likeCount: number;
  followCount: number;
  rating: number;
  ratingCount: number;
  country?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastChapterAt?: string;
}

export enum StoryStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

// Chapter types
export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  slug: string;
  content: string;
  images: string[];
  order: number;
  isPublished: boolean;
  viewCount: number;
  wordCount: number;
  readingTime: number;
  uploaderId?: string;
  createdAt: string;
  updatedAt: string;
}

// Comment types
export interface Comment {
  id: string;
  userId: string;
  storyId?: string;
  chapterId?: string;
  content: string;
  parentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Follow types
export interface Follow {
  id: string;
  userId: string;
  storyId: string;
  createdAt: string;
}

// Favorite types
export interface Favorite {
  id: string;
  userId: string;
  storyId: string;
  createdAt: string;
}

// Rating types
export interface Rating {
  id: string;
  userId: string;
  storyId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

// ReadingHistory types
export interface ReadingHistory {
  id: string;
  userId: string;
  chapterId: string;
  storyId?: string;
  progress: number;
  lastRead: string;
  createdAt: string;
  updatedAt: string;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// Banner types
export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: string;
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ContentReport types
export interface ContentReport {
  id: string;
  userId?: string;
  storyId?: string;
  chapterId?: string;
  reportType: string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

// Relation types (for API responses with relations)
export interface UserWithStories extends User {
  authoredStories?: Story[];
}

export interface StoryWithChapters extends Omit<Story, 'tags'> {
  chapters?: Chapter[];
  author?: User;
  categories?: Category[];
  tags?: Tag[] | string[];
}

export interface StoryWithDetails extends Omit<Story, 'tags'> {
  author?: User;
  chapters?: Chapter[];
  categories?: Category[];
  tags?: Tag[] | string[];
  isFollowing?: boolean;
  isFavorite?: boolean;
  userRating?: number;
}

export interface ChapterWithStory extends Chapter {
  story?: Story;
  uploader?: User;
}

export interface CommentWithReplies extends Comment {
  user?: User;
  replies?: CommentWithReplies[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Sort types
export interface StoryFilters {
  category?: string;
  status?: StoryStatus;
  country?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'rating' | 'views' | 'updated';
  page?: number;
  limit?: number;
}

export interface ChapterFilters {
  storyId: string;
  isPublished?: boolean;
  sortBy?: 'order' | 'newest' | 'oldest';
}

// Auth types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
  message?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
}

// Approval workflow
export enum ApprovalType {
  STORY_PUBLISH = 'STORY_PUBLISH',
  CHAPTER_PUBLISH = 'CHAPTER_PUBLISH',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  storyId?: string;
  chapterId?: string;
  type: ApprovalType;
  status: ApprovalStatus;
  message?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Wallet / Coin economy
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  PURCHASE_CHAPTER = 'PURCHASE_CHAPTER',
  ADMIN_ADJUST = 'ADMIN_ADJUST',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  DONATE_AUTHOR = 'DONATE_AUTHOR',
}

export interface UserWallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoinTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  priceVND: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterPurchase {
  id: string;
  userId: string;
  chapterId: string;
  pricePaid: number;
  createdAt: string;
}

export interface AuthorDonation {
  id: string;
  userId: string;
  authorId: string;
  storyId?: string;
  amount: number;
  message?: string;
  createdAt: string;
}

// Ads
export enum AdType {
  POPUP = 'POPUP',
  BANNER = 'BANNER',
  SIDEBAR = 'SIDEBAR',
}

export enum AdPosition {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  SIDEBAR_LEFT = 'SIDEBAR_LEFT',
  SIDEBAR_RIGHT = 'SIDEBAR_RIGHT',
  INLINE = 'INLINE',
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  spent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ad {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  type: AdType;
  position: AdPosition;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  clickCount: number;
  viewCount: number;
  impressions: number;
  popupInterval?: number;
  priority: number;
  campaignId?: string;
  targetAudience?: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

// Notifications
export enum NotificationType {
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  MAINTENANCE = 'MAINTENANCE',
  NEW_FEATURE = 'NEW_FEATURE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  targetRole?: UserRole;
  sendEmail: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecipient {
  id: string;
  notificationId: string;
  userId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// CMS / Settings
export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  siteName: string;
  siteDescription?: string;
  siteLogo?: string;
  siteFavicon?: string;
  siteEmail?: string;
  sitePhone?: string;
  siteAddress?: string;
  siteFacebook?: string;
  siteTwitter?: string;
  siteX?: string;
  siteYoutube?: string;
  siteInstagram?: string;
  siteTikTok?: string;
  siteLinkedIn?: string;
  siteThreads?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  createdAt: string;
  updatedAt: string;
}

// User uploaded images
export interface UserImage {
  id: string;
  userId: string;
  url: string;
  folder: string;
  filename: string;
  size: number;
  createdAt: string;
}

