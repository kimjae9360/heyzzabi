import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: '기획서 내용은 비워둘 수 없습니다.' }, { status: 400 });
    }

    const existing = await prisma.planning.findUnique({ where: { planning_id: id }, select: { planning_id: true } });
    if (!existing) {
      return NextResponse.json({ error: '기획서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const planning = await prisma.planning.update({
      where: { planning_id: id },
      data: { content },
    });
    return NextResponse.json({ id: planning.planning_id, content: planning.content });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '기획서 저장에 실패했습니다.' }, { status: 500 });
  }
}
