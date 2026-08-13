import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchKnowledge } from '@/lib/knowledgeIndex';
import { answerFromContext, AIConfigError } from '@/lib/openai';
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

    const hits = await searchKnowledge(body.query, 5);
    const relevant = hits.filter((h) => h.score > 0.15);
    const result = await answerFromContext(body.query, relevant);
    const sources = relevant.map((h) => ({ sourceType: h.sourceType, sourceId: h.sourceId, title: h.title, category: h.category, score: h.score }));

    await prisma.chatMessage.create({ data: { role: 'user', content: body.query, user_id: user.user_id } });
    await prisma.chatMessage.create({
      data: { role: 'assistant', content: result.answer, sources_json: JSON.stringify(sources), user_id: user.user_id },
    });

    return NextResponse.json({ answer: result.answer, sources });
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
