import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password function
  const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
  };

  // First, update database enum to include AUTHOR if it doesn't exist
  console.log('🔄 Updating UserRole enum to include AUTHOR...');
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AUTHOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
          ALTER TYPE "UserRole" ADD VALUE 'AUTHOR';
        END IF;
      END $$;
    `);
    console.log('✅ UserRole enum updated');
  } catch (error: any) {
    console.log('⚠️  Could not update enum (may already exist):', error.message);
  }

  // Delete users with invalid roles (MODERATOR, UPLOADER)
  console.log('🗑️  Deleting users with invalid roles (MODERATOR, UPLOADER)...');
  try {
    const deletedCount = await prisma.$executeRawUnsafe(`
      DELETE FROM users 
      WHERE role::text IN ('MODERATOR', 'UPLOADER')
    `);
    console.log(`✅ Deleted ${deletedCount} users with invalid roles`);
  } catch (error: any) {
    console.log('⚠️  Could not delete users:', error.message);
  }

  // Update users with invalid roles to USER role (if any remain)
  console.log('🔄 Updating invalid roles to USER...');
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET role = 'USER'::"UserRole"
      WHERE role::text NOT IN ('USER', 'AUTHOR', 'ADMIN')
    `);
    console.log('✅ Updated invalid roles to USER');
  } catch (error: any) {
    console.log('⚠️  Could not update roles:', error.message);
  }

  // 1. Admin User
  const adminPassword = await hashPassword('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hungyeu.com' },
    update: {
      email: 'admin@hungyeu.com',
      username: 'admin',
      password: adminPassword,
      displayName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
      provider: 'local',
    },
    create: {
      email: 'admin@hungyeu.com',
      username: 'admin',
      password: adminPassword,
      displayName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
      provider: 'local',
      bio: 'Quản trị viên hệ thống HÙNG YÊU',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // 2. Author User
  const authorPassword = await hashPassword('Author@123');
  const author = await prisma.user.upsert({
    where: { email: 'author@hungyeu.com' },
    update: {
      email: 'author@hungyeu.com',
      username: 'author',
      password: authorPassword,
      displayName: 'Tác Giả',
      role: UserRole.AUTHOR,
      isActive: true,
      emailVerified: true,
      provider: 'local',
    },
    create: {
      email: 'author@hungyeu.com',
      username: 'author',
      password: authorPassword,
      displayName: 'Tác Giả',
      role: UserRole.AUTHOR,
      isActive: true,
      emailVerified: true,
      provider: 'local',
      bio: 'Tác giả của HÙNG YÊU',
    },
  });
  console.log('✅ Created author user:', author.email);

  // 4. Regular User 1
  const user1Password = await hashPassword('User123@');
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@hungyeu.com' },
    update: {
      email: 'user1@hungyeu.com',
      username: 'user1',
      password: user1Password,
      displayName: 'Người Dùng 1',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
    },
    create: {
      email: 'user1@hungyeu.com',
      username: 'user1',
      password: user1Password,
      displayName: 'Người Dùng 1',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
      bio: 'Độc giả yêu thích truyện và sách',
    },
  });
  console.log('✅ Created user1:', user1.email);

  // 5. Regular User 2
  const user2Password = await hashPassword('User123@');
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@hungyeu.com' },
    update: {
      email: 'user2@hungyeu.com',
      username: 'user2',
      password: user2Password,
      displayName: 'Người Dùng 2',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
    },
    create: {
      email: 'user2@hungyeu.com',
      username: 'user2',
      password: user2Password,
      displayName: 'Người Dùng 2',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
      bio: 'Người đọc đam mê văn học',
    },
  });
  console.log('✅ Created user2:', user2.email);

  // 6. Regular User 3 (Optional - thêm để đủ 5 tài khoản)
  const user3Password = await hashPassword('User123@');
  const user3 = await prisma.user.upsert({
    where: { email: 'user3@hungyeu.com' },
    update: {
      email: 'user3@hungyeu.com',
      username: 'user3',
      password: user3Password,
      displayName: 'Người Dùng 3',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
    },
    create: {
      email: 'user3@hungyeu.com',
      username: 'user3',
      password: user3Password,
      displayName: 'Người Dùng 3',
      role: UserRole.USER,
      isActive: true,
      emailVerified: true,
      provider: 'local',
      bio: 'Thành viên mới của cộng đồng HÙNG YÊU',
    },
  });
  console.log('✅ Created user3:', user3.email);

  console.log('\n📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:  admin@hungyeu.com / Admin@123');
  console.log('Author: author@hungyeu.com / Author@123');
  console.log('User 1: user1@hungyeu.com / User123@');
  console.log('User 2: user2@hungyeu.com / User123@');
  console.log('User 3: user3@hungyeu.com / User123@');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Create Categories
  console.log('\n📚 Creating categories...');
  const categories = [
    { name: 'Ngôn Tình', description: 'Truyện tình cảm, lãng mạn' },
    { name: 'Tiên Hiệp', description: 'Truyện tiên hiệp, tu tiên' },
    { name: 'Kiếm Hiệp', description: 'Truyện võ hiệp, giang hồ' },
    { name: 'Đô Thị', description: 'Truyện đô thị, hiện đại' },
    { name: 'Huyền Huyễn', description: 'Truyện huyền huyễn, ma pháp' },
    { name: 'Khoa Học Viễn Tưởng', description: 'Truyện khoa học viễn tưởng' },
    { name: 'Lịch Sử', description: 'Truyện lịch sử, cổ đại' },
    { name: 'Đồng Nhân', description: 'Truyện đồng nhân' },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        slug: cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a').replace(/[èéẹẻẽêềếệểễ]/g, 'e').replace(/[ìíịỉĩ]/g, 'i').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o').replace(/[ùúụủũưừứựửữ]/g, 'u').replace(/[ỳýỵỷỹ]/g, 'y').replace(/đ/g, 'd'),
        description: cat.description,
      },
    });
    createdCategories.push(category);
    console.log(`✅ Created category: ${category.name}`);
  }

  // Create Sample Stories
  console.log('\n📖 Creating sample stories...');
  const sampleStories = [
    {
      title: '101 Cách Cua Đổ Đại Lão Hàng Xóm',
      description: 'Câu chuyện về một cô gái quyết tâm cua đổ đại lão hàng xóm bằng 101 cách khác nhau. Truyện ngôn tình hài hước, ngọt ngào.',
      coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      categoryNames: ['Ngôn Tình', 'Đô Thị'],
      tags: ['ngôn tình', 'hài hước', 'ngọt ngào'],
      authorId: author.id,
    },
    {
      title: 'Tu Tiên Ký',
      description: 'Câu chuyện về một thiếu niên bắt đầu hành trình tu tiên, từ một người bình thường trở thành tiên nhân vạn năm.',
      coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      categoryNames: ['Tiên Hiệp', 'Huyền Huyễn'],
      tags: ['tu tiên', 'huyền huyễn', 'phiêu lưu'],
      authorId: author.id,
    },
    {
      title: 'Kiếm Thánh Truyền Kỳ',
      description: 'Truyện kiếm hiệp cổ điển về một thiếu niên học kiếm pháp và trở thành kiếm thánh.',
      coverImage: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400',
      categoryNames: ['Kiếm Hiệp', 'Lịch Sử'],
      tags: ['kiếm hiệp', 'võ hiệp', 'giang hồ'],
      authorId: author.id,
    },
  ];

  const createdStories = [];
  for (const storyData of sampleStories) {
    const baseSlug = storyData.title.toLowerCase().replace(/\s+/g, '-').replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a').replace(/[èéẹẻẽêềếệểễ]/g, 'e').replace(/[ìíịỉĩ]/g, 'i').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o').replace(/[ùúụủũưừứựửữ]/g, 'u').replace(/[ỳýỵỷỹ]/g, 'y').replace(/đ/g, 'd');

    // Check if slug exists
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.story.findUnique({ where: { slug } }) && attempt < 100) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const storyAuthor = await prisma.user.findUnique({ where: { id: storyData.authorId } });

    const story = await prisma.story.create({
      data: {
        title: storyData.title,
        slug,
        description: storyData.description,
        coverImage: storyData.coverImage,
        authorId: storyData.authorId,
        authorName: storyAuthor?.displayName || storyAuthor?.username,
        status: 'PUBLISHED',
        isPublished: true,
        tags: storyData.tags,
        country: 'VN',
      },
    });

    // Add categories
    for (const catName of storyData.categoryNames) {
      const category = createdCategories.find((c) => c.name === catName);
      if (category) {
        await prisma.storyCategory.create({
          data: {
            storyId: story.id,
            categoryId: category.id,
          },
        });
      }
    }

    createdStories.push(story);
    console.log(`✅ Created story: ${story.title}`);
  }

  // Create Sample Chapters
  console.log('\n📄 Creating sample chapters...');
  for (const story of createdStories) {
    for (let i = 1; i <= 5; i++) {
      const chapterTitle = `Chương ${i}: ${i === 1 ? 'Khởi đầu' : i === 2 ? 'Gặp gỡ' : i === 3 ? 'Phát triển' : i === 4 ? 'Cao trào' : 'Kết thúc'}`;
      const baseSlug = chapterTitle.toLowerCase().replace(/\s+/g, '-').replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a').replace(/[èéẹẻẽêềếệểễ]/g, 'e').replace(/[ìíịỉĩ]/g, 'i').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o').replace(/[ùúụủũưừứựửữ]/g, 'u').replace(/[ỳýỵỷỹ]/g, 'y').replace(/đ/g, 'd');

      let slug = baseSlug;
      let attempt = 0;
      while (await prisma.chapter.findFirst({ where: { storyId: story.id, slug } }) && attempt < 100) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const content = `Đây là nội dung của ${chapterTitle} trong truyện "${story.title}". 

Nội dung này là mẫu để test chức năng đọc truyện. Trong thực tế, nội dung sẽ được tác giả viết chi tiết và đầy đủ hơn.

Chương này có khoảng 200 từ để test tính năng đếm từ và thời gian đọc. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      await prisma.chapter.create({
        data: {
          title: chapterTitle,
          slug,
          content,
          storyId: story.id,
          order: i,
          uploaderId: author.id,
          wordCount,
          readingTime,
          isPublished: true,
        },
      });
    }
    console.log(`✅ Created 5 chapters for: ${story.title}`);
  }

  console.log('\n📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:  admin@hungyeu.com / Admin@123');
  console.log('Author: author@hungyeu.com / Author@123');
  console.log('User 1: user1@hungyeu.com / User123@');
  console.log('User 2: user2@hungyeu.com / User123@');
  console.log('User 3: user3@hungyeu.com / User123@');
  console.log(`Categories: ${createdCategories.length} categories created`);
  console.log(`Stories:    ${createdStories.length} stories created`);
  console.log(`Chapters:   ${createdStories.length * 5} chapters created`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

