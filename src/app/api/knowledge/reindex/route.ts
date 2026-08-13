import { NextRequest, NextResponse } from 'next/server';
import { getActingUser } from '@/lib/currentUser';
import { reindexAll } from '@/lib/knowledgeIndex';
import { AIConfigError } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const actingUser = await getActingUser(request);
    if (actingUser.role !== 'ADMIN') {
      return NextResponse.json({ error: '재인덱싱은 관리자만 실행할 수 있습니다.' }, { status: 403 });
    }
    const count = await reindexAll();
    return NextResponse.json({ indexed: count });
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : '재인덱싱에 실패했습니다.' }, { status: 500 });
  }
}
