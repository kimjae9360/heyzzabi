'use client';

import { useState, useMemo } from 'react';
import { UserPlus, Users, Search, Trash2, Pencil, X, Save, Mail, Phone, BadgeCheck, ShieldAlert, CircleSlash, Moon } from 'lucide-react';
import { useAppStore, type Employee, type EmployeeStatus } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { DEPARTMENTS, POSITIONS, JOB_TITLES, EMAIL_DOMAIN, splitEmail } from '@/lib/employeeOptions';

type FilterStatus = 'all' | EmployeeStatus;

const STATUS_META: Record<EmployeeStatus, { label: string; color: string; icon: typeof BadgeCheck }> = {
  ACTIVE: { label: '활성', color: 'emerald', icon: BadgeCheck },
  LEAVE: { label: '휴직', color: 'amber', icon: Moon },
  RESIGNED: { label: '퇴사', color: 'gray', icon: CircleSlash },
  LOCKED: { label: '잠금', color: 'red', icon: ShieldAlert },
};

interface FormState {
  name: string;
  emailLocal: string;
  phone: string;
  department: string;
  position: string;
  role: string;
  level: Employee['level'];
  status: EmployeeStatus;
  hireDate: string;
  skillsStr: string;
  certsStr: string;
  projectsStr: string;
}

const EMPTY_FORM: FormState = {
  name: '', emailLocal: '', phone: '', department: '', position: '', role: '',
  level: 'member', status: 'ACTIVE', hireDate: '', skillsStr: '', certsStr: '', projectsStr: '',
};

