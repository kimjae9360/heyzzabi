import { NextRequest, NextResponse } from 'next/server';
import { getActingUser } from '@/lib/currentUser';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const user = await getActingUser(request).catch(() => null);
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  if (user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/integrations?error=' + encodeURIComponent('연동 관리는 관리자만 가능합니다.'), request.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=' + encodeURIComponent('GITHUB_CLIENT_ID가 설정되지 않았습니다. .env를 확인해 주세요.'), request.url));
  }

  const state = crypto.randomBytes(16).toString('hex');
  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/integrations/github/callback`;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user repo');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('github_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' });
  return response;
}
