import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toMeetingDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { analyzeMeetingAndDraftProposal, AIConfigError } from '@/lib/openai';
import { indexMeeting, indexPlanning } from '@/lib/knowledgeIndex';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const meeting = await prisma.meeting.findUnique({ where: { meeting_id: id }, include: { plannings: true } });
    if (!meeting) return NextResponse.json({ error: '회의록을 찾을 수 없습니다.' }, { status: 404 });

    const user = await getActingUser(request);
    const analysis = await analyzeMeetingAndDraftProposal(meeting.title, meeting.content);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { meeting_id: id },
        data: { status: 'REVIEW', summary: analysis.summary },
      });

      const analysisJson = JSON.stringify({ agenda: analysis.agenda, decisions: analysis.decisions, actionItems: analysis.actionItems });
      const existingPlanning = meeting.plannings[0];
      if (existingPlanning) {
        await tx.planning.update({
          where: { planning_id: existingPlanning.planning_id },
          data: {
            title: analysis.proposalTitle,
            content: analysis.proposalContent,
            status: 'REVIEW',
            rejected_reason: null,
            analysis_json: analysisJson,
            version: bumpVersion(existingPlanning.version),
          },
        });
      } else {
        await tx.planning.create({
          data: {
            title: analysis.proposalTitle,
            content: analysis.proposalContent,
            status: 'REVIEW',
            version: '1.0',
            analysis_json: analysisJson,
            project_id: meeting.project_id!,
            meeting_id: meeting.meeting_id,
            author_id: user.user_id,
          },
        });
      }

      await tx.notification.create({
        data: {
          message: `'${meeting.title}' 기획서 초안이 생성되었습니다. 검토 후 확정해 주세요.`,
          type: 'success',
          link: '/pipeline',
          user_id: user.user_id,
        },
      });

      return tx.meeting.findUnique({ where: { meeting_id: id }, include: { plannings: true } });
    });

    const planningId = updated?.plannings[0]?.planning_id;
    await Promise.all([
      indexMeeting(id).catch((e) => console.warn('지식망 인덱싱 실패(meeting):', e)),
      planningId ? indexPlanning(planningId).catch((e) => console.warn('지식망 인덱싱 실패(planning):', e)) : Promise.resolve(),
    ]);

    return NextResponse.json(toMeetingDTO(updated!));
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '기획서 생성에 실패했습니다.' }, { status: 500 });
  }
}

function bumpVersion(version: string) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return '1.1';
  return `${parts[0]}.${parts[1] + 1}`;
}
