// Seed throwaway users + sample data for Phase 3b compliance tests.
// Idempotent: nếu user đã bị soft-delete (deletedAt set), tạo lại với email mới
// có timestamp; user2 (cho test block) chỉ tạo nếu chưa có.
//
// Run: cd apps/backend && npx tsx scripts/seed-compliance-test.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD_PLAIN = 'Test@123';

async function ensureThrowawayUser(email: string, username: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deletedAt) {
    console.log(`[compliance] reuse ${email} (id=${existing.id})`);
    return existing;
  }
  if (existing && existing.deletedAt) {
    console.log(`[compliance] ${email} đã bị soft-deleted, tạo bản mới với suffix timestamp`);
    const ts = Date.now();
    email = email.replace('@', `+${ts}@`);
    username = `${username}_${ts}`;
  }
  const hashed = await bcrypt.hash(PASSWORD_PLAIN, 10);
  const u = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      displayName: username,
      role: 'USER',
      isActive: true,
    },
  });
  console.log(`[compliance] tạo user ${u.email} (id=${u.id}) password=${PASSWORD_PLAIN}`);
  return u;
}

async function main() {
  const userDelete = await ensureThrowawayUser('test-del-1@compliance.test', 'test_del_1');
  console.log('---');
  console.log('USE for soft-delete test:');
  console.log(`  email   = ${userDelete.email}`);
  console.log(`  password = ${PASSWORD_PLAIN}`);
  console.log(`  id       = ${userDelete.id}`);

  // For block test: ensure user1 + user2 exist (already seeded), find their IDs
  const u1 = await prisma.user.findUnique({ where: { email: 'user1@hungyeu.com' } });
  const u2 = await prisma.user.findUnique({ where: { email: 'user2@hungyeu.com' } });
  console.log('---');
  console.log('USE for block test:');
  console.log(`  user1 id = ${u1?.id}`);
  console.log(`  user2 id = ${u2?.id}`);

  // For report test: list 1 active story
  const story = await prisma.story.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true, title: true } });
  console.log('---');
  console.log('USE for report test:');
  if (story) {
    console.log(`  story id = ${story.id}`);
    console.log(`  slug     = ${story.slug}`);
    console.log(`  title    = ${story.title}`);
  } else {
    console.log('  (KHÔNG có story nào trong DB — chạy seed gốc trước hoặc skip report test với targetType=USER)');
  }

  // Cleanup test-only reports/blocks từ lần test trước (idempotent)
  if (u1 && u2) {
    const removedBlocks = await prisma.userBlock.deleteMany({
      where: { OR: [{ blockerId: u1.id, blockedId: u2.id }, { blockerId: u2.id, blockedId: u1.id }] },
    });
    console.log(`---\n[compliance] cleanup ${removedBlocks.count} stale UserBlock rows`);
    const removedReports = await prisma.ugcReport.deleteMany({
      where: { reporterId: u1.id, note: { contains: '(test)' } },
    });
    console.log(`[compliance] cleanup ${removedReports.count} stale UgcReport rows`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
