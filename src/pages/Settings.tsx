import { useState } from 'react';
import { UserPlus, Users, Settings as SettingsIcon, Save, Trash2, Shield, AlertTriangle, Lock, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

type Tab = 'employees' | 'permissions' | 'system';

const ROLE_PERMISSIONS = [
  { role: '전직원 (Member)', desc: '기본 열람 및 검색', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색'], color: 'gray' },
  { role: '팀장 (Lead)', desc: '문서 수정 및 배분 승인', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색', '배분 승인/반려', '문서 수정', '개인 업무 완료 처리'], color: 'blue' },
  { role: 'PM (Admin)', desc: '전체 관리자 권한', permissions: ['회의록 읽기', '업무 현황 조회', '자연어 검색', '배분 승인/반려', '문서 수정', '기획서 생성/반려', '파이프라인 전체 제어', '직원 등록/삭제', '데이터 초기화'], color: 'indigo' },
];

export default function Settings() {
  const { employees = [], addEmployee, removeEmployee, resetStore } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('employees');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [certsStr, setCertsStr] = useState('');
  const [projectsStr, setProjectsStr] = useState('');
  const [level, setLevel] = useState<'member' | 'lead' | 'pm'>('member');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !department || !role) return;
    addEmployee({
      name, department, role, level,
      skills: skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      certifications: certsStr.split(',').map(s => s.trim()).filter(Boolean),
      pastProjects: projectsStr.split(',').map(s => s.trim()).filter(Boolean),
    });
    setName(''); setDepartment(''); setRole(''); setSkillsStr(''); setCertsStr(''); setProjectsStr(''); setLevel('member');
  };

  const handleRemove = (id: string) => {
    if (confirmDeleteId === id) {
      removeEmployee(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'employees', label: '팀원 관리' },
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
        <p className="text-gray-500 text-xs mt-0.5">팀원 데이터 등록, 권한 구조 확인, 시스템 환경 설정을 관리합니다.</p>
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

        {/* Tab: 팀원 관리 */}
        {activeTab === 'employees' && (
          <div className="max-w-6xl mx-auto flex gap-6">
            {/* Form */}
            <div className="w-72 shrink-0">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4 text-blue-600" /> 새 팀원 등록
                </h3>
                <form onSubmit={handleAddEmployee} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">이름 *</label>
                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" placeholder="홍길동" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">부서 *</label>
                      <input required value={department} onChange={e => setDepartment(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" placeholder="개발팀" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">직무 *</label>
                      <input required value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" placeholder="Frontend" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">권한 레벨</label>
                    <select value={level} onChange={e => setLevel(e.target.value as 'member' | 'lead' | 'pm')} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                      <option value="member">전직원 (Member)</option>
                      <option value="lead">팀장 (Lead)</option>
                      <option value="pm">PM (Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">보유 스킬 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                    <input value={skillsStr} onChange={e => setSkillsStr(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="React, TypeScript" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">자격증 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                    <input value={certsStr} onChange={e => setCertsStr(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="정보처리기사" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">주요 프로젝트 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                    <textarea value={projectsStr} onChange={e => setProjectsStr(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none bg-gray-50 focus:bg-white" placeholder="API 서버 구축" />
                  </div>
                  <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <Save className="w-3.5 h-3.5" /> 등록
                  </button>
                </form>
              </div>
            </div>

            {/* Employee List */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-900 text-sm">등록된 팀원</span>
                <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full">{employees.length}명</span>
              </div>
              {employees.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">팀원을 등록하세요.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-base shrink-0">{emp.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{emp.name}</span>
                          <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{emp.department}</span>
                          <span className="text-[9px] text-gray-400 font-medium">{emp.role}</span>
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded",
                            emp.level === 'pm' ? "bg-indigo-100 text-indigo-700" :
                            emp.level === 'lead' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {emp.level === 'pm' ? 'PM' : emp.level === 'lead' ? 'Lead' : 'Member'}
                          </span>
                        </div>
                        {emp.skills && emp.skills.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {emp.skills.slice(0, 4).map((s, i) => (
                              <span key={i} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">{s}</span>
                            ))}
                            {emp.skills.length > 4 && <span className="text-[9px] text-gray-400">+{emp.skills.length - 4}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <div className="text-[9px] font-bold text-gray-400 mb-1">워크로드</div>
                        <div className={cn("text-sm font-black",
                          emp.currentWorkload > 80 ? 'text-red-600' : emp.currentWorkload > 60 ? 'text-amber-600' : 'text-emerald-600'
                        )}>{emp.currentWorkload}%</div>
                      </div>
                      <button
                        onClick={() => handleRemove(emp.id)}
                        className={cn("p-2 rounded-lg transition-all text-xs font-bold",
                          confirmDeleteId === emp.id
                            ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                            : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                        )}
                        title={confirmDeleteId === emp.id ? '한 번 더 클릭하면 삭제됩니다' : '삭제'}
                      >
                        {confirmDeleteId === emp.id ? '확인?' : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: 권한 구조 */}
        {activeTab === 'permissions' && (
          <div className="max-w-4xl mx-auto space-y-4">
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
