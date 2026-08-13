// SKN12-FINAL-3TEAM(딸깍)의 smart-task-assigner.ts 스코어링 알고리즘을 우리 스키마에 맞게 이식.
// 기술매칭 40% + 워크로드 30% + 유사업무 경험 20% + 난이도/직급 적합도 10%
// 순수 함수라 클라이언트(추천 표시)와 서버(자동배정)에서 동일 로직을 공유한다.

export interface AssignmentCandidate {
  id: string;
  name: string;
  role: string;
  level: 'member' | 'lead' | 'pm';
  skills?: string[];
  pastProjects?: string[];
  currentWorkload: number;
}

export interface AssignmentTask {
  title: string;
  description?: string;
  difficulty?: string; // High / Medium / Low
}

export interface AssignmentScore {
  employeeId: string;
  score: number;
  breakdown: { skillMatch: number; workload: number; experience: number; priority: number };
  reason: string;
}

const TECH_KEYWORDS = [
  'javascript', 'typescript', 'react', 'node.js', 'python', 'java', 'html', 'css', 'sql',
  'mongodb', 'postgresql', 'api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws', 'azure',
  'figma', 'photoshop', 'ui', 'ux', 'design', 'frontend', 'backend', 'fullstack',
  'mobile', 'android', 'ios', 'agile', 'jira', 'pm', 'roadmap', 'illustrator',
];

function extractSkillsFromTask(task: AssignmentTask): string[] {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  return TECH_KEYWORDS.filter((kw) => text.includes(kw));
}

function skillMatchScore(task: AssignmentTask, emp: AssignmentCandidate): number {
  const required = extractSkillsFromTask(task);
  const empSkills = (emp.skills || []).map((s) => s.toLowerCase());
  if (required.length === 0) return 60; // 기본 점수 - 키워드로 추출 못하면 중립
  const matched = required.filter((r) => empSkills.some((s) => s.includes(r) || r.includes(s)));
  return Math.min((matched.length / required.length) * 100, 100);
}

function workloadScore(emp: AssignmentCandidate): number {
  return Math.max(100 - emp.currentWorkload, 0);
}

// "경험" 근사치: 과거 프로젝트 이력 텍스트와 업무 제목의 키워드 겹침
function experienceScore(task: AssignmentTask, emp: AssignmentCandidate): number {
  const taskWords = new Set(task.title.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  const pastText = (emp.pastProjects || []).join(' ').toLowerCase();
  let overlap = 0;
  taskWords.forEach((w) => { if (pastText.includes(w)) overlap++; });
  return Math.min(overlap * 25, 100);
}

function priorityScore(task: AssignmentTask, emp: AssignmentCandidate): number {
  let score = 60;
  if (task.difficulty === 'High' && emp.level === 'pm') score = 100;
  else if (task.difficulty === 'High' && emp.level === 'lead') score = 85;
  else if (task.difficulty === 'Medium') score = 65;
  else if (task.difficulty === 'Low') score = 50;
  return score;
}

function generateReason(breakdown: AssignmentScore['breakdown']): string {
  const reasons: string[] = [];
  if (breakdown.skillMatch >= 70) reasons.push('기술 매칭 높음');
  if (breakdown.workload >= 60) reasons.push('여유 워크로드');
  if (breakdown.experience >= 40) reasons.push('유사 업무 경험 보유');
  if (breakdown.priority >= 80) reasons.push('난이도-직급 적합');
  return reasons.length > 0 ? reasons.join(' · ') : '종합 판단';
}

export function scoreCandidate(task: AssignmentTask, emp: AssignmentCandidate): AssignmentScore {
  const skillMatch = skillMatchScore(task, emp);
  const workload = workloadScore(emp);
  const experience = experienceScore(task, emp);
  const priority = priorityScore(task, emp);
  const score = skillMatch * 0.4 + workload * 0.3 + experience * 0.2 + priority * 0.1;
  return { employeeId: emp.id, score, breakdown: { skillMatch, workload, experience, priority }, reason: generateReason({ skillMatch, workload, experience, priority }) };
}

export function recommendAssignee(task: AssignmentTask, candidates: AssignmentCandidate[]): AssignmentScore | null {
  if (candidates.length === 0) return null;
  const scored = candidates.map((c) => scoreCandidate(task, c));
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
