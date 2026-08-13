import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const connections = await prisma.integrationConnection.findMany({
    select: { provider: true, external_login: true, connected_at: true, connected_user: { select: { name: true } } },
  });
  return NextResponse.json({
    connections: connections.map((c) => ({
      provider: c.provider,
      externalLogin: c.external_login,
      connectedAt: c.connected_at.toISOString(),
      connectedBy: c.connected_user.name,
    })),
    githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  });
}
