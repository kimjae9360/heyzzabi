import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActingUser } from '@/lib/currentUser';

export async function POST(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '연동 해제는 관리자만 가능합니다.' }, { status: 403 });
    }
    await prisma.integrationConnection.deleteMany({ where: { provider: 'github' } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '연동 해제에 실패했습니다.' }, { status: 500 });
  }
}
