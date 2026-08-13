import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActingUser } from '@/lib/currentUser';
import { runDeepResearch, AIConfigError, type LocalPacketDoc } from '@/lib/openai';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const reports = await prisma.researchReport.findMany({
    where: projectId ? { project_id: projectId } : undefined,
    include: { created_user: { select: { name: true } }, project: { select: { title: true } } },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(reports.map((r) => ({
    id: r.report_id,
    question: r.question,
    content: r.content,
    degraded: r.degraded,
    projectTitle: r.project?.title,
    createdBy: r.created_user.name,
    createdAt: r.created_at.toISOString(),
    sourceCount: (JSON.parse(r.sources_json) as unknown[]).length,
  })));
}

// Local Packet 구성: 프로젝트(또는 전체)에 연관된 회의록/기획서/업무를 하나로 취합한다
async function buildLocalPacket(projectId: string | null): Promise<LocalPacketDoc[]> {
  const where = projectId ? { project_id: projectId } : {};
  const [meetings, plannings, tasks] = await Promise.all([
    prisma.meeting.findMany({ where, orderBy: { meeting_date: 'desc' }, take: 20 }),
    prisma.planning.findMany({ where, orderBy: { created_at: 'desc' }, take: 20 }),
    prisma.task.findMany({
      where: projectId ? { project_id: projectId } : {},
      orderBy: { created_at: 'desc' },
      take: 30,
    }),
  ]);

  const packet: LocalPacketDoc[] = [];
  meetings.forEach((m) => packet.push({ kind: '회의록', title: m.title, content: m.content + (m.summary ? `\n요약: ${m.summary}` : '') }));
  plannings.forEach((p) => packet.push({ kind: '기획서', title: p.title, content: p.content }));
  tasks.forEach((t) => packet.push({
    kind: '업무',
    title: t.title,
    content: [t.description, t.status !== 'DONE' ? undefined : '완료됨', t.delay_reason ? `지연 사유: ${t.delay_reason}` : undefined, t.rejected_reason ? `반려 사유: ${t.rejected_reason}` : undefined]
      .filter(Boolean).join(' / ') || `(상태: ${t.status})`,
  }));
  return packet;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    const body = await request.json();
    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json({ error: '리서치 질문을 입력해 주세요.' }, { status: 400 });
    }
    const projectId: string | null = body.projectId || null;

    const packet = await buildLocalPacket(projectId);
    const result = await runDeepResearch(body.question, packet);

    const report = await prisma.researchReport.create({
      data: {
        question: body.question,
        content: result.content,
        degraded: result.degraded,
        sources_json: JSON.stringify(packet.map((p) => ({ kind: p.kind, title: p.title }))),
        project_id: projectId,
        created_by: user.user_id,
      },
    });

    await prisma.notification.create({
      data: {
        message: `AI 리서치 보고서가 생성되었습니다: '${body.question}'`,
        type: 'success',
        link: '/research',
        user_id: user.user_id,
      },
    });

    return NextResponse.json({ id: report.report_id, content: report.content, degraded: report.degraded }, { status: 201 });
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : '리서치에 실패했습니다.' }, { status: 500 });
  }
}
