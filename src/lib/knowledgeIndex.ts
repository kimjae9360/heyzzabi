import { prisma } from './prisma';
import { embedText, cosineSimilarity, classifyDocument } from './openai';

export async function indexMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { meeting_id: meetingId } });
  if (!meeting) return;
  const text = `${meeting.title}\n\n${meeting.content}${meeting.summary ? `\n\n요약: ${meeting.summary}` : ''}`;
  const [embedding, category] = await Promise.all([
    embedText(text),
    classifyDocument(meeting.title, text).catch(() => null),
  ]);
  await prisma.knowledgeChunk.upsert({
    where: { source_type_source_id: { source_type: 'MEETING', source_id: meetingId } },
    update: { title: meeting.title, content: text, embedding: JSON.stringify(embedding), category },
    create: { source_type: 'MEETING', source_id: meetingId, title: meeting.title, content: text, embedding: JSON.stringify(embedding), category },
  });
}

export async function indexPlanning(planningId: string) {
  const planning = await prisma.planning.findUnique({ where: { planning_id: planningId } });
  if (!planning) return;
  const text = `${planning.title}\n\n${planning.content}`;
  const [embedding, category] = await Promise.all([
    embedText(text),
    classifyDocument(planning.title, text).catch(() => null),
  ]);
  await prisma.knowledgeChunk.upsert({
    where: { source_type_source_id: { source_type: 'PLANNING', source_id: planningId } },
    update: { title: planning.title, content: text, embedding: JSON.stringify(embedding), category },
    create: { source_type: 'PLANNING', source_id: planningId, title: planning.title, content: text, embedding: JSON.stringify(embedding), category },
  });
}

export async function reindexAll() {
  const [meetings, plannings] = await Promise.all([
    prisma.meeting.findMany({ select: { meeting_id: true } }),
    prisma.planning.findMany({ select: { planning_id: true } }),
  ]);
  let count = 0;
  for (const m of meetings) {
    await indexMeeting(m.meeting_id);
    count++;
  }
  for (const p of plannings) {
    await indexPlanning(p.planning_id);
    count++;
  }
  return count;
}

export interface SearchHit {
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  category: string | null;
  score: number;
}

export async function searchKnowledge(query: string, topK = 5): Promise<SearchHit[]> {
  const queryEmbedding = await embedText(query);
  const chunks = await prisma.knowledgeChunk.findMany();
  const scored = chunks.map((c) => ({
    sourceType: c.source_type,
    sourceId: c.source_id,
    title: c.title,
    content: c.content,
    category: c.category,
    score: cosineSimilarity(queryEmbedding, JSON.parse(c.embedding)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
