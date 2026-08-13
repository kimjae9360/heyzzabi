import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledge } from '@/lib/knowledgeIndex';
import { answerFromContext, AIConfigError } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }
    const hits = await searchKnowledge(body.query, 5);
    const relevant = hits.filter((h) => h.score > 0.15);
    const result = await answerFromContext(body.query, relevant);
    return NextResponse.json({ answer: result.answer, sources: relevant.map((h) => ({ sourceType: h.sourceType, sourceId: h.sourceId, title: h.title, score: h.score })) });
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : '질의에 실패했습니다.' }, { status: 500 });
  }
}
