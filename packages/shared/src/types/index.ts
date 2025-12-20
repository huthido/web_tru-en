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
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  UPLOADER = 'UPLOADER',
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

