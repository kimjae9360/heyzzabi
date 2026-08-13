import { prisma } from './prisma';
import type { NextRequest } from 'next/server';

// 로그인 연동 전 임시 방편: 프론트엔드 헤더의 x-user-id로 "현재 행동 주체"를 식별한다.
// (Layout의 역할 전환 스위처가 이 값을 채운다.) 값이 없으면 시드된 관리자로 폴백한다.
export async function getActingUser(request: NextRequest) {
  const headerId = request.headers.get('x-user-id');
  if (headerId) {
    const user = await prisma.user.findUnique({ where: { user_id: headerId } });
    if (user) return user;
  }
  const fallback = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { created_at: 'asc' } });
  if (!fallback) throw new Error('활성화된 관리자 계정이 없습니다. 시드 데이터를 확인해 주세요.');
  return fallback;
}
