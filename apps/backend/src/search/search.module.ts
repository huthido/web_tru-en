import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController, AdminSearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MeilisearchService } from './meilisearch.service';
import { SearchIndexerService } from './search-indexer.service';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController, AdminSearchController],
  providers: [SearchService, MeilisearchService, SearchIndexerService],
  exports: [SearchService, SearchIndexerService, MeilisearchService],
})
export class SearchModule {}
