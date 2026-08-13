'use client';

import { useState, useEffect } from 'react';
import { Microscope, Send, Loader2, AlertTriangle, FileText, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportSummary {
  id: string;
  question: string;
  content: string;
  degraded: boolean;
  createdBy: string;
  createdAt: string;
  sourceCount: number;
}

export default function ResearchPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research');
      setReports(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRun = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '리서치에 실패했습니다.');
      setQuestion('');
      await load();
      setSelectedId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '리서치에 실패했습니다.');
    } finally {
      setRunning(false);
    }
  };

  const selected = reports.find(r => r.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI 리서치</h1>
            <p className="text-xs text-gray-500">회의록/기획서/업무 기록만 근거로 분석 보고서를 작성합니다. 외부 웹 검색은 하지 않습니다.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={cn("border-r border-gray-200 bg-white flex flex-col shrink-0 transition-all", selected ? "w-[340px]" : "w-full max-w-2xl mx-auto border-r-0")}>
          <div className="p-4 border-b border-gray-100 space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </div>
            )}
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="예: 최근 반복적으로 지연되는 업무의 공통 원인이 뭐야?"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
            />
            <button
              onClick={handleRun}
              disabled={running || !question.trim()}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {running ? <><Loader2 className="w-4 h-4 animate-spin" /> 내부 데이터 분석 중...</> : <><Send className="w-4 h-4" /> 리서치 시작</>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                아직 생성된 리서치 보고서가 없습니다.
              </div>
            ) : reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn("w-full text-left p-4 hover:bg-gray-50 transition-colors", selectedId === r.id && "bg-blue-50")}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {r.degraded && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">근거 부족</span>}
                  <span className="text-[9px] text-gray-400">{r.sourceCount}건 참고</span>
                </div>
                <p className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{r.question}</p>
                <p className="text-[10px] text-gray-400">{r.createdBy} · {new Date(r.createdAt).toLocaleString('ko-KR')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <button onClick={() => setSelectedId(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
                <ChevronLeft className="w-3.5 h-3.5" /> 목록으로
              </button>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-black text-gray-900 mb-1">{selected.question}</h2>
                <p className="text-[11px] text-gray-400 mb-5">{selected.createdBy} · {new Date(selected.createdAt).toLocaleString('ko-KR')} · 참고 문서 {selected.sourceCount}건</p>
                <div className="prose prose-sm max-w-none text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
