'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mic, FileText, CheckSquare, Search, Download, FolderOpen, Loader2, BrainCircuit, FileSignature, Trash2, Edit3, Save, X, ChevronRight, BarChart3, AlertCircle, Upload, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

type MeetingTab = 'raw' | 'analysis' | 'proposal';

export default function Meetings() {
  const { meetings = [], generateProposal = () => {}, editProposal = () => {}, approveProposalAndExtractTasks = () => {}, rejectProposal = () => {}, addMeeting = () => {}, deleteMeeting = () => {}, downloadPPT = async () => {} } = useAppStore();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MeetingTab>('raw');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingProposal, setEditingProposal] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);
  const filteredMeetings = meetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.summary.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (!selectedMeeting && meetings.length > 0) setSelectedMeetingId(meetings[0].id);
  }, [meetings, selectedMeeting]);

  useEffect(() => {
    if (selectedMeeting?.hasProposal) setActiveTab('analysis');
    else setActiveTab('raw');
  }, [selectedMeetingId]);

  const handleGenerateProposal = async () => {
    if (!selectedMeeting) return;
    setIsGenerating(true);
    try {
      await generateProposal(selectedMeeting.id);
      setActiveTab('analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReject = () => {
    if (!selectedMeeting || !rejectReason.trim()) return;
    rejectProposal(selectedMeeting.id, rejectReason.trim());
    setShowRejectModal(false);
    setRejectReason('');
    setActiveTab('raw');
  };

  const handleApprove = () => {
    if (!selectedMeeting) return;
    approveProposalAndExtractTasks(selectedMeeting.id);
  };

  const handleSaveEdit = () => {
    if (!selectedMeeting) return;
    editProposal(selectedMeeting.id, editedContent);
    setEditingProposal(false);
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    await addMeeting({ title: newTitle, content: newContent });
    setNewTitle(''); setNewContent(''); setUploadedFileName(''); setExtractError('');
    setShowNewForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setExtractError('');
    setUploadedFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/meetings/extract-text', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '파일 처리에 실패했습니다.');
      setNewContent(prev => (prev ? prev + '\n\n' : '') + data.text);
      if (!newTitle) setNewTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : '파일 처리에 실패했습니다.');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  const handleDelete = (meetingId: string) => {
    if (window.confirm('이 회의록을 삭제하시겠습니까?')) {
      deleteMeeting(meetingId);
    }
  };

  const tabs: { key: MeetingTab; label: string; icon: typeof FileText; locked?: boolean }[] = [
    { key: 'raw', label: '회의록', icon: Mic },
    { key: 'analysis', label: 'AI 분석', icon: BarChart3, locked: !selectedMeeting?.hasProposal },
    { key: 'proposal', label: '기획서', icon: FileSignature, locked: !selectedMeeting?.hasProposal },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-red-100">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertCircle className="w-5 h-5" />기획서 반려</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">반려 사유를 작성해 주세요. 사유는 알림과 함께 기록됩니다.</p>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm h-32 resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="예: 핵심 결정사항이 누락되었습니다. 3번 안건의 담당자 배정 내용을 다시 작성해 주세요."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition-colors">취소</button>
                <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> 반려 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] overflow-hidden border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Mic className="text-blue-600 w-5 h-5" />새 회의록 작성</h3>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddMeeting} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">회의 제목 *</label>
                  <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-gray-50 focus:bg-white transition-all" placeholder="예: [주간회의] 8월 2주차 스프린트 플래닝" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">파일에서 불러오기 <span className="text-gray-400 font-normal">(음성 mp3/wav/m4a, 문서 txt/md/docx/pdf)</span></label>
                  <label className={cn(
                    "flex items-center gap-2 w-full border-2 border-dashed rounded-lg p-3 text-sm cursor-pointer transition-all",
                    isExtracting ? "border-blue-300 bg-blue-50 cursor-wait" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40"
                  )}>
                    <input type="file" className="hidden" disabled={isExtracting}
                      accept=".mp3,.wav,.m4a,.webm,.ogg,.mp4,.txt,.md,.docx,.pdf"
                      onChange={handleFileUpload} />
                    {isExtracting ? (
                      <><Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" /> <span className="text-blue-700 font-medium">{uploadedFileName} 처리 중...</span></>
                    ) : uploadedFileName ? (
                      <><Paperclip className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="text-emerald-700 font-medium truncate">{uploadedFileName}</span> <span className="text-gray-400 ml-auto shrink-0">다른 파일 선택</span></>
                    ) : (
                      <><Upload className="w-4 h-4 text-gray-400 shrink-0" /> <span className="text-gray-500">클릭해서 파일 선택 (음성은 실제 Whisper로 텍스트 변환됩니다)</span></>
                    )}
                  </label>
                  {extractError && <p className="text-[11px] text-red-600 mt-1.5">{extractError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">회의 내용 * <span className="text-gray-400 font-normal">(각 줄이 하나의 안건으로 처리됩니다 - 직접 입력하거나 위에서 파일을 불러올 수 있습니다)</span></label>
                  <textarea required value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm h-36 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-gray-50 focus:bg-white transition-all" placeholder="회의 내용을 한 줄씩 입력하세요.&#10;&#10;예:&#10;신규 로그인 화면 디자인 시안 A안 확정&#10;DB 인덱스 최적화 작업 금요일까지 완료 필요&#10;모바일 앱 QA 일정 조율" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewForm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="text-blue-600 w-5 h-5" />
          회의 분석 (Phase 1: 회의록 → AI 분석 → 기획서)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">회의록 등록 → AI 구조화 분석 → 기획서 초안 검토/반려 → 파이프라인 전달</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left List */}
        <div className="w-[320px] border-r border-gray-200 bg-white flex flex-col shrink-0 z-10 shadow-sm">
          <div className="p-3 border-b border-gray-100 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="회의록 검색..." className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all" />
            </div>
            <button onClick={() => setShowNewForm(true)} className="px-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg whitespace-nowrap transition-colors shadow-sm">+ 새 회의록</button>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {filteredMeetings.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{searchQuery ? '검색 결과 없음' : '회의록을 등록하세요.'}</p>
              </div>
            ) : filteredMeetings.map((meeting) => (
              <div key={meeting.id} onClick={() => setSelectedMeetingId(meeting.id)}
                className={cn("p-3.5 rounded-xl cursor-pointer transition-all border group",
                  selectedMeetingId === meeting.id ? "bg-blue-50 border-blue-300 ring-1 ring-blue-400/30 shadow-sm" : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full",
                    meeting.isTasksExtracted ? "bg-emerald-100 text-emerald-700" :
                    meeting.isProposalRejected ? "bg-red-100 text-red-600" :
                    meeting.hasProposal ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {meeting.isTasksExtracted ? '✓ 파이프라인 전달' : meeting.isProposalRejected ? '⚠ 반려됨' : meeting.hasProposal ? '기획서 생성됨' : '대기 중'}
                  </span>
                  <span className="text-[10px] text-gray-400">{meeting.date}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-xs mb-1 line-clamp-2">{meeting.title}</h3>
                <p className="text-[10px] text-gray-400">{meeting.summary.length}개 안건</p>
                {meeting.isProposalRejected && (
                  <div className="mt-2 text-[9px] text-red-600 bg-red-50 rounded px-2 py-1 font-medium border border-red-100 line-clamp-1">
                    반려 사유: {meeting.proposalRejectedReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail */}
        <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
          {selectedMeeting ? (
            <div className="max-w-3xl mx-auto p-6 space-y-4 animate-fade-in">
              {/* Header Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700">회의록 원문</span>
                    <span className="text-xs text-gray-400">{selectedMeeting.date}</span>
                    {selectedMeeting.isProposalRejected && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-red-100 text-red-700">반려됨 — 재작성 필요</span>}
                  </div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">{selectedMeeting.title}</h1>
                </div>
                <div className="flex gap-1.5 ml-4 shrink-0">
                  {selectedMeeting.hasProposal && (
                    <button
                      onClick={() => downloadPPT(selectedMeeting.id)}
                      title="기획서 PPTX 다운로드"
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(selectedMeeting.id)} className="p-2 border border-red-100 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => !tab.locked && setActiveTab(tab.key)}
                    disabled={tab.locked}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-r border-gray-100 last:border-0",
                      activeTab === tab.key ? "bg-blue-600 text-white" :
                      tab.locked ? "text-gray-300 cursor-not-allowed bg-gray-50" :
                      "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.locked && <span className="text-[8px] bg-gray-200 text-gray-400 px-1 py-0.5 rounded ml-1">생성 후 활성화</span>}
                  </button>
                ))}
              </div>

              {/* Tab: 회의록 (Raw) */}
              {activeTab === 'raw' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center gap-2 text-sm font-bold text-gray-600">
                    <Mic className="w-4 h-4 text-gray-400" /> 회의 원문
                  </div>
                  <div className="p-5 space-y-1">
                    {selectedMeeting.summary.map((line, i) => (
                      <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                        <span className="text-gray-300 font-bold text-xs select-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-sm text-gray-800 leading-relaxed">{line}</span>
                      </div>
                    ))}
                  </div>
                  {/* Generate CTA */}
                  {!selectedMeeting.hasProposal && (
                    <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-indigo-900">AI 기획서 자동 생성</p>
                        <p className="text-xs text-indigo-600 mt-0.5">안건·결정사항·액션아이템을 추출하고 구조화된 기획서를 작성합니다.</p>
                      </div>
                      <button onClick={handleGenerateProposal} disabled={isGenerating}
                        className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-black shadow transition-all disabled:opacity-70 flex items-center gap-2 shrink-0 ml-4"
                      >
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 분석 및 기획서 작성 중...</> : <><BrainCircuit className="w-4 h-4" /> 기획서 작성 API 요청</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: AI 분석 (Structured) */}
              {activeTab === 'analysis' && selectedMeeting.analysis && (
                <div className="space-y-3">
                  {[
                    { label: '📋 주요 안건 (Agenda)', items: selectedMeeting.analysis.agenda, color: 'blue' },
                    { label: '✅ 결정사항 (Decisions)', items: selectedMeeting.analysis.decisions, color: 'emerald' },
                    { label: '🎯 액션아이템 (Action Items)', items: selectedMeeting.analysis.actionItems, color: 'violet' },
                  ].map(section => (
                    <div key={section.label} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className={cn("border-b px-5 py-3 flex items-center gap-2 text-sm font-bold",
                        section.color === 'blue' ? "bg-blue-50 border-blue-100 text-blue-800" :
                        section.color === 'emerald' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                        "bg-violet-50 border-violet-100 text-violet-800"
                      )}>
                        {section.label}
                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full ml-auto",
                          section.color === 'blue' ? "bg-blue-200 text-blue-700" :
                          section.color === 'emerald' ? "bg-emerald-200 text-emerald-700" :
                          "bg-violet-200 text-violet-700"
                        )}>{section.items.length}건</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5",
                              section.color === 'blue' ? "bg-blue-500" :
                              section.color === 'emerald' ? "bg-emerald-500" : "bg-violet-500"
                            )}>{i + 1}</div>
                            <p className="text-sm text-gray-800 leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="text-center">
                    <button onClick={() => setActiveTab('proposal')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow transition-all">
                      기획서 초안 확인하기 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: 기획서 (Proposal) */}
              {activeTab === 'proposal' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="border-b border-gray-100 bg-indigo-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                      <FileSignature className="w-4 h-4" /> AI 기획서 초안
                    </div>
                    {!selectedMeeting.isTasksExtracted && (
                      <button onClick={() => { setEditedContent(selectedMeeting.proposalContent || ''); setEditingProposal(true); }}
                        className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> 수정
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    {editingProposal ? (
                      <div className="space-y-3">
                        <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)}
                          className="w-full h-72 p-4 border border-indigo-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-400 outline-none bg-white resize-none" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingProposal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" /> 취소</button>
                          <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm"><Save className="w-3.5 h-3.5" /> 저장</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7 bg-gray-50 rounded-xl p-5 border border-gray-100 font-medium">
                        {selectedMeeting.proposalContent}
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject Actions */}
                  {!selectedMeeting.isTasksExtracted && !editingProposal && (
                    <div className="border-t border-gray-100 p-5 flex items-center justify-between bg-gray-50">
                      <p className="text-xs text-gray-500 font-medium">검토 완료 후 파이프라인으로 전달하거나, 반려 사유를 작성해 주세요.</p>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button onClick={() => setShowRejectModal(true)}
                          className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-4 h-4" /> 반려
                        </button>
                        <button onClick={handleApprove}
                          className="px-4 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckSquare className="w-4 h-4" /> 검토완료 → 배분 요청
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedMeeting.isTasksExtracted && (
                    <div className="border-t border-emerald-100 p-5 bg-emerald-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <CheckSquare className="w-5 h-5" /> 기획서 확정 — 파이프라인으로 전달되었습니다.
                      </div>
                      <Link href="/pipeline" className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors flex items-center gap-1">
                        파이프라인 보기 <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">좌측에서 회의록을 선택하거나 새로운 회의록을 등록하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}