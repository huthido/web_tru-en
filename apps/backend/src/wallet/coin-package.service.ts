import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoinPackageDto } from './dto/create-coin-package.dto';
import { UpdateCoinPackageDto } from './dto/update-coin-package.dto';

@Injectable()
export class CoinPackageService {
    constructor(private prisma: PrismaService) { }

    async findAll(includeInactive: boolean = false) {
        return this.prisma.coinPackage.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { priceVND: 'asc' },
        });
    }

    async findOne(id: string) {
        const pkg = await this.prisma.coinPackage.findUnique({
            where: { id },
        });
        if (!pkg) {
            throw new NotFoundException('Gói xu không tồn tại');
        }
        return pkg;
    }

    async create(createDto: CreateCoinPackageDto) {
        return this.prisma.coinPackage.create({
            data: createDto,
        });
    }

    async update(id: string, updateDto: UpdateCoinPackageDto) {
        await this.findOne(id); // Ensure exists
        return this.prisma.coinPackage.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Ensure exists
        return this.prisma.coinPackage.delete({
            where: { id },
        });
    }
}
