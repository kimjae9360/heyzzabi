import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTaskDTO } from '@/lib/serializers';

export async function GET() {
  const tasks = await prisma.task.findMany({ include: { planning: true, meeting: true }, orderBy: { created_at: 'desc' } });
  return NextResponse.json(tasks.map(toTaskDTO));
}
