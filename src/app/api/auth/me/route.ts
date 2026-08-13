import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toEmployeeDTO } from '@/lib/serializers';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('zzabi_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { user_id: payload.id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  await prisma.user.update({ where: { user_id: user.user_id }, data: { last_login_at: new Date() } }).catch(() => {});

  return NextResponse.json(toEmployeeDTO(user));
}
