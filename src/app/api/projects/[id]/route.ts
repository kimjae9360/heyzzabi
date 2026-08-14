import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toProjectDTO, toMeetingDTO, toTaskDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { project_id: id },
    include: { _count: { select: { tasks: true, meetings: true } } },
  });
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const [meetings, tasks] = await Promise.all([
    prisma.meeting.findMany({ where: { project_id: id }, include: { plannings: true }, orderBy: { meeting_date: 'desc' } }),
    prisma.task.findMany({ where: { project_id: id }, include: { planning: true, meeting: true }, orderBy: { created_at: 'desc' } }),
  ]);

  return NextResponse.json({
    ...toProjectDTO(project),
    meetings: meetings.map(toMeetingDTO),
    tasks: tasks.map(toTaskDTO),
  });
}

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
