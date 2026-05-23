// Phase 3b compliance smoke (bypass login throttle by signing JWT manually).
// Run: cd apps/backend && npx tsx scripts/smoke-compliance-v2.ts
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3009/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-123';

function sign(user: { id: string; email: string; username: string; role: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function call(method: string, path: string, token?: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed: any;
  try { parsed = await res.json(); } catch { parsed = await res.text(); }
  return { status: res.status, body: parsed };
}

async function main() {
  // Get users
  const u1 = await prisma.user.findUniqueOrThrow({ where: { email: 'user1@hungyeu.com' } });
  const u2 = await prisma.user.findUniqueOrThrow({ where: { email: 'user2@hungyeu.com' } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@hungyeu.com' } });
  const story = await prisma.story.findFirstOrThrow({ where: { status: 'PUBLISHED' }, select: { id: true, title: true } });

  // Find or create throwaway user (auto-suffix if previous deleted)
  let throwaway = await prisma.user.findFirst({
    where: { email: { startsWith: 'test-del-' }, deletedAt: null },
  });
  if (!throwaway) {
    const ts = Date.now();
    const bcrypt = await import('bcryptjs');
    throwaway = await prisma.user.create({
      data: {
        email: `test-del-${ts}@compliance.test`,
        username: `test_del_${ts}`,
        password: await bcrypt.hash('Test@123', 10),
        displayName: 'Test Delete User',
        role: 'USER',
        isActive: true,
      },
    });
    console.log(`[setup] tạo throwaway mới ${throwaway.email}`);
  } else {
    console.log(`[setup] reuse throwaway ${throwaway.email}`);
  }

  const tDel = sign(throwaway as any);
  const t1 = sign(u1 as any);
  const tAdmin = sign(admin as any);

  console.log('\n=== 4a. Soft-delete ===');
  // 4a.1 sai password
  let r = await call('DELETE', '/users/me', tDel, { password: 'WrongPass!' });
  console.log(`4a.1 sai pass → status=${r.status} body=${JSON.stringify(r.body)}`);
  if (r.status !== 401) console.log('  ✗ EXPECTED 401');

  // 4a.2 đúng password (CHỈ chạy nếu throwaway có password — đã set ở trên)
  r = await call('DELETE', '/users/me', tDel, { password: 'Test@123' });
  console.log(`4a.2 đúng pass → status=${r.status} body=${JSON.stringify(r.body)}`);

  // 4a.3 verify DB anonymise
  const deleted = await prisma.user.findUnique({ where: { id: throwaway.id } });
  console.log('4a.3 DB user state:', JSON.stringify({
    email: deleted?.email,
    username: deleted?.username,
    displayName: deleted?.displayName,
    avatar: deleted?.avatar,
    password: deleted?.password,
    deletedAt: deleted?.deletedAt,
    isActive: deleted?.isActive,
  }));

  // 4a.4 token cũ không dùng được nữa (vì validateUser check deletedAt? hoặc isActive false)
  r = await call('GET', '/users/me', tDel);
  console.log(`4a.4 token cũ → /users/me status=${r.status}`);

  // 4a.5 verify wallet locked (nếu user1 có wallet, throwaway thì chưa)
  const w = await prisma.userWallet.findUnique({ where: { userId: throwaway.id } });
  console.log('4a.5 wallet:', w ? `locked=${w.isLocked}` : '(no wallet — OK)');

  console.log('\n=== 4b. Block / unblock ===');
  r = await call('POST', `/users/${u2.id}/block`, t1);
  console.log(`4b.1 block → status=${r.status} body=${JSON.stringify(r.body)}`);

  r = await call('POST', `/users/${u2.id}/block`, t1);
  console.log(`4b.2 block lần 2 (idempotent) → status=${r.status} body=${JSON.stringify(r.body)}`);

  r = await call('GET', '/users/me/blocks', t1);
  console.log(`4b.3 list blocks → status=${r.status} count=${Array.isArray(r.body?.data) ? r.body.data.length : '?'}`);
  console.log('     entries:', JSON.stringify(r.body?.data));

  r = await call('POST', `/users/${u1.id}/block`, t1);
  console.log(`4b.4 self-block → status=${r.status} (expect 400)`);

  r = await call('DELETE', `/users/${u2.id}/block`, t1);
  console.log(`4b.5 unblock → status=${r.status} body=${JSON.stringify(r.body)}`);

  r = await call('GET', '/users/me/blocks', t1);
  console.log(`4b.6 list sau unblock → count=${Array.isArray(r.body?.data) ? r.body.data.length : '?'}`);

  console.log('\n=== 4c. Report a story ===');
  // Clean prior test reports for this story
  await prisma.ugcReport.deleteMany({
    where: { reporterId: u1.id, targetId: story.id, note: { contains: '(test)' } },
  });
  r = await call('POST', '/reports', t1, {
    targetType: 'STORY',
    targetId: story.id,
    reason: 'SPAM',
    note: `Test 3b smoke ${new Date().toISOString()} (test)`,
  });
  console.log(`4c.1 create report → status=${r.status} reportId=${r.body?.data?.id}`);
  const reportId = r.body?.data?.id;

  // Duplicate report — service có ngăn không?
  r = await call('POST', '/reports', t1, {
    targetType: 'STORY',
    targetId: story.id,
    reason: 'SPAM',
    note: 'duplicate (test)',
  });
  console.log(`4c.2 duplicate report → status=${r.status} (xem có chặn dup không)`);

  console.log('\n=== 4d. Admin list + resolve ===');
  r = await call('GET', '/admin/reports?status=PENDING', tAdmin);
  // Response: { success, data: { data: [...], meta: {...} } }
  const items: any[] = r.body?.data?.data ?? [];
  const meta = r.body?.data?.meta;
  console.log(`4d.1 list PENDING → status=${r.status} count=${items.length} meta=${JSON.stringify(meta)}`);
  const found = items.find((x: any) => x.id === reportId);
  console.log(`4d.1b found seeded report? ${!!found}`);

  if (reportId) {
    r = await call('PATCH', `/admin/reports/${reportId}`, tAdmin, { status: 'RESOLVED' });
    console.log(`4d.2 resolve → status=${r.status} body=${JSON.stringify(r.body)?.slice(0, 200)}`);

    r = await call('PATCH', `/admin/reports/${reportId}`, tAdmin, { status: 'DISMISSED' });
    console.log(`4d.3 resolve lần 2 → status=${r.status} (expect reject)`);
  }

  console.log('\n=== DONE ===');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
