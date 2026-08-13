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
      // KnowledgeChunk는 Meeting/Planning을 임베딩 인덱싱한 파생 데이터라 함께 지우지 않으면
      // 챗봇/검색이 이미 삭제된 회의록·기획서를 계속 근거로 답하는 유령 참조가 남는다.
      prisma.knowledgeChunk.deleteMany({ where: { source_type: { in: ['MEETING', 'PLANNING'] } } }),
      prisma.planning.deleteMany(),
      prisma.meeting.deleteMany(),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '초기화에 실패했습니다.' }, { status: 500 });
  }
}
