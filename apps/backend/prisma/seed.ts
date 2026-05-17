import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // Seed Pages
  console.log('📄 Seeding pages...');
  const pages = [
    {
      slug: 'lien-he-quang-cao',
      title: 'Liên hệ quảng cáo – Dành cho doanh nghiệp và cá nhân',
      description: 'Thông tin liên hệ quảng cáo trên nền tảng HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> là nền tảng giải trí nội dung số gồm truyện, phim truyện và sách, sở hữu cộng đồng người dùng yêu thích nghệ thuật, giải trí và sáng tạo. Chúng tôi cung cấp các giải pháp quảng cáo linh hoạt, phù hợp cho doanh nghiệp và cá nhân có nhu cầu quảng bá thương hiệu, sản phẩm hoặc dịch vụ đến đúng nhóm khách hàng tiềm năng.</p>
<p>Với nhiều hình thức quảng cáo đa dạng như banner, bài viết giới thiệu, tài trợ nội dung, gắn thương hiệu trong truyện – phim – sách, <strong>HÙNG YÊU</strong> cam kết mang lại hiệu quả truyền thông rõ ràng, minh bạch và tối ưu chi phí. Đội ngũ của chúng tôi sẵn sàng tư vấn giải pháp phù hợp nhất với mục tiêu kinh doanh của bạn.</p>
<p><strong>📩 Liên hệ quảng cáo:</strong></p>
<p><strong>Email:</strong> congtyhungyeu@gmail.com</p>
<p><strong>Hotline/Zalo:</strong> 0349740717</p>
<p><strong>HÙNG YÊU</strong> – Kết nối thương hiệu với cộng đồng yêu nghệ thuật và giải trí.</p>
<h2>Thông tin Website</h2>
<p>Tổng 1000 người dùng</p>
<p>Trên 5.000 người dùng truy cập mỗi tháng</p>`,
      isActive: true,
    },
    {
      slug: 'doi-tac-hop-tac',
      title: 'Đối tác hợp tác',
      description: 'Thông tin về đối tác hợp tác với HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> mong muốn hợp tác cùng các đối tác, doanh nghiệp và cá nhân hoạt động trong lĩnh vực sáng tạo nội dung, xuất bản, truyền thông, quảng cáo, công nghệ và giải trí. Chúng tôi hướng tới xây dựng mối quan hệ hợp tác lâu dài, minh bạch và cùng phát triển, dựa trên giá trị sáng tạo và lợi ích bền vững cho các bên.</p>
<p>Các hình thức hợp tác tại <strong>HÙNG YÊU</strong> bao gồm: đồng sản xuất truyện, phim, sách; phát hành và phân phối nội dung; tài trợ – quảng bá thương hiệu; hợp tác truyền thông và phát triển nền tảng công nghệ. Với cộng đồng người dùng ngày càng mở rộng và định hướng phát triển rõ ràng, <strong>HÙNG YÊU</strong> là cầu nối giúp đối tác tiếp cận hiệu quả thị trường và lan tỏa giá trị đến công chúng.</p>
<p><strong>🤝 HÙNG YÊU</strong> – Hợp tác cùng phát triển, sáng tạo cùng tương lai.</p>
<p><strong>📩 Liên hệ hợp tác cùng nhau phát triển.</strong></p>
<p><strong>Email:</strong> congtyhungyeu@gmail.com</p>
<p><strong>Hotline/Zalo:</strong> 0349740717</p>
<p>Các dự án truyện, phim, sách thuộc <strong>HÙNG YÊU</strong> rất cần các đối tác hợp tác cùng nhau phát triển. Cảm ơn các đối tác.</p>`,
      isActive: true,
    },
    {
      slug: 'dang-ky-tac-gia',
      title: 'Đăng kí tác giả',
      description: 'Thông tin đăng ký trở thành tác giả trên HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> trân trọng chào đón các tác giả viết truyện, kịch bản phim và sách ở mọi thể loại – từ sáng tác giải trí, nghệ thuật đến những tác phẩm mang giá trị nhân văn và chiều sâu cảm xúc. Khi đăng ký trở thành tác giả của <strong>HÙNG YÊU</strong>, bạn sẽ có cơ hội đưa tác phẩm của mình đến với cộng đồng độc giả rộng lớn thông qua nền tảng đọc truyện, xem phim truyện và đọc sách hiện đại, chuyên nghiệp.</p>
<p>Chúng tôi cam kết tôn trọng bản quyền, minh bạch trong hợp tác, hỗ trợ quảng bá tác phẩm và tạo môi trường sáng tạo bền vững để mỗi tác giả yên tâm phát triển con đường nghệ thuật của mình. <strong>HÙNG YÊU</strong> không chỉ là nơi đăng tải tác phẩm, mà còn là ngôi nhà chung nuôi dưỡng đam mê sáng tác và lan tỏa giá trị tinh thần tích cực đến cộng đồng.</p>
<p><strong>📩 Gửi Cv và thông tin cho chúng tôi. Cảm ơn bạn</strong></p>
<p><strong>Email:</strong> congtyhungyeu@gmail.com</p>
<p><strong>Hotline/Zalo:</strong> 0349740717</p>
<p><strong>HÙNG YÊU</strong> – Đồng hành cùng tác giả, lan tỏa nghệ thuật đến tâm hồn mọi người</p>`,
      isActive: true,
    },
    {
      slug: 'gop-y-phan-anh',
      title: 'Góp ý phản ánh',
      description: 'Gửi góp ý và phản ánh về nền tảng HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> luôn trân trọng mọi ý kiến đóng góp và phản ánh từ người dùng, tác giả, đối tác và cộng đồng. Những chia sẻ của bạn là cơ sở quan trọng giúp chúng tôi không ngừng hoàn thiện nền tảng, nâng cao chất lượng nội dung, dịch vụ và trải nghiệm người dùng.</p>
<p>Nếu bạn có góp ý, phản ánh, khiếu nại hoặc đề xuất cải tiến, vui lòng liên hệ với <strong>HÙNG YÊU</strong> qua các kênh hỗ trợ chính thức. Chúng tôi cam kết tiếp nhận, xem xét và phản hồi một cách nghiêm túc, minh bạch và trong thời gian sớm nhất.</p>
<p><strong>📩 Kênh tiếp nhận góp ý – phản ánh:</strong></p>
<p><strong>Email:</strong> congtyhungyeu@gmail.com</p>
<p><strong>Hotline/Zalo:</strong> 0349740717</p>
<p><strong>👉 HÙNG YÊU</strong> – Lắng nghe để phát triển, đồng hành cùng cộng đồng.</p>`,
      isActive: true,
    },
    {
      slug: 'gioi-thieu',
      title: 'Giới thiệu',
      description: 'Thông tin về nền tảng HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> là nền tảng giải trí số cung cấp truyện chữ, truyện tranh, phim truyện và sách đọc dành cho mọi lứa tuổi. Chúng tôi mang sứ mệnh đưa nghệ thuật, câu chuyện và giá trị tinh thần đến gần hơn với cộng đồng, tạo nên không gian giải trí lành mạnh, sáng tạo và giàu cảm xúc. <strong>HÙNG YÊU</strong> hướng đến việc kết nối tâm hồn con người thông qua từng trang truyện, từng thước phim và từng tác phẩm văn học.</p>
<p><strong>CÙNG NHAU XÂY DỰNG CỘNG ĐỒNG YÊU ĐỜI, YÊU CON NGƯỜI, YÊU NGHỆ THẬT, YÊU TRUYỆN, YÊU PHIM, YÊU SÁCH…XIN TRÂN THÀNH CẢM ƠN</strong></p>`,
      isActive: true,
    },
    {
      slug: 'ung-ho',
      title: 'Ủng hộ',
      description: 'Thông tin ủng hộ và đóng góp cho HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> rất mong nhận được sự ủng hộ từ cộng đồng, doanh nghiệp và những người yêu nghệ thuật để cùng chúng tôi thực hiện các dự án làm phim, viết truyện, sáng tác sách và phát triển nội dung giải trí mang giá trị nhân văn. Mỗi sự ủng hộ của bạn đều là nguồn động viên to lớn, giúp các tác giả và nhà sáng tạo có thêm điều kiện để nuôi dưỡng đam mê và cho ra đời những tác phẩm chất lượng.</p>
<p>Sự đồng hành của bạn không chỉ góp phần phát triển nền tảng <strong>HÙNG YÊU</strong>, mà còn chung tay lan tỏa nghệ thuật, cảm xúc và giá trị tinh thần tích cực đến cộng đồng.</p>
<p><strong>❤️ HÙNG YÊU</strong> – Trân trọng mọi sự ủng hộ, cùng nhau kiến tạo những tác phẩm chạm đến tâm hồn.</p>
<h2>Thông tin ủng hộ</h2>
<p><strong>Rất mong mọi người ghi rõ Họ và Tên cũng như Biệt Danh</strong></p>
<p><strong>Lưu ý:</strong> Ghi chú ủng hộ vì lý do gì, ủng hộ tác phẩm nào và vì sao</p>
<p>(Ví dụ ủng hộ bộ truyển, phim, sách nào đó để mong phát hành sách hoặc làm phim)</p>
<p>Cảm ơn tất cả mọi người.</p>`,
      isActive: true,
    },
    {
      slug: 'ban-quyen',
      title: 'Bản quyền',
      description: 'Thông tin về bản quyền nội dung trên HÙNG YÊU',
      content: `<p><strong>HÙNG YÊU</strong> cam kết tôn trọng và bảo vệ tuyệt đối quyền sở hữu trí tuệ đối với mọi nội dung được đăng tải trên nền tảng, bao gồm truyện, kịch bản phim, phim truyện, sách và các tác phẩm sáng tạo khác. Tất cả tác giả khi tham gia đều được ghi nhận quyền tác giả theo đúng quy định của pháp luật.</p>
<p>Nghiêm cấm mọi hành vi sao chép, chỉnh sửa, phát tán, khai thác hoặc sử dụng nội dung trên <strong>HÙNG YÊU</strong> dưới bất kỳ hình thức nào khi chưa có sự đồng ý bằng văn bản từ tác giả và/hoặc <strong>HÙNG YÊU</strong>. Mọi trường hợp vi phạm bản quyền sẽ được xử lý theo quy định pháp luật hiện hành.</p>
<p>Nếu phát hiện nội dung vi phạm bản quyền hoặc có khiếu nại liên quan đến quyền sở hữu trí tuệ, vui lòng liên hệ với chúng tôi để được tiếp nhận và giải quyết kịp thời.</p>
<p><strong>📩 Liên hệ bản quyền:</strong></p>
<p><strong>Email:</strong> congtyhungyeu@gmail.com</p>
<p><strong>Hotline/Zalo:</strong> 0349740717</p>
<p><strong>👉 HÙNG YÊU</strong> – Tôn trọng sáng tạo, bảo vệ giá trị bản quyền.</p>`,
      isActive: true,
    },
    {
      slug: 'popup-support',
      title: 'Ủng hộ làm phim',
      description: 'Nội dung popup ủng hộ làm phim',
      content: `<p><span class="hidden sm:inline">Ủng hộ làm phim</span></p>`,
      isActive: true,
    },
  ];

  for (const pageData of pages) {
    await prisma.page.upsert({
      where: { slug: pageData.slug },
      update: pageData,
      create: pageData,
    });
  }
  console.log(`✅ Created/updated ${pages.length} pages`);

  // Coin packages (spec mục 2 — gói xu). Idempotent by name since the model
  // has no unique constraint other than id.
  console.log('\n🪙 Creating coin packages...');
  const coinPackages = [
    { name: 'Gói 50 xu', coinAmount: 50, priceVND: 10000, description: '50 xu' },
    { name: 'Gói 250 xu', coinAmount: 250, priceVND: 50000, description: '250 xu' },
    { name: 'Gói 500 xu', coinAmount: 500, priceVND: 100000, description: '500 xu' },
    { name: 'Gói 1500 xu', coinAmount: 1500, priceVND: 200000, description: '1500 xu' },
  ];
  for (const pkg of coinPackages) {
    const existing = await prisma.coinPackage.findFirst({ where: { name: pkg.name } });
    if (existing) {
      await prisma.coinPackage.update({
        where: { id: existing.id },
        data: { ...pkg, isActive: true },
      });
    } else {
      await prisma.coinPackage.create({ data: { ...pkg, isActive: true } });
    }
  }
  console.log(`✅ Created/updated ${coinPackages.length} coin packages`);

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

