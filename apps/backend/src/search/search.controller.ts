import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categories') categories?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    return this.searchService.searchStories(query, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      categories: categories ? categories.split(',').filter(Boolean) : undefined,
      status,
      sortBy,
    });
  }

  @Public()
  @Get('suggestions')
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    return this.searchService.getSuggestions(query, limit ? parseInt(limit, 10) : 10);
  }
}

/**
 * Admin-only: rebuild the Meilisearch index from Postgres.
 *   POST /api/admin/search/reindex
 */
@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSearchController {
  constructor(private readonly indexer: SearchIndexerService) {}

  @Post('reindex')
  async reindex() {
    if (!this.indexer.enabled) {
      return { success: false, message: 'Meilisearch is not configured (MEILI_HOST missing)' };
    }
    const result = await this.indexer.reindexAll();
    return { success: true, ...result };
  }
}

