export const EMAIL_DOMAIN = 'heyzzabi.com';

export const DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', 'QA팀', '마케팅팀', '인사팀', '영업팀'] as const;

export const POSITIONS = ['사원', '주임', '대리', '과장', '차장', '부장', '이사'] as const;

export const JOB_TITLES = [
  'Frontend',
  'Backend',
  'Full-stack',
  'DevOps',
  'UI/UX Designer',
  'Project Manager',
  'QA Engineer',
  'Data Engineer',
] as const;

export function splitEmail(email: string): { local: string; domain: string } {
  const at = email.indexOf('@');
  if (at === -1) return { local: email, domain: EMAIL_DOMAIN };
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}
