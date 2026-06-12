import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminBugReportsController,
  AgentBugReportsController,
  BugReportsController,
} from './bug-reports.controller';
import { BugReportsService } from './bug-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    BugReportsController,
    AdminBugReportsController,
    AgentBugReportsController,
  ],
  providers: [BugReportsService],
})
export class BugReportsModule {}
