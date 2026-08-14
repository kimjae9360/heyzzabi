'use client';

import { useState, useEffect } from 'react';
import { Microscope, Send, Loader2, AlertTriangle, FileText, ChevronLeft, BookmarkMinus, Clock, BrainCircuit, CalendarPlus, Wand2, X, LayoutGrid, List } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'reports' | 'clips'>('reports');
  
  const { clips, removeClip, createTaskFromClip, tasks } = useAppStore();
  const [clipSearch, setClipSearch] = useState('');
  const [clipViewMode, setClipViewMode] = useState<'grid' | 'table'>('grid');
  
  // 주간 보고서 모달 상태
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const generateWeeklyReport = () => {
    setGeneratingReport(true);
    setIsReportModalOpen(true);
    
    setTimeout(() => {
      const shippedTasks = tasks.filter(t => t.status === 'shipped');
      const recentClips = clips.slice(0, 5); // 최근 5개 클립
      
      let reportMd = `# 📊 주간 성과 및 리서치 종합 보고서\n\n`;
      reportMd += `생성일시: ${new Date().toLocaleString('ko-KR')}\n\n`;
      
      reportMd += `## 1. 완료된 주요 업무 (${shippedTasks.length}건)\n`;
      if (shippedTasks.length === 0) reportMd += `- 완료된 업무가 없습니다.\n`;
      shippedTasks.forEach(t => {
        reportMd += `- **${t.title}** (출처: ${t.source})\n`;
      });
      
      reportMd += `\n## 2. 주요 리서치 인사이트\n`;
      if (recentClips.length === 0) reportMd += `- 스크랩된 리서치가 없습니다.\n`;
      recentClips.forEach(c => {
        reportMd += `### Q. ${c.query}\n> ${c.content.replace(/\n/g, '\n> ')}\n\n`;
      });
      
      reportMd += `---\n*본 보고서는 사내 완료 업무 및 AI 리서치 스크랩 내역을 기반으로 자동 생성되었습니다.*`;
      
      setGeneratedReport(reportMd);
      setGeneratingReport(false);
    }, 1500);
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

  const selected = reports.find(r => r.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI 리서치</h1>
              <p className="text-xs text-gray-500">AI 분석 보고서 작성 및 사이드 패널에서 스크랩한 내용을 관리합니다.</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('reports')} 
              className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeTab === 'reports' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              분석 보고서
            </button>
            <button 
              onClick={() => setActiveTab('clips')} 
              className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeTab === 'clips' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              스크랩 보관함
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'reports' ? (
          <>
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
                <p title={r.question} className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{r.question}</p>
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
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full relative">
            <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-3">
                AI 패널 스크랩 보관함
                <button 
                  onClick={generateWeeklyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" /> 주간 보고서 자동생성
                </button>
              </h2>
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-0.5 rounded-lg flex items-center">
                  <button onClick={() => setClipViewMode('grid')} className={cn("p-1.5 rounded-md transition-all", clipViewMode === 'grid' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="그리드 뷰"><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setClipViewMode('table')} className={cn("p-1.5 rounded-md transition-all", clipViewMode === 'table' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")} title="테이블 뷰"><List className="w-4 h-4" /></button>
                </div>
                <input
                  type="text"
                  value={clipSearch}
                  onChange={e => setClipSearch(e.target.value)}
                  placeholder="스크랩 내용 검색..."
                  className="w-64 px-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {clips.filter(c => c.query.toLowerCase().includes(clipSearch.toLowerCase()) || c.content.toLowerCase().includes(clipSearch.toLowerCase())).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BookmarkMinus className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">보관된 리서치 결과가 없습니다</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    우측 상단의 'AI 리서치' 패널에서 AI 비서와 대화 중, 중요한 답변의 북마크 버튼을 눌러 스크랩해보세요.
                  </p>
                </div>
              ) : clipViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clips.filter(c => c.query.toLowerCase().includes(clipSearch.toLowerCase()) || c.content.toLowerCase().includes(clipSearch.toLowerCase())).map((clip) => (
                    <div key={clip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-[10px] font-black text-blue-600 mb-1 flex items-center gap-1 uppercase tracking-wider">
                            <BrainCircuit className="w-3 h-3" /> 질문
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm truncate" title={clip.query}>
                            {clip.query}
                          </h3>
                        </div>
                        <button 
                          onClick={() => removeClip(clip.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          title="스크랩 해제"
                        >
                          <BookmarkMinus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="text-[10px] font-black text-emerald-600 mb-1 flex items-center gap-1 uppercase tracking-wider">
                          <FileText className="w-3 h-3" /> 답변 내용
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">{clip.content}</p>
                      </div>
                      <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                          <Clock className="w-3 h-3" />
                          {new Date(clip.timestamp).toLocaleString('ko-KR')}
                        </div>
                        <button 
                          onClick={() => createTaskFromClip(clip)}
                          className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-100"
                        >
                          <CalendarPlus className="w-3 h-3" /> 업무화
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 text-xs uppercase font-black">
                      <tr>
                        <th className="px-4 py-3 w-1/4">질문 (Query)</th>
                        <th className="px-4 py-3 w-1/2">답변 내용 (Content)</th>
                        <th className="px-4 py-3 w-40 text-center">스크랩 일시</th>
                        <th className="px-4 py-3 w-28 text-center">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clips.filter(c => c.query.toLowerCase().includes(clipSearch.toLowerCase()) || c.content.toLowerCase().includes(clipSearch.toLowerCase())).map((clip) => (
                        <tr key={clip.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 align-top">
                            <div className="line-clamp-2" title={clip.query}>{clip.query}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="line-clamp-2 text-xs whitespace-pre-wrap">{clip.content}</div>
                          </td>
                          <td className="px-4 py-3 text-center align-top text-[11px] text-gray-500 font-bold">
                            {new Date(clip.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-center align-top space-y-1.5">
                            <button 
                              onClick={() => createTaskFromClip(clip)}
                              className="w-full flex items-center justify-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded border border-blue-100 transition-colors"
                            >
                              <CalendarPlus className="w-3 h-3" /> 업무화
                            </button>
                            <button 
                              onClick={() => removeClip(clip.id)}
                              className="w-full flex items-center justify-center gap-1 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded border border-red-100 transition-colors"
                            >
                              <BookmarkMinus className="w-3 h-3" /> 해제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          <p className="font-bold text-gray-900">완료된 업무와 리서치를 취합하고 있습니다...</p>
                          <p className="text-sm text-gray-500 mt-1">AI가 데이터를 분석하여 요약 리포트를 작성 중입니다.</p>
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
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">PDF 다운로드</button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">이메일 공유</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
