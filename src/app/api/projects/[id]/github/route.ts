import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toProjectDTO } from '@/lib/serializers';
import { getActingUser } from '@/lib/currentUser';
import { parseGithubRepoUrl, verifyGithubRepoAccess } from '@/lib/github';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getActingUser(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'GitHub 연동 등록은 관리자만 가능합니다.' }, { status: 403 });
    }
    const body = await request.json();
    const parsed = parseGithubRepoUrl(body.repoUrl || '');
    if (!parsed) {
      return NextResponse.json({ error: '올바른 GitHub 저장소 주소를 입력해 주세요. (예: https://github.com/owner/repo)' }, { status: 400 });
    }
    const token = body.token && String(body.token).trim() ? String(body.token).trim() : null;
    await verifyGithubRepoAccess(parsed.owner, parsed.repo, token);

    const project = await prisma.project.update({
      where: { project_id: id },
      data: { github_owner: parsed.owner, github_repo: parsed.repo, github_token: token, github_linked_at: new Date() },
    });
    return NextResponse.json(toProjectDTO(project));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GitHub 저장소 연동에 실패했습니다.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getActingUser(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'GitHub 연동 해제는 관리자만 가능합니다.' }, { status: 403 });
    }
    const project = await prisma.project.update({
      where: { project_id: id },
      data: { github_owner: null, github_repo: null, github_token: null, github_linked_at: null },
    });
    return NextResponse.json(toProjectDTO(project));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GitHub 연동 해제에 실패했습니다.' }, { status: 500 });
  }
}
