import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { assertValidTransition } from '@/lib/taskWorkflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const reason: string = body.reason || '사유 미기재';
    const existing = await prisma.task.findUnique({ where: { task_id: id } });
    if (!existing) return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
    assertValidTransition(existing.status, 'DELAYED');

    const user = await getActingUser(request);
    const task = await prisma.task.update({
      where: { task_id: id },
      data: { status: 'DELAYED', delay_reason: reason },
      include: { planning: true, meeting: true },
    });

    await prisma.notification.create({
      data: { message: `⚠️ '${task.title}' 지연 감지. 사유: ${reason}`, type: 'warning', link: '/pipeline', user_id: user.user_id },
    });

    return NextResponse.json(toTaskDTO(task));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '지연 보고에 실패했습니다.' }, { status: 400 });
  }
}
