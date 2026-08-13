import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

// TURSO_DATABASE_URL이 있으면 원격 Turso DB에 시드한다 (배포용 DB 초기 세팅).
// 없으면 기존처럼 로컬 dev.db에 시드한다.
const tursoUrl = process.env.TURSO_DATABASE_URL;
const prisma = tursoUrl
  ? new PrismaClient({ adapter: new PrismaLibSQL(createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })) })
  : new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('zzabi1234!', 10);

  const kim = await prisma.user.upsert({
    where: { email: 'kim.dev@heyzzabi.com' },
    update: {},
    create: {
      email: 'kim.dev@heyzzabi.com', name: '김개발', password: passwordHash,
      phone: '010-1234-5601', department: '개발팀', position: '대리', job_title: 'Frontend',
      role: 'USER', employee_no: 'EMP-2023-001', hire_date: new Date('2023-03-02'),
      stack: JSON.stringify(['React', 'TypeScript', 'CSS']),
      certifications: JSON.stringify(['정보처리기사']),
      past_projects: JSON.stringify(['로그인 시스템 리뉴얼', 'API 연동 모듈']),
      current_workload: 70,
    },
  });

  const park = await prisma.user.upsert({
    where: { email: 'park.server@heyzzabi.com' },
    update: {},
    create: {
      email: 'park.server@heyzzabi.com', name: '박서버', password: passwordHash,
      phone: '010-1234-5602', department: '개발팀', position: '과장', job_title: 'Backend',
      role: 'PM', employee_no: 'EMP-2021-014', hire_date: new Date('2021-07-19'),
      stack: JSON.stringify(['Node.js', 'Python', 'PostgreSQL', 'AWS']),
      certifications: JSON.stringify(['AWS SAA', '정보처리기사']),
      past_projects: JSON.stringify(['API 서버 구축', 'DB 최적화 프로젝트']),
      current_workload: 40,
    },
  });

  const lee = await prisma.user.upsert({
    where: { email: 'lee.design@heyzzabi.com' },
    update: {},
    create: {
      email: 'lee.design@heyzzabi.com', name: '이디자인', password: passwordHash,
      phone: '010-1234-5603', department: '디자인팀', position: '사원', job_title: 'UI/UX Designer',
      role: 'USER', employee_no: 'EMP-2022-032', hire_date: new Date('2022-05-10'),
      stack: JSON.stringify(['Figma', 'Illustrator', 'Prototyping']),
      certifications: JSON.stringify(['GTQ']),
      past_projects: JSON.stringify(['모바일앱 디자인', '브랜드 가이드라인']),
      current_workload: 55,
    },
  });

  const choi = await prisma.user.upsert({
    where: { email: 'choi.pm@heyzzabi.com' },
    update: {},
    create: {
      email: 'choi.pm@heyzzabi.com', name: '최PM', password: passwordHash,
      phone: '010-1234-5604', department: '기획팀', position: '부장', job_title: 'Project Manager',
      role: 'ADMIN', employee_no: 'EMP-2019-003', hire_date: new Date('2019-01-14'),
      stack: JSON.stringify(['Agile', 'JIRA', 'Roadmapping']),
      certifications: JSON.stringify(['PMP']),
      past_projects: JSON.stringify(['V1.0 런치', '파이프라인 기획']),
      current_workload: 90,
    },
  });

  const project = await prisma.project.upsert({
    where: { project_id: 'seed-project-1' },
    update: {},
    create: {
      project_id: 'seed-project-1',
      title: 'Hey Zzabi AI 파이프라인 개편',
      description: '회의 → AI 기획서 → 업무 배분 파이프라인 자동화 구축',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      author_id: choi.user_id,
    },
  });

  const meeting1 = await prisma.meeting.upsert({
    where: { meeting_id: 'seed-meeting-1' },
    update: {},
    create: {
      meeting_id: 'seed-meeting-1',
      title: '[주간회의] Hey Zzabi AI 파이프라인 개편 논의',
      meeting_date: new Date('2026-08-12'),
      meeting_type: '정기회의',
      content: [
        'AI 4단계 업무 파이프라인 기획서 초안 작성 필요',
        'UI/UX 디자인 통일 작업 - 전체 화면 일관성 점검',
        'Neo4j 기반 코드 영향 분석 모듈 검토 및 도입 결정',
        '신규 팀원 온보딩 자동화 기능 우선순위 논의',
        'Q3 스프린트 일정 최종 확정',
      ].join('\n'),
      status: 'DRAFT',
      project_id: project.project_id,
      organizer_id: choi.user_id,
      created_by: choi.user_id,
    },
  });

  const meeting2 = await prisma.meeting.upsert({
    where: { meeting_id: 'seed-meeting-2' },
    update: {},
    create: {
      meeting_id: 'seed-meeting-2',
      title: '[긴급회의] 사용자 인증 버그 대응',
      meeting_date: new Date('2026-08-10'),
      meeting_type: '긴급회의',
      content: [
        '소셜 로그인 토큰 만료 버그 원인 파악 완료 (JWT 갱신 로직 오류)',
        '핫픽스 배포 일정: 8월 10일 자정',
        '재발 방지를 위한 테스트 커버리지 확대 필요',
        '사용자 공지 문구 작성 및 CS팀 공유',
      ].join('\n'),
      summary: '소셜 로그인 JWT 갱신 로직 오류로 인한 인증 실패 - 핫픽스 배포 및 재발방지 대책 논의',
      status: 'REVIEW',
      project_id: project.project_id,
      organizer_id: choi.user_id,
      created_by: choi.user_id,
    },
  });

  await prisma.planning.upsert({
    where: { planning_id: 'seed-planning-1' },
    update: {},
    create: {
      planning_id: 'seed-planning-1',
      title: '[긴급 기획서] 사용자 인증 버그 대응',
      content: '# [긴급 기획서] 사용자 인증 버그 대응\n\n## 1. 배경\nJWT 토큰 갱신 로직 오류로 인해 소셜 로그인 사용자 일부가 인증 실패 현상 발생.\n\n## 2. 대응 계획\n- 핫픽스: refreshToken 만료 시 재발급 로직 수정\n- QA: 전체 인증 플로우 회귀 테스트\n- 사용자 공지: 점검 완료 후 CS팀 통해 배포\n\n## 3. 기대 효과\n- 인증 실패율 0% 달성\n- 사용자 신뢰도 회복',
      version: '1.0',
      status: 'REVIEW',
      project_id: project.project_id,
      meeting_id: meeting2.meeting_id,
      author_id: choi.user_id,
    },
  });

  console.log('Seeding finished:', { kim: kim.user_id, park: park.user_id, lee: lee.user_id, choi: choi.user_id, project: project.project_id, meeting1: meeting1.meeting_id, meeting2: meeting2.meeting_id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
