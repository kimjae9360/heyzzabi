import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { assertValidTransition } from '@/lib/taskWorkflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const task = await prisma.task.findUnique({ where: { task_id: id } });
    if (!task) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
    assertValidTransition(task.status, 'IN_PROGRESS');

    const candidate = await prisma.user.findFirst({
      where: { status: 'ACTIVE', ...(task.assignee_id ? { user_id: { not: task.assignee_id } } : {}) },
      orderBy: { current_workload: 'asc' },
    });
    if (!candidate) return NextResponse.json({ error: '재배정 가능한 직원이 없습니다.' }, { status: 422 });

    const actingUser = await getActingUser(request);
    const now = new Date();
    const dueDate = new Date(now.getTime() + (task.estimated_hours || 8) * 60 * 60 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { task_id: id },
        data: { status: 'IN_PROGRESS', assignee_id: candidate.user_id, delay_reason: null, start_date: now, end_date: dueDate, sla_alerted_at: null },
        include: { planning: true, meeting: true },
      });
      await tx.user.update({ where: { user_id: candidate.user_id }, data: { current_workload: Math.min(100, candidate.current_workload + 10) } });
      await tx.taskAssignmentLog.create({ data: { task_id: id, user_id: candidate.user_id, action: 'REASSIGNED' } });
      await tx.notification.create({
        data: {
          message: `[AI 재조정] '${task.title}'이(가) ${candidate.name}님으로 재배정되었습니다.`,
          type: 'success',
          link: '/pipeline',
          user_id: actingUser.user_id,
        },
      });
      return t;
    });

    return NextResponse.json(toTaskDTO(updated));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '재배정에 실패했습니다.' }, { status: 400 });
  }
}
