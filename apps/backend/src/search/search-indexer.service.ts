import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService, StoryDocument } from './meilisearch.service';

/**
 * Translates Prisma rows ↔ Meilisearch documents and orchestrates re-indexing.
 * Called from stories.service after every create/update/delete (best-effort —
 * failures are logged, never thrown, since search is non-critical).
 */
@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(
    private prisma: PrismaService,
    private meili: MeilisearchService,
  ) {}

  get enabled() {
    return this.meili.enabled;
  }

  async syncStory(storyId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const story = await this.prisma.story.findUnique({
        where: { id: storyId },
        include: {
          storyCategories: { include: { category: { select: { name: true } } } },
        },
      });
      if (!story) {
        await this.meili.deleteStory(storyId);
        return;
      }
      await this.meili.indexStory(this.toDocument(story));
    } catch (err: any) {
      this.logger.warn(`syncStory(${storyId}) failed: ${err.message}`);
    }
  }

  async removeStory(storyId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.meili.deleteStory(storyId);
    } catch (err: any) {
      this.logger.warn(`removeStory(${storyId}) failed: ${err.message}`);
    }
  }

  /** Full re-index. Admin-triggered. Streams in batches to keep memory low. */
  async reindexAll(batchSize = 500): Promise<{ indexed: number }> {
    if (!this.enabled) return { indexed: 0 };

    await this.meili.clearStories();

    let cursor: string | undefined;
    let indexed = 0;
    // Cursor-paginated for very large catalogs
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await this.prisma.story.findMany({
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        include: {
          storyCategories: { include: { category: { select: { name: true } } } },
        },
      });
      if (batch.length === 0) break;

      await this.meili.indexStories(batch.map((s) => this.toDocument(s)));
      indexed += batch.length;
      cursor = batch[batch.length - 1].id;
      if (batch.length < batchSize) break;
    }

    this.logger.log(`Meili reindex done — ${indexed} stories`);
    return { indexed };
  }

  private toDocument(story: any): StoryDocument {
    return {
      id: story.id,
      title: story.title,
      slug: story.slug,
      description: story.description || undefined,
      authorName: story.authorName || undefined,
      status: story.status,
      isPublished: story.isPublished,
      country: story.country || undefined,
      tags: Array.isArray(story.tags) ? story.tags : [],
      categories: (story.storyCategories || []).map((sc: any) => sc.category.name),
      viewCount: story.viewCount,
      rating: story.rating,
      followCount: story.followCount,
      likeCount: story.likeCount,
      createdAt: Math.floor(new Date(story.createdAt).getTime() / 1000),
      lastChapterAt: story.lastChapterAt
        ? Math.floor(new Date(story.lastChapterAt).getTime() / 1000)
        : undefined,
    };
  }
}
