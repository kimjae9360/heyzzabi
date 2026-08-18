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

      let prs;
      try {
        const activity = await fetchGithubActivity(project.github_owner, project.github_repo, project.github_token);
        prs = activity.pullRequests;
      } catch (err) {
        errors.push(`${project.title}: ${err instanceof Error ? err.message : 'GitHub 조회에 실패했습니다.'}`);
        continue;
      }
      if (prs.length === 0) continue;

      const activeTasks = await prisma.task.findMany({
        where: {
          project_id: project.project_id,
          status: { in: ['IN_PROGRESS', 'PENDING_DISTRIBUTION'] },
        },
      });

      for (const task of activeTasks) {
        const shortId = task.task_id.split('-')[0].toUpperCase();
        const pattern = new RegExp(`TASK-${shortId}`, 'i');
        
        const matchedPr = prs.find((pr) => pattern.test(pr.title) || pattern.test(pr.body));
        if (!matchedPr) continue;

        const updateData: any = {
          github_pr_number: matchedPr.number,
          github_pr_url: matchedPr.url,
          github_pr_state: matchedPr.state,
        };

        if (matchedPr.state === 'merged') {
          updateData.status = 'DONE';
          updateData.completed_at = new Date();
          updateData.progress = 100;
          completed.push({ taskTitle: task.title, projectTitle: project.title, prTitle: matchedPr.title, prNumber: matchedPr.number });
        }

        await prisma.task.update({
          where: { task_id: task.task_id },
          data: updateData,
        });
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