export default function Employees() {
  const { employees = [], addEmployee, updateEmployee, removeEmployee } = useAppStore();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const filtered = useMemo(() => {
    let result = employees;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employeeNo.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }
    return result;
  }, [employees, query, filterStatus]);

  const statusCounts = {
    all: employees.length,
    ACTIVE: employees.filter(e => e.status === 'ACTIVE').length,
    LEAVE: employees.filter(e => e.status === 'LEAVE').length,
    RESIGNED: employees.filter(e => e.status === 'RESIGNED').length,
    LOCKED: employees.filter(e => e.status === 'LOCKED').length,
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      emailLocal: splitEmail(emp.email).local,
      phone: emp.phone || '',
      department: emp.department,
      position: emp.position,
      role: emp.role,
      level: emp.level,
      status: emp.status,
      hireDate: emp.hireDate || '',
      skillsStr: (emp.skills || []).join(', '),
      certsStr: (emp.certifications || []).join(', '),
      projectsStr: (emp.pastProjects || []).join(', '),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.emailLocal || !form.department || !form.position || !form.role) return;

    const payload = {
      name: form.name,
      email: `${form.emailLocal}@${EMAIL_DOMAIN}`,
      phone: form.phone || undefined,
      department: form.department,
      position: form.position,
      role: form.role,
      level: form.level,
      status: form.status,
      hireDate: form.hireDate || undefined,
      skills: form.skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      certifications: form.certsStr.split(',').map(s => s.trim()).filter(Boolean),
      pastProjects: form.projectsStr.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (editingId) {
      updateEmployee(editingId, payload);
    } else {
      addEmployee(payload);
    }
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(`${name}님을 직원 목록에서 삭제하시겠습니까?`)) {
      removeEmployee(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-blue-600" /> {editingId ? '직원 정보 수정' : '새 직원 등록'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">이름 *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="홍길동" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">회사 이메일 *</label>
                  <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-gray-50 focus-within:bg-white">
                    <input required type="text" value={form.emailLocal} onChange={e => setForm(f => ({ ...f, emailLocal: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') }))}
                      className="flex-1 min-w-0 p-2.5 text-sm outline-none bg-transparent" placeholder="hong" />
                    <span className="flex items-center px-2.5 text-sm text-gray-400 bg-gray-100 border-l border-gray-300 shrink-0">@{EMAIL_DOMAIN}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">연락처</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">입사일</label>
                  <input type="date" value={form.hireDate} onChange={e => setForm(f => ({ ...f, hireDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">부서 *</label>
                  <select required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                    <option value="" disabled>선택</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">직급 *</label>
                  <select required value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                    <option value="" disabled>선택</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">직무 *</label>
                  <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                    <option value="" disabled>선택</option>
                    {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">시스템 권한</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as Employee['level'] }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                    <option value="member">직원 (Member)</option>
                    <option value="lead">팀장 (Lead)</option>
                    <option value="pm">관리자 (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">계정 상태</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmployeeStatus }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white">
                    {(Object.keys(STATUS_META) as EmployeeStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">기술 스택 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                <input value={form.skillsStr} onChange={e => setForm(f => ({ ...f, skillsStr: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="React, TypeScript" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">자격증 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                <input value={form.certsStr} onChange={e => setForm(f => ({ ...f, certsStr: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="정보처리기사" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">주요 프로젝트 <span className="font-normal text-gray-400">(쉼표 구분)</span></label>
                <textarea value={form.projectsStr} onChange={e => setForm(f => ({ ...f, projectsStr: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-16 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="API 서버 구축" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  <Save className="w-3.5 h-3.5" /> {editingId ? '수정 저장' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600 w-6 h-6" />
              직원관리 (Employee Management)
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">사원 정보, 부서, 직급, 권한, 계정 상태 및 기술 스택을 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="이름, 이메일, 부서, 사번 검색..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all"
              />
            </div>
            <button onClick={openAddModal} className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0">
              <UserPlus className="w-4 h-4" /> 새 직원 등록
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          {([
            { key: 'all', label: '전체' },
            { key: 'ACTIVE', label: '활성' },
            { key: 'LEAVE', label: '휴직' },
            { key: 'RESIGNED', label: '퇴사' },
            { key: 'LOCKED', label: '잠금' },
          ] as { key: FilterStatus; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                filterStatus === tab.key ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-black",
                filterStatus === tab.key ? "bg-white/20 text-white" : "bg-white text-gray-700"
              )}>
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1 text-center">상태</div>
            <div className="col-span-3">직원</div>
            <div className="col-span-2">부서 / 직급</div>
            <div className="col-span-1 text-center">권한</div>
            <div className="col-span-2">사번 / 입사일</div>
            <div className="col-span-2">기술 스택</div>
            <div className="col-span-1 text-center">관리</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">
                  {employees.length === 0 ? '등록된 직원이 없습니다.' : `"${query || filterStatus}"에 해당하는 직원이 없습니다.`}
                </p>
              </div>
            ) : (
              filtered.map(emp => {
                const meta = STATUS_META[emp.status];
                const StatusIcon = meta.icon;
                return (
                  <div key={emp.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-gray-50 transition-colors">
                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <span className={cn(
                        "px-2 py-1 text-[9px] font-black rounded-md flex items-center gap-1 whitespace-nowrap border",
                        meta.color === 'emerald' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        meta.color === 'amber' ? "bg-amber-100 text-amber-700 border-amber-200" :
                        meta.color === 'red' ? "bg-red-100 text-red-700 border-red-200" :
                        "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        <StatusIcon className="w-2.5 h-2.5" /> {meta.label}
                      </span>
                    </div>

                    {/* Employee */}
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">{emp.avatar}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          {emp.name}
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded",
                            emp.level === 'pm' ? "bg-indigo-100 text-indigo-700" :
                            emp.level === 'lead' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {emp.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span title={emp.email} className="flex items-center gap-0.5 truncate"><Mail className="w-2.5 h-2.5 shrink-0" />{emp.email}</span>
                          {emp.phone && <span className="flex items-center gap-0.5 shrink-0"><Phone className="w-2.5 h-2.5" />{emp.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Dept / Position */}
                    <div className="col-span-2 text-xs">
                      <div className="font-bold text-gray-700">{emp.department}</div>
                      <div className="text-gray-400">{emp.position}</div>
                    </div>

                    {/* Level */}
                    <div className="col-span-1 flex justify-center">
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded",
                        emp.level === 'pm' ? "bg-indigo-100 text-indigo-700" :
                        emp.level === 'lead' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {emp.level === 'pm' ? '관리자' : emp.level === 'lead' ? '팀장' : '직원'}
                      </span>
                    </div>

                    {/* Employee No / Hire Date */}
                    <div className="col-span-2 text-[10px] text-gray-500">
                      <div className="font-bold text-gray-700">{emp.employeeNo}</div>
                      <div>입사: {emp.hireDate || '-'}</div>
                    </div>

                    {/* Skills */}
                    <div className="col-span-2 flex gap-1 flex-wrap">
                      {(emp.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">{s}</span>
                      ))}
                      {(emp.skills || []).length > 3 && <span className="text-[9px] text-gray-400">+{(emp.skills || []).length - 3}</span>}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-center gap-1">
                      <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all" title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(emp.id, emp.name)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 text-xs text-gray-400 text-center">
            총 {filtered.length}명 / 전체 {employees.length}명 표시 중
          </div>
        )}
      </div>
    </div>
  );
}