import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.reason) return NextResponse.json({ error: '반려 사유는 필수입니다.' }, { status: 400 });

    const user = await getActingUser(request);
    const task = await prisma.task.update({
      where: { task_id: id },
      data: { status: 'PENDING_DISTRIBUTION', rejected_reason: body.reason },
      include: { planning: true, meeting: true },
    });

    await prisma.notification.create({
      data: {
        message: `[배분 반려] '${task.title}' 배분이 반려되었습니다. 사유: ${body.reason}`,
        type: 'warning',
        link: '/approvals',
        user_id: user.user_id,
      },
    });

    return NextResponse.json(toTaskDTO(task));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '배분 반려에 실패했습니다.' }, { status: 500 });
  }
}
