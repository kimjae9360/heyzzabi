import OpenAI from 'openai';

export class AIConfigError extends Error {
  constructor() {
    super('OPENAI_API_KEY가 설정되지 않았습니다. .env 파일에 키를 입력한 뒤 다시 시도해 주세요.');
    this.name = 'AIConfigError';
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIConfigError();
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

async function callJson<T>(system: string, user: string): Promise<T> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('AI 응답이 비어 있습니다.');
  return JSON.parse(content) as T;
}

export interface MeetingAnalysis {
  summary: string;
  agenda: string[];
  decisions: string[];
  actionItems: string[];
  proposalTitle: string;
  proposalContent: string; // markdown
}

// Role 1: 회의 요약가 + 기획서 작성가 (MetaGPT-style role separation, chained in sequence)
export async function analyzeMeetingAndDraftProposal(meetingTitle: string, meetingContent: string): Promise<MeetingAnalysis> {
  const summaryStage = await callJson<{ summary: string; agenda: string[]; decisions: string[]; actionItems: string[] }>(
    '당신은 회의록 요약가입니다. 주어진 회의 본문을 분석해 한국어로 요약(summary), 안건(agenda) 목록, 결정사항(decisions) 목록, 액션아이템(actionItems) 목록을 JSON으로 반환하세요. 형식: {"summary": string, "agenda": string[], "decisions": string[], "actionItems": string[]}',
    `회의 제목: ${meetingTitle}\n\n회의 본문:\n${meetingContent}`
  );

  const proposalStage = await callJson<{ proposalTitle: string; proposalContent: string }>(
    '당신은 기획서 작성가입니다. 회의 요약/안건/결정사항/액션아이템을 바탕으로 마크다운 형식의 기획서를 작성하고 JSON으로 반환하세요. 배경, 주요 안건 요약, 결정사항, 핵심 요구사항(액션아이템), 기대 효과, 일정 계획 섹션을 포함하세요. 형식: {"proposalTitle": string, "proposalContent": string(markdown)}',
    `회의 제목: ${meetingTitle}\n요약: ${summaryStage.summary}\n안건: ${summaryStage.agenda.join(', ')}\n결정사항: ${summaryStage.decisions.join(', ')}\n액션아이템: ${summaryStage.actionItems.join(', ')}`
  );

  return { ...summaryStage, ...proposalStage };
}

export interface TaskDraft {
  title: string;
  description: string;
  estimatedHours: number;
  difficulty: 'High' | 'Medium' | 'Low';
}

// Role 2: 업무 분해가 - 기획서를 실행 가능한 업무 단위로 쪼갠다
export async function breakdownProposalIntoTasks(proposalTitle: string, proposalContent: string): Promise<TaskDraft[]> {
  const result = await callJson<{ tasks: TaskDraft[] }>(
    '당신은 업무 분해 전문가입니다. 주어진 기획서를 실행 가능한 3~7개의 세부 업무로 분해하고 JSON으로 반환하세요. 각 업무는 제목(title), 설명(description), 예상 소요시간(estimatedHours, 숫자), 난이도(difficulty: High/Medium/Low)를 가집니다. 형식: {"tasks": [{"title": string, "description": string, "estimatedHours": number, "difficulty": "High"|"Medium"|"Low"}]}',
    `기획서 제목: ${proposalTitle}\n\n기획서 본문:\n${proposalContent}`
  );
  return result.tasks;
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getClient();
  const result = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return result.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RagAnswer {
  answer: string;
}

// khoj 스타일 RAG: 검색된 문서를 컨텍스트로 주고 근거 기반으로만 답하게 한다
export async function answerFromContext(question: string, contextChunks: { title: string; content: string }[]): Promise<RagAnswer> {
  if (contextChunks.length === 0) {
    return { answer: '관련된 회의록/기획서를 찾지 못했습니다. 질문을 다르게 표현해 보시거나, 먼저 재인덱싱을 실행해 주세요.' };
  }
  const context = contextChunks.map((c, i) => `[문서 ${i + 1}] ${c.title}\n${c.content}`).join('\n\n---\n\n');
  const result = await callJson<{ answer: string }>(
    '당신은 사내 지식망 어시스턴트입니다. 반드시 주어진 문서(JSON 아님, 아래 컨텍스트)의 내용만 근거로 한국어로 답하세요. 문서에 없는 내용은 추측하지 말고 "문서에서 찾을 수 없습니다"라고 답하세요. 답변에 어떤 문서를 참고했는지 언급하세요. JSON 형식으로 반환: {"answer": string}',
    `컨텍스트:\n${context}\n\n질문: ${question}`
  );
  return result;
}
