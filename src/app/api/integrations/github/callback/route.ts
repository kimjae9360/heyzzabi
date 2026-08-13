import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActingUser } from '@/lib/currentUser';

function fail(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL('/integrations?error=' + encodeURIComponent(message), request.url));
}

export async function GET(request: NextRequest) {
  const user = await getActingUser(request).catch(() => null);
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = request.cookies.get('github_oauth_state')?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return fail(request, 'OAuth 상태 검증에 실패했습니다. 다시 시도해 주세요.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(request, 'GitHub 연동 설정(CLIENT_ID/SECRET)이 누락되었습니다.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return fail(request, tokenData.error_description || 'GitHub 토큰 발급에 실패했습니다.');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' },
    });
    const ghUser = await userRes.json();

    await prisma.integrationConnection.upsert({
      where: { provider: 'github' },
      update: { external_login: ghUser.login, access_token: tokenData.access_token, connected_by: user.user_id },
      create: { provider: 'github', external_login: ghUser.login, access_token: tokenData.access_token, connected_by: user.user_id },
    });

    const response = NextResponse.redirect(new URL('/integrations?connected=github', request.url));
    response.cookies.delete('github_oauth_state');
    return response;
  } catch (err) {
    return fail(request, err instanceof Error ? err.message : 'GitHub 연동에 실패했습니다.');
  }
}
