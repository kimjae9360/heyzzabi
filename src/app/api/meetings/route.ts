import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toMeetingDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function GET() {
  const meetings = await prisma.meeting.findMany({
    include: { plannings: true },
    orderBy: { meeting_date: 'desc' },
  });
  return NextResponse.json(meetings.map(toMeetingDTO));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
    }
    const user = await getActingUser(request);
    let project;
    if (body.projectId) {
      project = await prisma.project.findUnique({ where: { project_id: body.projectId } });
      if (!project) return NextResponse.json({ error: '선택한 프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    } else {
      project = await prisma.project.findFirst({ orderBy: { created_at: 'asc' } });
      if (!project) {
        project = await prisma.project.create({
          data: { title: '기본 프로젝트', author_id: user.user_id, status: 'IN_PROGRESS' },
        });
      }
    }
    const meeting = await prisma.meeting.create({
      data: {
        title: body.title,
        content: body.content,
        meeting_date: body.meetingDate ? new Date(body.meetingDate) : new Date(),
        meeting_type: body.meetingType || '정기회의',
        location: body.location || null,
        status: 'DRAFT',
        project_id: project.project_id,
        organizer_id: user.user_id,
        created_by: user.user_id,
      },
      include: { plannings: true },
    });
    return NextResponse.json(toMeetingDTO(meeting), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '회의록 등록에 실패했습니다.' }, { status: 500 });
  }
}
