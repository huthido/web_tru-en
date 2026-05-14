import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';

export interface StoryDocument {
  id: string;
  title: string;
  slug: string;
  description?: string;
  authorName?: string;
  status: string;
  isPublished: boolean;
  country?: string;
  tags: string[];
  categories: string[];
  viewCount: number;
  rating: number;
  followCount: number;
  likeCount: number;
  createdAt: number; // unix seconds — numeric so Meili can sort/filter
  lastChapterAt?: number;
}

export const STORIES_INDEX = 'stories';

/**
 * Thin wrapper around the official Meilisearch client.
 * `enabled` is false when MEILI_HOST is not configured — callers must check it
 * and fall back to Postgres LIKE.
 */
@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch | null = null;
  private storiesIndex: Index<StoryDocument> | null = null;
  public readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MEILI_HOST');
    const key = this.config.get<string>('MEILI_API_KEY');
    this.enabled = !!host;
    if (this.enabled) {
      this.client = new MeiliSearch({ host: host!, apiKey: key });
      this.logger.log(`Meilisearch enabled — host: ${host}`);
    } else {
      this.logger.warn('MEILI_HOST not set — full-text search falls back to Postgres LIKE.');
    }
  }

  async onModuleInit() {
    if (!this.enabled || !this.client) return;
    try {
      this.storiesIndex = this.client.index<StoryDocument>(STORIES_INDEX);
      // Ensure index exists + has the right schema (idempotent)
      await this.client.createIndex(STORIES_INDEX, { primaryKey: 'id' }).catch(() => undefined);
      await this.storiesIndex.updateSettings({
        searchableAttributes: ['title', 'authorName', 'description', 'tags', 'categories'],
        filterableAttributes: ['isPublished', 'status', 'country', 'categories', 'tags'],
        sortableAttributes: ['createdAt', 'lastChapterAt', 'viewCount', 'rating', 'followCount', 'likeCount'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      });
      this.logger.log('Meilisearch stories index ready');
    } catch (err: any) {
      this.logger.error(`Meilisearch init failed: ${err.message}`);
    }
  }

  getStoriesIndex(): Index<StoryDocument> | null {
    return this.storiesIndex;
  }

  async indexStory(doc: StoryDocument): Promise<void> {
    if (!this.storiesIndex) return;
    await this.storiesIndex.addDocuments([doc]);
  }

  async indexStories(docs: StoryDocument[]): Promise<void> {
    if (!this.storiesIndex || docs.length === 0) return;
    await this.storiesIndex.addDocuments(docs);
  }

  async deleteStory(id: string): Promise<void> {
    if (!this.storiesIndex) return;
    await this.storiesIndex.deleteDocument(id);
  }

  async clearStories(): Promise<void> {
    if (!this.storiesIndex) return;
    await this.storiesIndex.deleteAllDocuments();
  }
}
