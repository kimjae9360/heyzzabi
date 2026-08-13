import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { assertValidTransition } from '@/lib/taskWorkflow';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const existing = await prisma.task.findUnique({ where: { task_id: id } });
    if (!existing) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.progress !== undefined) data.progress = Math.max(0, Math.min(100, Number(body.progress)));
    if (body.status !== undefined) {
      assertValidTransition(existing.status, body.status);
      data.status = body.status;
      if (body.status === 'DONE') {
        data.completed_at = new Date();
        data.progress = 100;
      }
    }

    const task = await prisma.task.update({ where: { task_id: id }, data, include: { planning: true, meeting: true } });
    return NextResponse.json(toTaskDTO(task));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '업무 수정에 실패했습니다.' }, { status: 400 });
  }
}
