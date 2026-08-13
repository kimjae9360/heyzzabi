'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', position: '', jobTitle: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-blue-600 text-white rounded-xl px-3 py-2 text-lg font-black tracking-normal shadow-sm mb-3">Zz</div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">헤이 짜비 회원가입</h1>
        <p className="text-xs text-gray-400 mt-1">가입 즉시 시스템 권한은 '직원'으로 시작합니다.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-gray-600 mb-1">이름 *</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="홍길동" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-600 mb-1">회사 이메일 *</label>
          <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="hong@heyzzabi.com" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-600 mb-1">비밀번호 * <span className="font-normal text-gray-400">(8자 이상)</span></label>
          <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="••••••••" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">부서 *</label>
            <input required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="개발팀" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">직급 *</label>
            <input required value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="사원" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-600 mb-1">직무</label>
          <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white" placeholder="Frontend" />
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
        >
          {isLoading ? '가입 처리 중...' : '가입하기'}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        이미 계정이 있으신가요? <Link href="/login" className="text-blue-600 font-bold hover:underline">로그인</Link>
      </p>
    </div>
  );
}
