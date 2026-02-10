import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CoinPackageService } from './coin-package.service';
import { CreateCoinPackageDto } from './dto/create-coin-package.dto';
import { UpdateCoinPackageDto } from './dto/update-coin-package.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/coin-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCoinPackageController {
    constructor(private readonly coinPackageService: CoinPackageService) { }

    @Get()
    findAll(@Query('includeInactive') includeInactive?: string) {
        return this.coinPackageService.findAll(includeInactive === 'true');
    }

    @Post()
    create(@Body() createDto: CreateCoinPackageDto) {
        return this.coinPackageService.create(createDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCoinPackageDto) {
        return this.coinPackageService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.coinPackageService.remove(id);
    }
}
