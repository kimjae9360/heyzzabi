// 프로젝트별 GitHub 연동 - OAuth 앱 등록이나 .env 설정 없이, 저장소 주소(+선택적 토큰)만으로
// 웹 안에서 즉시 연동한다. 공개 저장소는 토큰 없이도 동작하고, 비공개 저장소이거나
// API 요청 한도를 늘리고 싶을 때만 Personal Access Token을 입력하면 된다.

export interface ParsedGithubRepo {
  owner: string;
  repo: string;
}

export function parseGithubRepoUrl(input: string): ParsedGithubRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // owner/repo 축약형
  if (!trimmed.includes('://') && !trimmed.startsWith('git@')) {
    const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(\.git)?$/);
    if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };
  }

  // git@github.com:owner/repo.git
  const ssh = trimmed.match(/^git@github\.com:([\w.-]+)\/([\w.-]+?)(\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };

  // https://github.com/owner/repo(.git)?
  try {
    const url = new URL(trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`);
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

interface GithubCommitApi {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { name?: string; date?: string } };
}
interface GithubPullApi {
  number: number; title: string; state: string; merged_at: string | null;
  user?: { login?: string } | null; html_url: string; updated_at: string;
  body?: string | null;
}
interface GithubIssueApi {
  number: number; title: string; state: string; user?: { login?: string } | null;
  html_url: string; updated_at: string; pull_request?: unknown;
}

export interface GithubActivity {
  repoFullName: string;
  repoUrl: string;
  commits: { sha: string; message: string; author: string; date: string; url: string }[];
  pullRequests: { number: number; title: string; body: string; state: string; author: string; url: string; updatedAt: string }[];
  issues: { number: number; title: string; state: string; author: string; url: string; updatedAt: string }[];
}

async function githubFetch<T>(path: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 404) throw new Error('저장소를 찾을 수 없습니다. 주소를 확인하거나, 비공개 저장소라면 토큰을 입력해 주세요.');
    if (res.status === 401) throw new Error('토큰이 유효하지 않습니다.');
    if (res.status === 403) throw new Error(String(body?.message || '').includes('rate limit') ? 'GitHub API 요청 한도를 초과했습니다. 토큰을 등록하면 한도가 늘어납니다.' : '접근 권한이 없습니다. 비공개 저장소라면 토큰을 입력해 주세요.');
    throw new Error(body?.message || `GitHub API 요청에 실패했습니다. (${res.status})`);
  }
  return res.json();
}

export async function verifyGithubRepoAccess(owner: string, repo: string, token?: string | null): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}`, token);
}

export async function fetchGithubActivity(owner: string, repo: string, token?: string | null): Promise<GithubActivity> {
  const [commits, pulls, issues] = await Promise.all([
    githubFetch<GithubCommitApi[]>(`/repos/${owner}/${repo}/commits?per_page=10`, token),
    githubFetch<GithubPullApi[]>(`/repos/${owner}/${repo}/pulls?state=all&per_page=10`, token),
    githubFetch<GithubIssueApi[]>(`/repos/${owner}/${repo}/issues?state=all&per_page=10`, token),
  ]);

  return {
    repoFullName: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    commits: commits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name || '알 수 없음',
      date: c.commit.author?.date || '',
      url: c.html_url,
    })),
    pullRequests: pulls.map((p) => ({
      number: p.number,
      title: p.title,
      body: p.body || '',
      state: p.merged_at ? 'merged' : p.state,
      author: p.user?.login || '알 수 없음',
      url: p.html_url,
      updatedAt: p.updated_at,
    })),
    issues: issues
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        author: i.user?.login || '알 수 없음',
        url: i.html_url,
        updatedAt: i.updated_at,
      })),
  };
}
