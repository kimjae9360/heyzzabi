import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlanningDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.reason) return NextResponse.json({ error: '반려 사유는 필수입니다.' }, { status: 400 });

    const user = await getActingUser(request);
    const planning = await prisma.planning.update({
      where: { planning_id: id },
      data: { status: 'REJECTED', rejected_reason: body.reason },
    });

    await prisma.notification.create({
      data: {
        message: `'${planning.title}' 기획서가 반려되었습니다. 사유: ${body.reason}`,
        type: 'warning',
        link: '/meetings',
        user_id: user.user_id,
      },
    });

    return NextResponse.json(toPlanningDTO(planning));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '기획서 반려에 실패했습니다.' }, { status: 500 });
  }
}
