import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// SLA 워처 - Vercel Cron(vercel.json)이 주기적으로 호출한다.
// 목표 완료 시각(Task.end_date, 배분 승인 시 estimated_hours로 계산)을 넘긴 진행 중 업무를 찾아
// "알림만" 남긴다. 상태(DELAYED)나 담당자를 자동으로 바꾸지 않는다 - 그건 사람이 파이프라인에서
// "지연 보고"를 눌러 직접 확정하는 액션으로 남겨둔다 (감지는 자동, 상태 변경은 사람 승인 원칙).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  // @prisma/adapter-libsql로 Date 객체를 DateTime 비교 필터(lt/gt)에 넘기면 TEXT로 저장된
  // 컬럼과 매칭이 안 되는 어댑터 버그가 있음 (직접 재현 확인) - ISO 문자열 raw SQL로 우회한다.
  const breachedIds = await prisma.$queryRaw<{ task_id: string }[]>`
    SELECT task_id FROM "Task" WHERE status = 'IN_PROGRESS' AND end_date < ${now.toISOString()} AND sla_alerted_at IS NULL
  `;
  const breached = await prisma.task.findMany({
    where: { task_id: { in: breachedIds.map((r) => r.task_id) } },
    include: { assignee: true },
  });

  for (const task of breached) {
    await prisma.$transaction([
      prisma.task.update({ where: { task_id: task.task_id }, data: { sla_alerted_at: now } }),
      prisma.notification.create({
        data: {
          message: `⏰ SLA 초과 감지: '${task.title}'${task.assignee ? ` (담당: ${task.assignee.name})` : ''}이(가) 목표 완료 시각을 넘겼습니다. 확인이 필요합니다.`,
          type: 'warning',
          link: '/pipeline',
          user_id: task.assignee_id,
        },
      }),
    ]);
  }

  return NextResponse.json({ checked: breached.length, alerted: breached.map((t) => t.task_id) });
}
