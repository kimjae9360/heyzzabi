import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGithubActivity } from '@/lib/github';
import { getActingUser } from '@/lib/currentUser';

// 실제 GitHub PR 병합 여부를 조회해서, 진행 중인 업무 중 제목이 병합된 PR 제목에 포함되는 것을
// 완료 처리한다. 매칭되는 게 없으면 아무것도 완료 처리하지 않는다 (가짜 성공을 만들지 않는다).
export async function POST(request: NextRequest) {
  try {
    const user = await getActingUser(request);
    const projects = await prisma.project.findMany({
      where: { github_owner: { not: null }, github_repo: { not: null } },
    });

    const completed: { taskTitle: string; projectTitle: string; prTitle: string; prNumber: number }[] = [];
    const errors: string[] = [];

    for (const project of projects) {
      if (!project.github_owner || !project.github_repo) continue;

      let mergedPRs;
      try {
        const activity = await fetchGithubActivity(project.github_owner, project.github_repo, project.github_token);
        mergedPRs = activity.pullRequests.filter((pr) => pr.state === 'merged');
      } catch (err) {
        errors.push(`${project.title}: ${err instanceof Error ? err.message : 'GitHub 조회에 실패했습니다.'}`);
        continue;
      }
      if (mergedPRs.length === 0) continue;

      const inProgressTasks = await prisma.task.findMany({
        where: { project_id: project.project_id, status: 'IN_PROGRESS' },
      });

      for (const task of inProgressTasks) {
        const normalizedTitle = task.title.trim().toLowerCase();
        const matchedPr = mergedPRs.find((pr) => pr.title.toLowerCase().includes(normalizedTitle));
        if (!matchedPr) continue;

        await prisma.task.update({
          where: { task_id: task.task_id },
          data: { status: 'DONE', completed_at: new Date(), progress: 100 },
        });
        completed.push({ taskTitle: task.title, projectTitle: project.title, prTitle: matchedPr.title, prNumber: matchedPr.number });
      }
    }

    if (completed.length > 0) {
      await prisma.notification.create({
        data: {
          message: `GitHub 동기화: 병합된 PR을 확인해 ${completed.length}개 업무를 완료 처리했습니다.`,
          type: 'success',
          link: '/tasks',
          user_id: user.user_id,
        },
      });
    }

    return NextResponse.json({ completed, errors, checkedProjects: projects.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GitHub 동기화에 실패했습니다.' }, { status: 500 });
  }
}
