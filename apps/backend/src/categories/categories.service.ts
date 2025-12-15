import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug, generateUniqueSlug } from '../common/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        storyCategories: {
          include: {
            story: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                viewCount: true,
                rating: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Thể loại không tồn tại');
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const baseSlug = generateSlug(createCategoryDto.name);

    // Check if slug exists
    const slugExists = async (slug: string) => {
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });
      return !!existing;
    };

    const slug = await generateUniqueSlug(baseSlug, slugExists);

    // Check if name already exists
    const existingName = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingName) {
      throw new ConflictException('Tên thể loại đã tồn tại');
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description,
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Thể loại không tồn tại');
    }

    const updateData: any = {};

    if (updateCategoryDto.name) {
      // Check if new name conflicts with existing
      const existingName = await this.prisma.category.findFirst({
        where: {
          name: updateCategoryDto.name,
          id: { not: id },
        },
      });

      if (existingName) {
        throw new ConflictException('Tên thể loại đã tồn tại');
      }

      const baseSlug = generateSlug(updateCategoryDto.name);
      const slugExists = async (slug: string) => {
        const existing = await this.prisma.category.findFirst({
          where: { slug, id: { not: id } },
        });
        return !!existing;
      };

      updateData.name = updateCategoryDto.name;
      updateData.slug = await generateUniqueSlug(baseSlug, slugExists);
    }

    if (updateCategoryDto.description !== undefined) {
      updateData.description = updateCategoryDto.description;
    }

    return this.prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        storyCategories: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Thể loại không tồn tại');
    }

    // Check if category has stories
    if (category.storyCategories.length > 0) {
      throw new ConflictException(
        'Không thể xóa thể loại đang có truyện. Vui lòng xóa hoặc chuyển truyện trước.'
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}

