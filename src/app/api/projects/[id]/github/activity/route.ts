import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGithubActivity } from '@/lib/github';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUnique({ where: { project_id: id } });
    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    if (!project.github_owner || !project.github_repo) {
      return NextResponse.json({ error: '이 프로젝트에 연동된 GitHub 저장소가 없습니다.' }, { status: 400 });
    }
    const activity = await fetchGithubActivity(project.github_owner, project.github_repo, project.github_token);
    return NextResponse.json(activity);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GitHub 활동 내역을 불러오지 못했습니다.' }, { status: 500 });
  }
}
