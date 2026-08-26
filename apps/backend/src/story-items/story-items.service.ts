import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateStoryItemDto } from './dto/create-story-item.dto';
import { UpdateStoryItemDto } from './dto/update-story-item.dto';

@Injectable()
export class StoryItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  private async assertStoryOwner(storyId: string, userId: string, isAdmin: boolean) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, authorId: true },
    });
    if (!story) throw new NotFoundException('Truyện không tồn tại');
    if (!isAdmin && story.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền quản lý vật phẩm của truyện này');
    }
    return story;
  }

  private remaining(stock: number | null, soldCount: number): number | null {
    return stock === null ? null : Math.max(0, stock - soldCount);
  }

  /** Tác giả tạo vật phẩm cho truyện. Doanh thu về TÁC GIẢ truyện. */
  async create(storyId: string, userId: string, isAdmin: boolean, dto: CreateStoryItemDto) {
    const story = await this.assertStoryOwner(storyId, userId, isAdmin);
    return this.prisma.storyItem.create({
      data: {
        storyId,
        authorId: story.authorId,
        name: dto.name,
        description: dto.description || null,
        imageUrl: dto.imageUrl,
        fileUrl: dto.fileUrl || null,
        price: dto.price,
        stock: dto.stock ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(itemId: string, userId: string, isAdmin: boolean, dto: UpdateStoryItemDto) {
    const item = await this.prisma.storyItem.findUnique({
      where: { id: itemId },
      select: { id: true, authorId: true },
    });
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');
    if (!isAdmin && item.authorId !== userId) throw new ForbiddenException('Không có quyền');

    const data: any = {};
    for (const k of ['name', 'description', 'imageUrl', 'fileUrl', 'price', 'stock', 'isActive'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (data.description === '') data.description = null;
    if (data.fileUrl === '') data.fileUrl = null;
    return this.prisma.storyItem.update({ where: { id: itemId }, data });
  }

  /** Xoá vật phẩm. Nếu đã có người mua → chỉ NGƯNG BÁN (giữ lịch sử + kho của người mua). */
  async remove(itemId: string, userId: string, isAdmin: boolean) {
    const item = await this.prisma.storyItem.findUnique({
      where: { id: itemId },
      select: { id: true, authorId: true },
    });
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');
    if (!isAdmin && item.authorId !== userId) throw new ForbiddenException('Không có quyền');

    const purchaseCount = await this.prisma.storyItemPurchase.count({ where: { itemId } });
    if (purchaseCount > 0) {
      await this.prisma.storyItem.update({ where: { id: itemId }, data: { isActive: false } });
      return { hardDeleted: false, message: 'Vật phẩm đã có người mua nên chỉ ngừng bán (giữ lịch sử).' };
    }
    await this.prisma.storyItem.delete({ where: { id: itemId } });
    return { hardDeleted: true };
  }

  /** Danh sách CÔNG KHAI cho trang truyện: chỉ vật phẩm đang bán, kèm số đã sở hữu của user. */
  async listForStory(storyId: string, userId?: string) {
    const items = await this.prisma.storyItem.findMany({
      where: { storyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let owned: Record<string, number> = {};
    if (userId && items.length) {
      const grouped = await this.prisma.storyItemPurchase.groupBy({
        by: ['itemId'],
        where: { userId, itemId: { in: items.map((i) => i.id) } },
        _sum: { quantity: true },
      });
      owned = Object.fromEntries(grouped.map((g) => [g.itemId, g._sum.quantity ?? 0]));
    }

    return items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      price: i.price,
      stock: i.stock,
      soldCount: i.soldCount,
      remaining: this.remaining(i.stock, i.soldCount),
      hasFile: !!i.fileUrl, // không lộ URL — tải qua endpoint kiểm quyền
      ownedQuantity: owned[i.id] ?? 0,
    }));
  }

  /** Danh sách QUẢN LÝ cho tác giả: mọi vật phẩm (kể cả ngừng bán) + doanh thu. */
  async listForAuthor(storyId: string, userId: string, isAdmin: boolean) {
    await this.assertStoryOwner(storyId, userId, isAdmin);
    const items = await this.prisma.storyItem.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    });
    const rev = await this.prisma.storyItemPurchase.groupBy({
      by: ['itemId'],
      where: { storyId },
      _sum: { netAmount: true, quantity: true },
    });
    const revMap = new Map(rev.map((r) => [r.itemId, r._sum]));
    return items.map((i) => ({
      ...i,
      remaining: this.remaining(i.stock, i.soldCount),
      soldQuantity: revMap.get(i.id)?.quantity ?? 0,
      revenue: revMap.get(i.id)?.netAmount ?? 0,
    }));
  }

  /** Mua vật phẩm — chia doanh thu + giữ tồn kho atomically (WalletService.payForItem). */
  async buy(itemId: string, userId: string, quantity: number) {
    const item = await this.prisma.storyItem.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, price: true, storyId: true, authorId: true, isActive: true },
    });
    if (!item || !item.isActive) {
      throw new NotFoundException('Vật phẩm không tồn tại hoặc đã ngừng bán');
    }
    const { isActive: _ia, ...payload } = item;
    return this.wallet.payForItem(userId, payload, quantity);
  }

  /** Lấy URL file tải về — chỉ người đã mua ít nhất 1 lần. */
  async getDownloadUrl(itemId: string, userId: string) {
    const item = await this.prisma.storyItem.findUnique({
      where: { id: itemId },
      select: { id: true, fileUrl: true, name: true },
    });
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');
    if (!item.fileUrl) throw new BadRequestException('Vật phẩm này không có file tải về');
    const owned = await this.prisma.storyItemPurchase.count({ where: { userId, itemId } });
    if (owned === 0) throw new ForbiddenException('Bạn chưa mua vật phẩm này');
    return { url: item.fileUrl, name: item.name };
  }

  /** Kho đồ của người dùng: gộp theo vật phẩm, tổng số lượng đã mua. */
  async myItems(userId: string) {
    const grouped = await this.prisma.storyItemPurchase.groupBy({
      by: ['itemId'],
      where: { userId },
      _sum: { quantity: true },
      _max: { createdAt: true },
    });
    if (!grouped.length) return [];
    const items = await this.prisma.storyItem.findMany({
      where: { id: { in: grouped.map((g) => g.itemId) } },
      select: {
        id: true, name: true, imageUrl: true, fileUrl: true, storyId: true,
        story: { select: { title: true, slug: true } },
      },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    return grouped
      .map((g) => {
        const it = byId.get(g.itemId);
        return {
          itemId: g.itemId,
          name: it?.name ?? '(đã xoá)',
          imageUrl: it?.imageUrl ?? null,
          hasFile: !!it?.fileUrl,
          quantity: g._sum.quantity ?? 0,
          lastBoughtAt: g._max.createdAt,
          storySlug: it?.story?.slug ?? null,
          storyTitle: it?.story?.title ?? null,
        };
      })
      .sort((a, b) => (b.lastBoughtAt?.getTime() ?? 0) - (a.lastBoughtAt?.getTime() ?? 0));
  }
}
