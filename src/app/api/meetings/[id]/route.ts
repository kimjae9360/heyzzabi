import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toMeetingDTO } from '@/lib/serializers';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.meeting.delete({ where: { meeting_id: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '회의록 삭제에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const meeting = await prisma.meeting.update({
      where: { meeting_id: id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
      },
      include: { plannings: true },
    });
    return NextResponse.json(toMeetingDTO(meeting));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '회의록 수정에 실패했습니다.' }, { status: 500 });
  }
}
