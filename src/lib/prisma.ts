import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 로컬 개발: DATABASE_URL(file:./dev.db)로 기존처럼 그대로 동작한다.
// Vercel 배포: 서버리스 파일시스템은 일회성이라 SQLite 파일을 쓸 수 없으므로,
// TURSO_DATABASE_URL/TURSO_AUTH_TOKEN이 있으면 libSQL(Turso) 드라이버 어댑터로 붙는다.
function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    const libsql = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
