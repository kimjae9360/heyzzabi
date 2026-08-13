import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { answerGlobalQuery } from '@/lib/globalSearch';
import { AIConfigError } from '@/lib/openai';
import { getActingUser } from '@/lib/currentUser';

interface ChatSource {
  sourceType: string;
  sourceId: string;
  title: string;
  category: string | null;
  score: number;
}

function parseSources(json: string | null): ChatSource[] | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// 사용자별 챗봇 대화 히스토리 조회
export async function GET(request: NextRequest) {
  const user = await getActingUser(request);
  const messages = await prisma.chatMessage.findMany({
    where: { user_id: user.user_id },
    orderBy: { created_at: 'asc' },
  });
  return NextResponse.json(
    messages.map((m) => ({
      role: m.role,
      content: m.content,
      sources: parseSources(m.sources_json),
      createdAt: m.created_at.toISOString(),
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }
    const user = await getActingUser(request);

    // 회의록/기획서 RAG 검색뿐 아니라 직원 워크로드/업무 현황(구조화 데이터)도 함께 근거로 삼는다 -
    // "박서버에 대한 내용을 알려줘" 같은 질문은 문서 임베딩만으로는 답할 수 없다.
    const { answer, sources } = await answerGlobalQuery(body.query);

    await prisma.chatMessage.create({ data: { role: 'user', content: body.query, user_id: user.user_id } });
    await prisma.chatMessage.create({
      data: { role: 'assistant', content: answer, sources_json: JSON.stringify(sources), user_id: user.user_id },
    });

    return NextResponse.json({ answer, sources });
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : '질의에 실패했습니다.' }, { status: 500 });
  }
}

// 히스토리 초기화 (새 대화 시작)
export async function DELETE(request: NextRequest) {
  const user = await getActingUser(request);
  await prisma.chatMessage.deleteMany({ where: { user_id: user.user_id } });
  return NextResponse.json({ ok: true });
}
