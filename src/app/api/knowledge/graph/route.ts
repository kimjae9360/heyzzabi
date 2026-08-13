import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 실제 DB 관계(Project-Meeting-Planning-Task-User)에 더해, llm_wiki_graphify 스타일로
// 자동 분류된 대분류(category) 태그를 별도 노드 레이어로 얹어 주제별 클러스터링을 보여준다.
export async function GET() {
  const [projects, meetings, plannings, tasks, users, chunks] = await Promise.all([
    prisma.project.findMany(),
    prisma.meeting.findMany(),
    prisma.planning.findMany(),
    prisma.task.findMany({ where: { assignee_id: { not: null } } }),
    prisma.user.findMany(),
    prisma.knowledgeChunk.findMany({ where: { category: { not: null } } }),
  ]);

  const nodes: { id: string; label: string; group: number }[] = [];
  const links: { source: string; target: string }[] = [];

  for (const p of projects) nodes.push({ id: `project:${p.project_id}`, label: p.title, group: 1 });
  for (const m of meetings) {
    nodes.push({ id: `meeting:${m.meeting_id}`, label: m.title, group: 2 });
    if (m.project_id) links.push({ source: `project:${m.project_id}`, target: `meeting:${m.meeting_id}` });
  }
  for (const pl of plannings) {
    nodes.push({ id: `planning:${pl.planning_id}`, label: pl.title, group: 3 });
    if (pl.meeting_id) links.push({ source: `meeting:${pl.meeting_id}`, target: `planning:${pl.planning_id}` });
    else links.push({ source: `project:${pl.project_id}`, target: `planning:${pl.planning_id}` });
  }
  const usedUsers = new Set<string>();
  for (const t of tasks) {
    nodes.push({ id: `task:${t.task_id}`, label: t.title, group: 4 });
    if (t.planning_id) links.push({ source: `planning:${t.planning_id}`, target: `task:${t.task_id}` });
    if (t.assignee_id) {
      links.push({ source: `task:${t.task_id}`, target: `user:${t.assignee_id}` });
      usedUsers.add(t.assignee_id);
    }
  }
  for (const u of users) {
    if (usedUsers.has(u.user_id)) nodes.push({ id: `user:${u.user_id}`, label: u.name, group: 5 });
  }

  // 카테고리(대분류) 레이어 - 같은 주제로 자동 분류된 회의록/기획서를 카테고리 노드로 묶는다
  const categories = new Set<string>();
  for (const c of chunks) {
    if (!c.category) continue;
    categories.add(c.category);
    const targetId = c.source_type === 'MEETING' ? `meeting:${c.source_id}` : `planning:${c.source_id}`;
    if (nodes.some((n) => n.id === targetId)) {
      links.push({ source: `category:${c.category}`, target: targetId });
    }
  }
  for (const cat of categories) nodes.push({ id: `category:${cat}`, label: cat, group: 6 });

  return NextResponse.json({ nodes, links });
}
