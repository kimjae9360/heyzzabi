import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, password, name, department, position, jobTitle } = await req.json();

    if (!email || !password || !name || !department || !position) {
      return NextResponse.json({ error: '이메일, 비밀번호, 이름, 부서, 직급은 필수입니다.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const count = await prisma.user.count();
    const employeeNo = `EMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    // 시스템 권한(role)은 회원가입에서 절대 클라이언트가 지정할 수 없다 - 항상 USER로 시작
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        department,
        position,
        job_title: jobTitle || null,
        role: 'USER',
        employee_no: employeeNo,
      },
    });

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
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: '회원가입에 실패했습니다.' }, { status: 500 });
  }
}
