import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toProjectDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getActingUser(request);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    const project = await prisma.project.update({ where: { project_id: id }, data });
    return NextResponse.json(toProjectDTO(project));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '프로젝트 수정에 실패했습니다.' }, { status: 500 });
  }
}
