import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEmployeeDTO, LEVEL_TO_SYSTEM_ROLE } from '@/lib/serializers';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.department !== undefined) data.department = body.department;
    if (body.position !== undefined) data.position = body.position;
    if (body.role !== undefined) data.job_title = body.role;
    if (body.level !== undefined) data.role = LEVEL_TO_SYSTEM_ROLE[body.level as 'member' | 'lead' | 'pm'] ?? 'USER';
    if (body.status !== undefined) data.status = body.status;
    if (body.hireDate !== undefined) data.hire_date = body.hireDate ? new Date(body.hireDate) : null;
    if (body.skills !== undefined) data.stack = JSON.stringify(body.skills);
    if (body.certifications !== undefined) data.certifications = JSON.stringify(body.certifications);
    if (body.pastProjects !== undefined) data.past_projects = JSON.stringify(body.pastProjects);

    const user = await prisma.user.update({ where: { user_id: id }, data });
    return NextResponse.json(toEmployeeDTO(user));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '직원 정보 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.user.delete({ where: { user_id: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '직원 삭제에 실패했습니다.' }, { status: 500 });
  }
}
