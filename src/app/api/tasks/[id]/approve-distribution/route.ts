import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { assertValidTransition } from '@/lib/taskWorkflow';
import { recommendAssignee, scoreCandidate } from '@/lib/taskAssignment';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const task = await prisma.task.findUnique({ where: { task_id: id } });
    if (!task) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
    assertValidTransition(task.status, 'IN_PROGRESS');

    const activeUsers = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    const candidates = activeUsers.map((u) => ({
      id: u.user_id, name: u.name, role: u.job_title || '', level: (u.role === 'ADMIN' ? 'pm' : u.role === 'PM' ? 'lead' : 'member') as 'member' | 'lead' | 'pm',
      skills: u.stack ? JSON.parse(u.stack) : [], pastProjects: u.past_projects ? JSON.parse(u.past_projects) : [], currentWorkload: u.current_workload,
    }));
    const taskInput = { title: task.title, description: task.description || undefined, difficulty: task.difficulty || undefined };

    let assigneeId: string | undefined = body.assigneeId;
    let assignmentReason: string | null = null;
    if (!assigneeId) {
      const recommendation = recommendAssignee(taskInput, candidates);
      if (!recommendation) return NextResponse.json({ error: '배정 가능한 직원이 없습니다.' }, { status: 422 });
      assigneeId = recommendation.employeeId;
      assignmentReason = `AI 추천 (점수 ${Math.round(recommendation.score)}): ${recommendation.reason}`;
    } else {
      const candidate = candidates.find((c) => c.id === assigneeId);
      if (candidate) {
        const scored = scoreCandidate(taskInput, candidate);
        assignmentReason = `수동 지정 (참고 점수 ${Math.round(scored.score)}): ${scored.reason}`;
      }
    }
    const assignee = await prisma.user.findUnique({ where: { user_id: assigneeId } });
    if (!assignee) return NextResponse.json({ error: '담당자를 찾을 수 없습니다.' }, { status: 404 });

    const actingUser = await getActingUser(request);
    const workloadDelta = Math.min(100, assignee.current_workload + (task.estimated_hours || 4) * 3);

    // SLA 워처가 비교할 목표 완료 시각. estimated_hours를 실제 달력 시간으로 단순 환산한다
    // (근무시간 캘린더 없이 쓸 수 있는 가장 정직한 근사치 - 8시간 업무 = 지금부터 8시간 뒤).
    const now = new Date();
    const dueDate = new Date(now.getTime() + (task.estimated_hours || 8) * 60 * 60 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { task_id: id },
        data: { status: 'IN_PROGRESS', assignee_id: assignee.user_id, progress: 5, rejected_reason: null, start_date: now, end_date: dueDate, sla_alerted_at: null },
        include: { planning: true, meeting: true },
      });
      await tx.user.update({ where: { user_id: assignee.user_id }, data: { current_workload: workloadDelta } });
      await tx.taskAssignmentLog.create({
        data: { task_id: id, user_id: assignee.user_id, action: 'ASSIGNED', note: assignmentReason },
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
