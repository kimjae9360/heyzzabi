import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActingUser } from '@/lib/currentUser';

// 파이프라인 트랜잭션 데이터(회의록/기획서/업무/알림/배정이력)만 초기화한다.
// 직원(User) 계정은 실계정이므로 보존한다.
export async function POST(request: NextRequest) {
  try {
    const actingUser = await getActingUser(request);
    if (actingUser.role !== 'ADMIN') {
      return NextResponse.json({ error: '데이터 초기화는 관리자만 가능합니다.' }, { status: 403 });
    }
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.taskAssignmentLog.deleteMany(),
      prisma.task.deleteMany(),
      prisma.planning.deleteMany(),
      prisma.meeting.deleteMany(),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '초기화에 실패했습니다.' }, { status: 500 });
  }
}
