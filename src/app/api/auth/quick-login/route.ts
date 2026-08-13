import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// 아이디/비밀번호 없이 실제 시드 계정으로 즉시 로그인한다 (로그인 미강제 정책의 연장선).
// 목업 세션이 아니라 실제 User 레코드 + 실제 JWT 발급 로직을 그대로 사용한다.
export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json({ error: '잘못된 접속 유형입니다.' }, { status: 400 });
    }

    const user = role === 'admin'
      ? await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' }, orderBy: { created_at: 'asc' } })
      : await prisma.user.findFirst({ where: { role: 'USER', status: 'ACTIVE' }, orderBy: { created_at: 'asc' } });

    if (!user) {
      return NextResponse.json({ error: `${role === 'admin' ? '관리자' : '일반 사원'} 계정이 존재하지 않습니다.` }, { status: 404 });
    }

    const token = await signToken({ id: user.user_id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set('zzabi_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ user: { id: user.user_id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '접속에 실패했습니다.' }, { status: 500 });
  }
}
