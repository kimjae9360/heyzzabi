import { NextRequest, NextResponse } from 'next/server';
import { answerGlobalQuery } from '@/lib/globalSearch';
import { AIConfigError } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.query || typeof body.query !== 'string' || !body.query.trim()) {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }
    const result = await answerGlobalQuery(body.query.trim());
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : '질의에 실패했습니다.' }, { status: 500 });
  }
}
