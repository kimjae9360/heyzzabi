import { prisma } from './prisma';
import { searchKnowledge } from './knowledgeIndex';
import { answerGlobalSearch, type EmployeeWorkloadRow } from './openai';

const ACTIVE_STATUSES = ['PENDING_DISTRIBUTION', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DELAYED'];

export interface GlobalSearchResult {
  answer: string;
  sources: { sourceType: string; sourceId: string; title: string; category: string | null; score: number }[];
}

export async function answerGlobalQuery(query: string): Promise<GlobalSearchResult> {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: { tasks: { where: { status: { in: ACTIVE_STATUSES } } } },
    orderBy: { name: 'asc' },
  });

  const employeeRows: EmployeeWorkloadRow[] = users.map((u) => ({
    name: u.name,
    department: u.department,
    position: u.position,
    jobTitle: u.job_title ?? '',
    currentWorkload: u.current_workload,
    activeTasks: u.tasks.map((t) => ({
      title: t.title,
      status: t.status,
      progress: t.progress,
      estimatedHours: t.estimated_hours ?? undefined,
    })),
  }));

  const hits = await searchKnowledge(query, 4).catch(() => []);
  const relevant = hits.filter((h) => h.score > 0.15);

  const result = await answerGlobalSearch(
    query,
    employeeRows,
    relevant.map((h) => ({ title: h.title, content: h.content }))
  );

  return {
    answer: result.answer,
    sources: relevant.map((h) => ({ sourceType: h.sourceType, sourceId: h.sourceId, title: h.title, category: h.category, score: h.score })),
  };
}
