import { prisma } from './prisma';
import { verifyToken } from './auth';
import type { NextRequest } from 'next/server';

export async function getActingUser(request: NextRequest) {
  const token = request.cookies.get('zzabi_token')?.value;
  if (!token) throw new Error('로그인이 필요합니다.');

  const payload = await verifyToken(token);
  if (!payload) throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');

  const user = await prisma.user.findUnique({ where: { user_id: payload.id } });
  if (!user) throw new Error('사용자를 찾을 수 없습니다.');
  return user;
}
