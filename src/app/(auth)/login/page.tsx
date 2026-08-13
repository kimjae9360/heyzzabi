'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle, ShieldCheck, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState<'admin' | 'member' | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error === 'Invalid credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : data.error || '로그인에 실패했습니다.');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'member') => {
    setQuickLoadingRole(role);
    setError('');
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '접속에 실패했습니다.');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '접속에 실패했습니다.');
      setQuickLoadingRole(null);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-blue-600 text-white rounded-xl px-3 py-2 text-lg font-black tracking-normal shadow-sm mb-3">Zz</div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">헤이 짜비</h1>
        <p className="text-xs text-gray-400 mt-1">AI 기반 통합 업무 관리 플랫폼</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 font-medium mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!showEmailForm ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin('admin')}
              disabled={quickLoadingRole !== null}
              className="flex flex-col items-center gap-2 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-colors disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900">{quickLoadingRole === 'admin' ? '접속 중...' : '관리자로 접속'}</span>
              <span className="text-[9px] text-gray-400">아이디/비밀번호 불필요</span>
            </button>
            <button
              onClick={() => handleQuickLogin('member')}
              disabled={quickLoadingRole !== null}
              className="flex flex-col items-center gap-2 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-colors disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900">{quickLoadingRole === 'member' ? '접속 중...' : '일반 사원으로 접속'}</span>
              <span className="text-[9px] text-gray-400">아이디/비밀번호 불필요</span>
            </button>
          </div>

          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full mt-4 text-center text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            이메일로 로그인
          </button>
        </>
      ) : (
        <>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">이메일</label>
              <input
                type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all"
                placeholder="choi.pm@heyzzabi.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">비밀번호</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isLoading ? '로그인 중...' : '로그인'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            계정이 없으신가요? <Link href="/signup" className="text-blue-600 font-bold hover:underline">회원가입</Link>
          </p>
          <button
            onClick={() => setShowEmailForm(false)}
            className="w-full mt-3 text-center text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← 빠른 접속으로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}
