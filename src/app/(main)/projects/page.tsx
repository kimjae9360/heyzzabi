'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderKanban, Plus, X, Mic2, ListChecks, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const STATUS_LABEL: Record<string, string> = { PLANNED: '계획', IN_PROGRESS: '진행중', COMPLETED: '완료', SUSPENDED: '중단', HOLD: '보류' };
const PRIORITY_LABEL: Record<string, string> = { LOW: '낮음', NORMAL: '보통', HIGH: '높음', URGENT: '긴급' };

export default function ProjectsPage() {
  const { projects = [], fetchProjects, createProject } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createProject({ title: title.trim(), description: description.trim() || undefined, priority });
      setTitle(''); setDescription(''); setPriority('NORMAL');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="text-blue-600 w-5 h-5" /> 프로젝트
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">프로젝트별로 회의록과 업무를 분리해서 관리합니다. 업무관리(파이프라인)에서 프로젝트를 선택해 필터링할 수 있습니다.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm shrink-0">
          <Plus className="w-3.5 h-3.5" /> 새 프로젝트
        </button>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-16 text-gray-400"><Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">등록된 프로젝트가 없습니다. 새 프로젝트를 만들어 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/pipeline?project=${p.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all block">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{STATUS_LABEL[p.status] ?? p.status}</span>
                  <span className="text-[9px] font-bold text-gray-400">{PRIORITY_LABEL[p.priority] ?? p.priority}</span>
                </div>
                <h3 className="font-black text-gray-900 mb-1 truncate" title={p.title}>{p.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]" title={p.description}>{p.description || '설명이 없습니다.'}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Mic2 className="w-3 h-3" />{p.meetingCount ?? 0}개 회의</span>
                  <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />{p.taskCount ?? 0}개 업무</span>
                  <span className="ml-auto text-blue-600 font-bold">업무관리에서 보기 →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FolderKanban className="text-blue-600 w-5 h-5" />새 프로젝트</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">프로젝트 이름 *</label>
                <input autoFocus required value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" placeholder="예: Hey Zzabi 웹 리뉴얼" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">설명</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm h-20 resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" placeholder="프로젝트 설명 (선택)" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">우선순위</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none bg-gray-50 focus:bg-white">
                  <option value="LOW">낮음</option>
                  <option value="NORMAL">보통</option>
                  <option value="HIGH">높음</option>
                  <option value="URGENT">긴급</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button type="submit" disabled={creating} className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm disabled:opacity-60">
                  {creating ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
