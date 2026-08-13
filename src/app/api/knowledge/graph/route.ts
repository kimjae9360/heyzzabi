import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 실제 DB 관계(Project-Meeting-Planning-Task-User)로부터 지식그래프를 구성한다.
export async function GET() {
  const [projects, meetings, plannings, tasks, users] = await Promise.all([
    prisma.project.findMany(),
    prisma.meeting.findMany(),
    prisma.planning.findMany(),
    prisma.task.findMany({ where: { assignee_id: { not: null } } }),
    prisma.user.findMany(),
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

  return NextResponse.json({ nodes, links });
}
