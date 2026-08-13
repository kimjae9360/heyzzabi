import { prisma } from './prisma';
import { verifyToken } from './auth';
import type { NextRequest } from 'next/server';

// 로그인은 구현되어 있지만 현재 강제하지 않는다. 유효한 세션이 있으면 그 사용자를,
// 없으면 기본 관리자 계정을 "행동 주체"로 사용한다 (로그인 기능 자체는 유지).
export async function getActingUser(request: NextRequest) {
  const token = request.cookies.get('zzabi_token')?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { user_id: payload.id } });
      if (user) return user;
    }
  }

  const fallback = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { created_at: 'asc' } });
  if (!fallback) throw new Error('활성화된 사용자가 없습니다. 관리자 계정을 먼저 생성해 주세요.');
  return fallback;
}
