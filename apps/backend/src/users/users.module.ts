import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ReadingHistoryModule } from '../reading-history/reading-history.module';
import { MonetizationModule } from '../monetization/monetization.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    forwardRef(() => ReadingHistoryModule),
    MonetizationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

