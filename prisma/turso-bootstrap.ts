// Turso(libSQL) DB에 로컬 마이그레이션 스키마를 1회성으로 적용하는 스크립트.
// Prisma Migrate CLI는 libsql:// 원격 URL에 직접 연결하지 못하므로(SQLite 엔진은 로컬 file:만 지원),
// 마이그레이션 SQL을 @libsql/client로 직접 실행해 스키마를 맞춘다.
// 사용법: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx prisma/turso-bootstrap.ts
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

const MIGRATIONS = [
  '20260813053707_init',
  '20260813054218_add_planning_analysis',
  '20260813061703_add_knowledge_chunks',
  '20260813062313_add_integration_connections',
  '20260813064411_add_research_reports',
  '20260813065234_add_knowledge_category',
  '20260813090000_add_chat_messages',
];

async function main() {
  const client = createClient({ url: url as string, authToken });
  for (const name of MIGRATIONS) {
    const sql = readFileSync(join(__dirname, 'migrations', name, 'migration.sql'), 'utf-8');
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log(`applied: ${name}`);
  }
  console.log('Turso 스키마 적용 완료');
}

main().catch((err) => { console.error(err); process.exit(1); });
