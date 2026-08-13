import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
// pdf-parse's index.js has debug-mode self-test code that misfires under bundlers
// (module.parent is undefined in Next.js's module wrapping) - import the internal lib directly.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { transcribeAudio, AIConfigError } from '@/lib/openai';

const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.mp4', '.mpeg', '.mpga'];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API 제한과 동일)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일이 너무 큽니다 (최대 25MB).' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const ext = name.slice(name.lastIndexOf('.'));

    if (AUDIO_EXT.includes(ext)) {
      const text = await transcribeAudio(file);
      return NextResponse.json({ text, kind: 'audio' });
    }

    if (ext === '.docx') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: result.value, kind: 'docx' });
    }

    if (ext === '.pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdfParse(buffer);
      return NextResponse.json({ text: result.text, kind: 'pdf' });
    }

    if (ext === '.txt' || ext === '.md') {
      const text = await file.text();
      return NextResponse.json({ text, kind: 'text' });
    }

    return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${ext} (지원: 음성 mp3/wav/m4a, 문서 txt/md/docx/pdf)` }, { status: 400 });
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '파일 처리에 실패했습니다.' }, { status: 500 });
  }
}
