import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActingUser } from '@/lib/currentUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const slackConn = await prisma.integrationConnection.findUnique({
      where: { provider: 'slack' },
    });

    return NextResponse.json({ connected: !!slackConn });
  } catch (error) {
    console.error('Failed to get slack connection:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '관리자(PM)만 연동할 수 있습니다.' }, { status: 403 });
    }

    const { webhookUrl } = await request.json();
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ error: '유효한 Slack Webhook URL을 입력해주세요.' }, { status: 400 });
    }

    await prisma.integrationConnection.upsert({
      where: { provider: 'slack' },
      update: {
        access_token: webhookUrl,
        connected_by: user.user_id,
        connected_at: new Date(),
      },
      create: {
        provider: 'slack',
        external_login: 'Webhook',
        access_token: webhookUrl,
        connected_by: user.user_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to connect slack:', error);
    return NextResponse.json({ error: '연동에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '관리자(PM)만 해제할 수 있습니다.' }, { status: 403 });
    }

    await prisma.integrationConnection.deleteMany({
      where: { provider: 'slack' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect slack:', error);
    return NextResponse.json({ error: '해제에 실패했습니다.' }, { status: 500 });
  }
}
