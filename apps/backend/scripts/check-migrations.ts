import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

(async () => {
  const rows = await p.$queryRaw<
    Array<{ migration_name: string; applied_steps_count: number; finished_at: Date | null }>
  >`SELECT migration_name, applied_steps_count, finished_at FROM _prisma_migrations WHERE migration_name LIKE '20260523%' ORDER BY migration_name`;
  console.log(JSON.stringify(rows, null, 2));

  const tables = await p.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('ugc_reports','user_blocks')
    ORDER BY table_name`;
  console.log('tables:', JSON.stringify(tables));

  const cols = await p.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='deletedAt'`;
  console.log('users.deletedAt:', JSON.stringify(cols));

  await p.$disconnect();
})();
