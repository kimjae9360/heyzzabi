import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { toEmployeeDTO, LEVEL_TO_SYSTEM_ROLE } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { created_at: 'asc' } });
  return NextResponse.json(users.map(toEmployeeDTO));
}

function nextEmployeeNo(count: number) {
  return `EMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
}

function generateTempPassword() {
  const words = ['zzabi', 'hey', 'blue', 'sprint', 'agile', 'focus', 'team'];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
}

export async function POST(request: NextRequest) {
  try {
    const actingUser = await getActingUser(request);
    if (actingUser.role !== 'ADMIN') {
      return NextResponse.json({ error: '직원 등록은 관리자만 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name || !body.email || !body.department || !body.position || !body.role) {
      return NextResponse.json({ error: '필수 항목(이름, 이메일, 부서, 직급, 직무)이 누락되었습니다.' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
    }
    const count = await prisma.user.count();
    const tempPassword = generateTempPassword();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        department: body.department,
        position: body.position,
        job_title: body.role,
        role: LEVEL_TO_SYSTEM_ROLE[body.level as 'member' | 'lead' | 'pm'] ?? 'USER',
        status: body.status || 'ACTIVE',
        employee_no: nextEmployeeNo(count),
        hire_date: body.hireDate ? new Date(body.hireDate) : null,
        stack: JSON.stringify(body.skills || []),
        certifications: JSON.stringify(body.certifications || []),
        past_projects: JSON.stringify(body.pastProjects || []),
        password: await bcrypt.hash(tempPassword, 10),
      },
    });
    return NextResponse.json({ ...toEmployeeDTO(user), tempPassword }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '직원 등록에 실패했습니다.' }, { status: 500 });
  }
}
