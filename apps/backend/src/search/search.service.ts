import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoryStatus } from '@prisma/client';
import { storyInclude } from '../prisma/prisma.helpers';
import { MeilisearchService } from './meilisearch.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class SearchService {
  // Simple in-memory cache (consider Redis for production)
  private searchCache = new Map<string, CacheEntry<any>>();
  private suggestionsCache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SUGGESTIONS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(
    private prisma: PrismaService,
    private meili: MeilisearchService,
  ) { }

  private getCacheKey(query: string, options?: any): string {
    return JSON.stringify({ query, options });
  }

  private getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Limit cache size (keep last 100 entries)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  async searchStories(query: string, options?: {
    page?: number;
    limit?: number;
    categories?: string[];
    status?: string;
    sortBy?: string;
  }) {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(searchTerm, options);
    const cached = this.getCached(this.searchCache, cacheKey);
    if (cached) {
      return cached;
    }

    // --- Meilisearch path (when configured) ---
    if (this.meili.enabled) {
      const meiliResult = await this.searchViaMeili(searchTerm, options);
      if (meiliResult) {
        this.setCache(this.searchCache, cacheKey, meiliResult, this.CACHE_TTL);
        return meiliResult;
      }
      // fall through to Postgres if Meili call failed
    }

    // Build where clause with full-text search
    const where: any = {
      isPublished: true,
      status: StoryStatus.PUBLISHED,
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    };

    // Add category filter
    if (options?.categories && options.categories.length > 0) {
      where.storyCategories = {
        some: {
          category: {
            slug: { in: options.categories },
          },
        },
      };
    }

    // Get total count
    const total = await this.prisma.story.count({ where });

    // Get results
    const stories = await this.prisma.story.findMany({
      where,
      include: storyInclude,
      orderBy: this.getOrderBy(options?.sortBy),
      skip,
      take: limit,
    });

    const result = {
      data: stories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    // Cache result
    this.setCache(this.searchCache, cacheKey, result, this.CACHE_TTL);

    return result;
  }

  async getSuggestions(query: string, limit: number = 10) {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      return [];
    }

    // Check cache
    const cacheKey = `${searchTerm}:${limit}`;
    const cached = this.getCached(this.suggestionsCache, cacheKey);
    if (cached) {
      return cached;
    }

    // Get story titles and slugs that match
    const stories = await this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: {
          not: StoryStatus.DRAFT, // Exclude drafts only
        },
        title: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        authorName: true,
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
    });

    // Cache result
    this.setCache(this.suggestionsCache, cacheKey, stories, this.SUGGESTIONS_CACHE_TTL);

    return stories;
  }

  private getOrderBy(sortBy?: string): any {
    switch (sortBy) {
      case 'popular':
        return { viewCount: 'desc' as const };
      case 'rating':
        return { rating: 'desc' as const };
      case 'newest':
      default:
        return { createdAt: 'desc' as const };
    }
  }

  /**
   * Query Meilisearch and hydrate full story rows from Postgres
   * (so the response shape matches the legacy LIKE path).
   * Returns null on error — caller should fall back to Postgres.
   */
  private async searchViaMeili(
    query: string,
    options?: { page?: number; limit?: number; categories?: string[]; sortBy?: string },
  ) {
    try {
      const index = this.meili.getStoriesIndex();
      if (!index) return null;

      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const filters: string[] = ['isPublished = true', 'status = "PUBLISHED"'];
      if (options?.categories?.length) {
        const list = options.categories.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(', ');
        filters.push(`categories IN [${list}]`);
      }
      const sortMap: Record<string, string[]> = {
        popular: ['viewCount:desc'],
        rating: ['rating:desc'],
        newest: ['createdAt:desc'],
      };
      const sort = sortMap[options?.sortBy || 'newest'];

      const result = await index.search(query, {
        offset: (page - 1) * limit,
        limit,
        filter: filters,
        sort,
        attributesToRetrieve: ['id'],
      });

      const ids = result.hits.map((h) => h.id);
      if (ids.length === 0) {
        return {
          data: [],
          meta: {
            page,
            limit,
            total: result.estimatedTotalHits || 0,
            totalPages: Math.ceil((result.estimatedTotalHits || 0) / limit),
            hasNext: page * limit < (result.estimatedTotalHits || 0),
            hasPrev: page > 1,
          },
        };
      }

      // Hydrate from Postgres preserving Meili's ranking order
      const stories = await this.prisma.story.findMany({
        where: { id: { in: ids } },
        include: storyInclude,
      });
      const byId = new Map(stories.map((s) => [s.id, s]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      const total = result.estimatedTotalHits || ordered.length;
      return {
        data: ordered,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch {
      return null;
    }
  }
}
