import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

(async () => {
  const ts = Date.now();
  const u = await p.user.create({
    data: {
      email: `ux-del-${ts}@compliance.test`,
      username: `ux_del_${ts}`,
      password: await bcrypt.hash('Test@123', 10),
      displayName: 'UX Test Del',
      role: 'USER',
      isActive: true,
    },
  });
  console.log(`USE for UX test soft-delete on mobile:`);
  console.log(`  email    = ${u.email}`);
  console.log(`  password = Test@123`);
  console.log(`  id       = ${u.id}`);
  await p.$disconnect();
})();
