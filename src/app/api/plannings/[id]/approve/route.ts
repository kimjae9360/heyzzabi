import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { breakdownProposalIntoTasks, AIConfigError } from '@/lib/openai';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const planning = await prisma.planning.findUnique({ where: { planning_id: id } });
    if (!planning) return NextResponse.json({ error: '기획서를 찾을 수 없습니다.' }, { status: 404 });
    if (planning.status === 'REJECTED') {
      return NextResponse.json({ error: '반려된 기획서는 수정 후 다시 생성해 주세요.' }, { status: 409 });
    }
    if (planning.status === 'APPROVED') {
      const existingTasks = await prisma.task.findMany({
        where: { planning_id: id },
        include: { planning: true, meeting: true },
        orderBy: { created_at: 'asc' },
      });
      return NextResponse.json(existingTasks.map(toTaskDTO));
    }

    const user = await getActingUser(request);
    const drafts = await breakdownProposalIntoTasks(planning.title, planning.content);
    if (drafts.length === 0) {
      return NextResponse.json({ error: 'AI가 업무를 추출하지 못했습니다. 기획서 내용을 보강한 뒤 다시 시도해 주세요.' }, { status: 422 });
    }

    const tasks = await prisma.$transaction(async (tx) => {
      const approved = await tx.planning.updateMany({
        where: { planning_id: id, status: { in: ['DRAFT', 'REVIEW'] } },
        data: { status: 'APPROVED', approved_by: user.user_id, approved_at: new Date() },
      });

      // 같은 요청이 동시에 들어온 경우, 먼저 승인한 요청이 만든 업무를 반환한다.
      if (approved.count === 0) {
        return tx.task.findMany({
          where: { planning_id: id },
          include: { planning: true, meeting: true },
          orderBy: { created_at: 'asc' },
        });
      }

      if (planning.meeting_id) {
        await tx.meeting.update({ where: { meeting_id: planning.meeting_id }, data: { status: 'CONFIRMED' } });
      }

      const created = await Promise.all(
        drafts.map((d) =>
          tx.task.create({
            data: {
              title: d.title,
              description: d.description,
              estimated_hours: d.estimatedHours,
              difficulty: d.difficulty,
              difficulty_reason: d.difficultyReason,
              status: 'PENDING_DISTRIBUTION',
              project_id: planning.project_id,
              planning_id: planning.planning_id,
              meeting_id: planning.meeting_id,
            },
            include: { planning: true, meeting: true },
          })
        )
      );

      await tx.notification.create({
        data: {
          message: `'${planning.title}'에서 ${created.length}개 업무가 배분 대기열에 추가되었습니다.`,
          type: 'success',
          link: '/pipeline',
          user_id: user.user_id,
        },
      });

      return created;
    });

    return NextResponse.json(tasks.map(toTaskDTO));
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '업무 배분에 실패했습니다.' }, { status: 500 });
  }
}
