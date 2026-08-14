import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toProjectDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { created_at: 'asc' },
    include: { _count: { select: { tasks: true, meetings: true } } },
  });
  return NextResponse.json(projects.map(toProjectDTO));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    const body = await request.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: '프로젝트 이름은 필수입니다.' }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        priority: body.priority || 'NORMAL',
        status: 'IN_PROGRESS',
        author_id: user.user_id,
      },
    });
    return NextResponse.json(toProjectDTO(project), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.' }, { status: 500 });
  }
}
