'use client';

import { useState, useEffect } from 'react';
import { Microscope, Send, Loader2, AlertTriangle, FileText, ChevronLeft, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

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

  const { tasks } = useAppStore();

  // 주간 보고서 모달 상태
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const generateWeeklyReport = () => {
    setGeneratingReport(true);
    setIsReportModalOpen(true);

    setTimeout(() => {
      const shippedTasks = tasks.filter(t => t.status === 'shipped');
      const recentReports = reports.slice(0, 5);

      let reportMd = `# 📊 주간 성과 및 리서치 종합 보고서\n\n`;
      reportMd += `생성일시: ${new Date().toLocaleString('ko-KR')}\n\n`;

      reportMd += `## 1. 완료된 주요 업무 (${shippedTasks.length}건)\n`;
      if (shippedTasks.length === 0) reportMd += `- 완료된 업무가 없습니다.\n`;
      shippedTasks.forEach(t => {
        reportMd += `- **${t.title}** (출처: ${t.source})\n`;
      });

      reportMd += `\n## 2. 주요 리서치 인사이트\n`;
      if (recentReports.length === 0) reportMd += `- 생성된 리서치 보고서가 없습니다.\n`;
      recentReports.forEach(r => {
        reportMd += `### Q. ${r.question}\n> ${r.content.replace(/\n/g, '\n> ')}\n\n`;
      });

      reportMd += `---\n*본 보고서는 사내 완료 업무 및 AI 리서치 보고서 내역을 기반으로 자동 생성되었습니다.*`;

      setGeneratedReport(reportMd);
      setGeneratingReport(false);
    }, 1500);
  };

  const downloadReportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const escaped = generatedReport
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>주간 성과 요약 리포트</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 48px; max-width: 720px; margin: 0 auto; color: #111827; line-height: 1.7; white-space: pre-wrap; }
      </style>
      </head><body>${escaped}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const shareReportByEmail = () => {
    const subject = encodeURIComponent('주간 성과 요약 리포트');
    const body = encodeURIComponent(generatedReport);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

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

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('이 리서치 보고서를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    try {
      const res = await fetch(`/api/research/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const selected = reports.find(r => r.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] relative">
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI 리서치</h1>
              <p className="text-xs text-gray-500">사내 회의록·기획서·업무 데이터를 기반으로 AI 분석 보고서를 작성합니다.</p>
            </div>
          </div>

          <button
            onClick={generateWeeklyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" /> 주간 보고서 자동생성
          </button>
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
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(r.id)}
                onKeyDown={e => { if (e.key === 'Enter') setSelectedId(r.id); }}
                className={cn("relative w-full text-left p-4 pr-9 hover:bg-gray-50 transition-colors cursor-pointer group", selectedId === r.id && "bg-blue-50")}
              >
                <button
                  onClick={e => handleDeleteReport(r.id, e)}
                  title="보고서 삭제"
                  className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 mb-1">
                  {r.degraded && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">근거 부족</span>}
                  <span className="text-[9px] text-gray-400">{r.sourceCount}건 참고</span>
                </div>
                <p title={r.question} className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{r.question}</p>
                <p className="text-[10px] text-gray-400">{r.createdBy} · {new Date(r.createdAt).toLocaleString('ko-KR')}</p>
              </div>
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

      {/* 주간 보고서 모달 */}
      {isReportModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-full max-h-[800px] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-600" /> 주간 성과 요약 리포트
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-white">
              {generatingReport ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <div>
                    <p className="font-bold text-gray-900">완료된 업무와 리서치 보고서를 취합하고 있습니다...</p>
                    <p className="text-sm text-gray-500 mt-1">요약 리포트를 작성 중입니다.</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none prose-blue">
                  <div className="whitespace-pre-wrap">{generatedReport}</div>
                </div>
              )}
            </div>
            {!generatingReport && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button onClick={downloadReportAsPdf} className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">PDF 다운로드</button>
                <button onClick={shareReportByEmail} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">이메일 공유</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
