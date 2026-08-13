import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toMeetingDTO } from '@/lib/serializers';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // KnowledgeChunk는 회의록을 임베딩 인덱싱한 파생 데이터라, 함께 지우지 않으면
    // 챗봇/검색이 이미 삭제된 회의록을 계속 근거 문서로 답하는 유령 참조가 남는다.
    await prisma.$transaction([
      prisma.knowledgeChunk.deleteMany({ where: { source_type: 'MEETING', source_id: id } }),
      prisma.meeting.delete({ where: { meeting_id: id } }),
    ]);
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
