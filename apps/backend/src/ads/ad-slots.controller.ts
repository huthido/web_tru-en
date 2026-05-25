import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { AdSlotsService } from './ad-slots.service';
import { CreateAdSlotDto } from './dto/create-ad-slot.dto';
import { UpdateAdSlotDto } from './dto/update-ad-slot.dto';

@Controller('ad-slots')
export class AdSlotsController {
    constructor(private slots: AdSlotsService) { }

    /** Public — frontend gọi trực tiếp theo slotKey để render. */
    @Public()
    @Get('by-key/:key/active')
    findActiveBySlot(
        @Param('key') key: string,
        @Query('platform') platform?: 'web' | 'mobile',
    ) {
        return this.slots.findActiveAdsBySlot(key, platform);
    }

    /** Public — frontend đọc slot config (enabled, position, maxAds) để biết render hay không. */
    @Public()
    @Get('by-key/:key')
    findOneByKey(@Param('key') key: string) {
        return this.slots.findByKey(key);
    }

    // === Admin CRUD ===
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.slots.findAll();
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.slots.findOne(id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() dto: CreateAdSlotDto) {
        return this.slots.create(dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateAdSlotDto) {
        return this.slots.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.slots.remove(id);
    }
}
