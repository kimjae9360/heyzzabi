import { useState } from 'react';
import { Settings as SettingsIcon, Trash2, Shield, AlertTriangle, Lock, Info, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

type Tab = 'permissions' | 'system';

const ROLE_PERMISSIONS = [
  { role: '전직원 (Member)', desc: '기본 열람 및 검색', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색'], color: 'gray' },
  { role: '팀장 (Lead)', desc: '문서 수정 및 배분 승인', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색', '배분 승인/반려', '문서 수정', '개인 업무 완료 처리'], color: 'blue' },
  { role: 'PM (Admin)', desc: '전체 관리자 권한', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색', '배분 승인/반려', '문서 수정', '기획서 생성/반려', '파이프라인 전체 제어', '직원 등록/삭제', '데이터 초기화'], color: 'indigo' },
];

export default function Settings() {
  const { employees = [], resetStore } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('permissions');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'permissions', label: '권한 구조' },
    { key: 'system', label: '시스템 설정' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-gray-700" /> 관리자 설정
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">권한 구조 확인 및 시스템 환경 설정을 관리합니다. 팀원 등록/수정은 <Link to="/employees" className="text-blue-600 font-bold hover:underline">직원관리</Link> 메뉴로 이동했습니다.</p>
        <div className="flex gap-1 mt-4">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.key ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* Tab: 권한 구조 */}
        {activeTab === 'permissions' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <Link to="/employees" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm hover:border-blue-300 hover:bg-blue-50/40 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><Users2 className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-bold text-gray-900">등록된 직원 {employees.length}명</div>
                  <div className="text-[11px] text-gray-400">직원관리 페이지에서 등록/수정/삭제</div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:underline">바로가기 →</span>
            </Link>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>기획서 기반 권한 구조입니다.</strong> 승인·반려 같은 핵심 액션은 팀장급 이상만 수행 가능하며, 회의록 열람은 전직원에게 개방됩니다. 권한 변경은 팀원 등록 시 '권한 레벨' 필드로 설정합니다.
              </div>
            </div>
            <div className="grid gap-4">
              {ROLE_PERMISSIONS.map((r, i) => (
                <div key={i} className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden",
                  r.color === 'indigo' ? "border-indigo-200" : r.color === 'blue' ? "border-blue-200" : "border-gray-200"
                )}>
                  <div className={cn("px-5 py-4 border-b flex items-center justify-between",
                    r.color === 'indigo' ? "bg-indigo-50 border-indigo-100" :
                    r.color === 'blue' ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <Lock className={cn("w-5 h-5",
                        r.color === 'indigo' ? "text-indigo-600" : r.color === 'blue' ? "text-blue-600" : "text-gray-500"
                      )} />
                      <div>
                        <div className="font-black text-gray-900 text-sm">{r.role}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{r.desc}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                      {employees.filter(e => e.level === (r.role.includes('PM') ? 'pm' : r.role.includes('팀장') ? 'lead' : 'member')).length}명
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-3 gap-2">
                    {r.permissions.map((p, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-gray-700 font-medium">
                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                          r.color === 'indigo' ? "bg-indigo-100" : r.color === 'blue' ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          <span className={cn("text-[8px] font-black",
                            r.color === 'indigo' ? "text-indigo-700" : r.color === 'blue' ? "text-blue-700" : "text-gray-600"
                          )}>✓</span>
                        </div>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: 시스템 설정 */}
        {activeTab === 'system' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">플랫폼 정보</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {[
                  { label: '서비스명', value: 'Hey Zzabi (헤이 짜비)' },
                  { label: '버전', value: 'v0.9.1-beta' },
                  { label: 'AI 엔진', value: 'LangGraph v0.2 (모사)' },
                  { label: '데이터 모드', value: 'Local Store (Zustand)' },
                  { label: '빌드', value: 'Vite + React + TypeScript' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-500">{item.label}</span>
                    <span className="font-bold text-gray-900 text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
              <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" /> 데이터 초기화 (Danger Zone)
              </h3>
              <p className="text-xs text-red-700 mb-4 leading-relaxed">모든 회의록, 업무, 파이프라인 상태, 팀원 데이터를 초기값으로 리셋합니다. 이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <button
                  onClick={() => { if (window.confirm('정말 초기화하시겠습니까? 되돌릴 수 없습니다.')) resetStore(); }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 전체 데이터 초기화
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
