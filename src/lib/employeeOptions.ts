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

export const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Vue', 'Angular', 'HTML', 'CSS', 'Tailwind CSS',
  'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'FastAPI', 'Java', 'Spring', 'Kotlin',
  'Go', 'Rust', 'PHP', 'C#', '.NET',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Prisma',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Linux',
  'Figma', 'Sketch', 'Illustrator', 'Photoshop', 'Prototyping', 'UX Research', 'Design System',
  'Git', 'Jest', 'Cypress', 'Selenium', 'Agile', 'Scrum', 'JIRA',
  'iOS', 'Android', 'React Native', 'Flutter',
  'Data Analysis', 'SQL', 'Pandas', 'TensorFlow', 'PyTorch',
] as const;

export const CERT_SUGGESTIONS = [
  '정보처리기사', '정보처리산업기사', '정보보안기사', '정보보안산업기사',
  'SQLD', 'SQLP', 'ADsP', '빅데이터분석기사',
  'AWS Solutions Architect', 'AWS Developer Associate', 'AWS SysOps Administrator',
  'GCP Associate Cloud Engineer', 'Azure Fundamentals',
  'PMP', 'CISSP', 'OCJP',
  'GTQ', 'GTQi', '컴퓨터활용능력 1급', '컴퓨터활용능력 2급', 'ITQ',
  '리눅스마스터', '네트워크관리사', 'CCNA',
] as const;

export function splitEmail(email: string): { local: string; domain: string } {
  const at = email.indexOf('@');
  if (at === -1) return { local: email, domain: EMAIL_DOMAIN };
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}
