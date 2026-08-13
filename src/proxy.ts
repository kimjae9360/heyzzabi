import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 로그인 기능 자체는 구현되어 있지만(로그인/회원가입/세션), 현재는 강제하지 않는다.
// 로그인 안 한 사용자는 기본 관리자 권한으로 동작한다 (src/lib/currentUser.ts의 폴백 참고).
// 나중에 로그인을 강제하려면 아래를 다시 활성화하면 된다:
//   if (!request.nextUrl.pathname.startsWith('/api/auth') && !token) {
//     return NextResponse.redirect(new URL('/login', request.url));
//   }
export async function proxy(request: NextRequest) {
  const token = request.cookies.get('zzabi_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');

  if (isAuthPage && token) {
    const payload = await verifyToken(token);
    if (payload) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons.svg).*)'],
};
