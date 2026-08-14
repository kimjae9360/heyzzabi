import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { breakdownTaskIntoSubtasks, AIConfigError } from '@/lib/openai';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getActingUser(request);
    const task = await prisma.task.findUnique({ where: { task_id: id } });
    if (!task) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });

    const drafts = await breakdownTaskIntoSubtasks({
      title: task.title,
      description: task.description ?? undefined,
      estimatedHours: task.estimated_hours ?? undefined,
    });
    if (drafts.length === 0) {
      return NextResponse.json({ error: 'AI가 하위 업무를 추출하지 못했습니다. 업무 설명을 보강한 뒤 다시 시도해 주세요.' }, { status: 422 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const subtasks = await Promise.all(
        drafts.map((d) =>
          tx.task.create({
            data: {
              title: d.title,
              description: d.description,
              estimated_hours: d.estimatedHours,
              difficulty: d.difficulty,
              difficulty_reason: d.difficultyReason,
              status: 'PENDING_DISTRIBUTION',
              project_id: task.project_id,
              planning_id: task.planning_id,
              meeting_id: task.meeting_id,
            },
            include: { planning: true, meeting: true },
          })
        )
      );
      await tx.notification.create({
        data: {
          message: `'${task.title}' 업무가 AI에 의해 ${subtasks.length}개의 하위 업무로 분할되었습니다.`,
          type: 'success',
          link: '/tasks',
          user_id: user.user_id,
        },
      });
      return subtasks;
    });

    return NextResponse.json(created.map(toTaskDTO));
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '업무 분할에 실패했습니다.' }, { status: 500 });
  }
}
