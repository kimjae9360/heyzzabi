import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { assertValidTransition } from '@/lib/taskWorkflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const task = await prisma.task.findUnique({ where: { task_id: id } });
    if (!task) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
    assertValidTransition(task.status, 'IN_PROGRESS');

    let assigneeId: string | undefined = body.assigneeId;
    if (!assigneeId) {
      const leastBusy = await prisma.user.findFirst({ where: { status: 'ACTIVE' }, orderBy: { current_workload: 'asc' } });
      if (!leastBusy) return NextResponse.json({ error: '배정 가능한 직원이 없습니다.' }, { status: 422 });
      assigneeId = leastBusy.user_id;
    }
    const assignee = await prisma.user.findUnique({ where: { user_id: assigneeId } });
    if (!assignee) return NextResponse.json({ error: '담당자를 찾을 수 없습니다.' }, { status: 404 });

    const actingUser = await getActingUser(request);
    const workloadDelta = Math.min(100, assignee.current_workload + (task.estimated_hours || 4) * 3);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { task_id: id },
        data: { status: 'IN_PROGRESS', assignee_id: assignee.user_id, progress: 5, rejected_reason: null },
        include: { planning: true, meeting: true },
      });
      await tx.user.update({ where: { user_id: assignee.user_id }, data: { current_workload: workloadDelta } });
      await tx.taskAssignmentLog.create({
        data: { task_id: id, user_id: assignee.user_id, action: 'ASSIGNED' },
      });
      await tx.notification.create({
        data: {
          message: `[결재 승인] '${task.title}'이(가) ${assignee.name}님에게 배정되었습니다.`,
          type: 'success',
          link: '/approvals',
          user_id: actingUser.user_id,
        },
      });
      return t;
    });

    return NextResponse.json(toTaskDTO(updated));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '업무 배분 승인에 실패했습니다.' }, { status: 400 });
  }
}
