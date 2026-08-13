import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNotificationDTO } from '@/lib/serializers';

export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { created_at: 'desc' },
    take: 60,
  });
  return NextResponse.json(notifications.map(toNotificationDTO));
}
