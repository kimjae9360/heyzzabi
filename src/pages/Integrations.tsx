import { useState } from 'react';
import { Link2, GitPullRequest as GithubIcon, MessageSquare, Kanban, Calendar, CheckCircle2, AlertCircle, Settings, ArrowRight, Zap, Code2, Database, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';

type IntegrationStatus = 'connected' | 'disconnected' | 'pending';

interface Integration {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  status: IntegrationStatus;
  color: string;
  features: string[];
  category: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    desc: 'PR 생성, 브랜치 상태, 코드 리뷰를 파이프라인 업무와 자동 연동합니다.',
    icon: GithubIcon,
    status: 'disconnected',
    color: 'gray',
    features: ['PR 자동 연동', '브랜치 → 업무 매핑', '코드 리뷰 알림'],
    category: '개발',
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: '배분 승인, 지연 감지, 완료 알림을 지정 채널에 실시간으로 전송합니다.',
    icon: MessageSquare,
    status: 'pending',
    color: 'purple',
    features: ['결재 알림 자동 전송', '지연 감지 → 채널 알림', '/heyzzabi 명령어 지원'],
    category: '커뮤니케이션',
  },
  {
    id: 'jira',
    name: 'Jira',
    desc: 'Hey Zzabi 파이프라인 Task를 Jira 이슈로 양방향 동기화합니다.',
    icon: Kanban,
    status: 'disconnected',
    color: 'blue',
    features: ['이슈 양방향 동기화', '스프린트 자동 매핑', '상태 변경 동기화'],
    category: '프로젝트 관리',
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    desc: '회의 일정에서 자동으로 회의록을 생성하고 Action Item을 캘린더에 등록합니다.',
    icon: Calendar,
    status: 'disconnected',
    color: 'green',
    features: ['회의 → 회의록 자동 생성', 'Action Item 캘린더 등록', '마감일 동기화'],
    category: '생산성',
  },
];

const COLUMNIAGE_QUERIES = [
  { q: 'user_id 컬럼이 변경되면 어떤 API가 영향받아?', a: '영향 범위: /api/auth/me, /api/users/:id, /api/payments/history (3개 엔드포인트) — 모두 user_id를 외래키로 참조하는 테이블과 연결됨.' },
  { q: '결제 테이블 스키마 바뀌면 프론트 어디 수정해?', a: '영향 파일: PaymentCard.tsx, CheckoutForm.tsx, usePaymentStore.ts (3개) — amount, currency 필드를 직접 참조 중.' },
  { q: '지금 가장 많은 코드가 의존하는 테이블은?', a: 'users 테이블: 총 18개 파일, 34개 쿼리가 참조 중. 변경 시 risk level: Critical.' },
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [columniageQuery, setColumniageQuery] = useState('');
  const [columniageResult, setColumniageResult] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('전체');

  const categories = ['전체', ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];

  const filtered = activeCategory === '전체' ? integrations : integrations.filter(i => i.category === activeCategory);

  const handleConnect = (id: string) => {
    setIntegrations(prev => prev.map(i =>
      i.id === id ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'pending' } : i
    ));
    if (integrations.find(i => i.id === id)?.status === 'pending') {
      setTimeout(() => {
        setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'connected' } : i));
      }, 2000);
    }
  };

  const handleColumniageQuery = (q?: string) => {
    const query = q || columniageQuery;
    if (!query.trim()) return;
    setColumniageQuery(query);
    setIsQuerying(true);
    setColumniageResult('');
    setTimeout(() => {
      const found = COLUMNIAGE_QUERIES.find(item => query.includes(item.q.slice(0, 8)));
      setColumniageResult(found?.a || `Neo4j 그래프 분석 완료. "${query}" — 관련 테이블 3개, 영향 받는 코드 파일 7개가 감지되었습니다. 세부 결과는 아래 그래프 뷰에서 확인하세요.`);
      setIsQuerying(false);
    }, 1600);
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="text-blue-600 w-5 h-5" /> 외부 툴 연동 (Integrations)
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">GitHub, Slack, Jira 등 외부 서비스와 양방향 동기화합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border",
              connectedCount > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-gray-500 bg-gray-100 border-gray-200"
            )}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {connectedCount}/{integrations.length} 연동됨
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-4">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeCategory === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Integration Cards */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(integration => (
            <div key={integration.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border",
                      integration.color === 'gray' ? "bg-gray-100 border-gray-200" :
                      integration.color === 'purple' ? "bg-purple-100 border-purple-200" :
                      integration.color === 'blue' ? "bg-blue-100 border-blue-200" : "bg-green-100 border-green-200"
                    )}>
                      <integration.icon className={cn("w-6 h-6",
                        integration.color === 'gray' ? "text-gray-800" :
                        integration.color === 'purple' ? "text-purple-700" :
                        integration.color === 'blue' ? "text-blue-700" : "text-green-700"
                      )} />
                    </div>
                    <div>
                      <div className="font-black text-gray-900">{integration.name}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{integration.category}</div>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full",
                    integration.status === 'connected' ? "bg-emerald-100 text-emerald-700" :
                    integration.status === 'pending' ? "bg-amber-100 text-amber-700 animate-pulse" :
                    "bg-gray-100 text-gray-500"
                  )}>
                    {integration.status === 'connected' ? <><CheckCircle2 className="w-3 h-3" /> 연동됨</> :
                     integration.status === 'pending' ? <><Zap className="w-3 h-3" /> 연동 중...</> :
                     <><AlertCircle className="w-3 h-3" /> 미연동</>}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{integration.desc}</p>

                <div className="space-y-1.5 mb-4">
                  {integration.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className={cn("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                      integration.status === 'connected'
                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        : integration.status === 'pending'
                        ? "bg-amber-50 text-amber-600 cursor-wait border border-amber-200"
                        : "bg-gray-900 text-white hover:bg-black shadow-sm"
                    )}
                  >
                    {integration.status === 'connected' ? '연동 해제' : integration.status === 'pending' ? '연동 진행 중...' : <><ArrowRight className="w-3.5 h-3.5" /> OAuth 연동</>}
                  </button>
                  {integration.status === 'connected' && (
                    <button className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {integration.status === 'connected' && (
                <div className="bg-emerald-50 border-t border-emerald-100 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  실시간 동기화 중 · 마지막 동기화: 방금 전
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 컬럼니지 Premium Feature */}
        <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl overflow-hidden shadow-xl border border-gray-700">
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Database className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-black text-white flex items-center gap-2">
                      코드 영향 분석 (컬럼니지)
                      <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">PREMIUM</span>
                    </div>
                    <div className="text-[10px] text-indigo-300 font-bold">Neo4j Graph Database · LLM Reasoning</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
                  데이터베이스 스키마와 코드베이스를 Neo4j 그래프로 연결하여, "이 컬럼이 바뀌면 어떤 코드가 영향받는가"를 자연어로 질의합니다.
                  Jira·ClickUp·Asana 어디에도 없는 개발팀 특화 기능입니다.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30">
                  <Code2 className="w-3 h-3" /> Beta
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: GitBranch, label: '컬럼 → 코드 의존성', desc: '변경 영향 파일 즉시 파악' },
                { icon: Database, label: '스키마 변경 리스크', desc: 'Critical / Medium / Low 분류' },
                { icon: Code2, label: '자연어 그래프 질의', desc: '코드 지식 없이도 질의 가능' },
              ].map((f, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <f.icon className="w-4 h-4 text-indigo-400 mb-2" />
                  <div className="text-xs font-bold text-white mb-0.5">{f.label}</div>
                  <div className="text-[10px] text-gray-400">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Query Interface */}
            <div className="bg-black/30 rounded-xl border border-white/10 p-4">
              <div className="text-[10px] font-bold text-indigo-400 mb-3 flex items-center gap-1.5">
                <Database className="w-3 h-3" /> COLUMNIAGE QUERY INTERFACE
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap gap-2 mb-3">
                {COLUMNIAGE_QUERIES.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleColumniageQuery(item.q)}
                    className="text-[10px] text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    {item.q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={columniageQuery}
                  onChange={e => setColumniageQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleColumniageQuery()}
                  placeholder="예: user_id 컬럼 변경 시 영향 받는 파일은?"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  onClick={() => handleColumniageQuery()}
                  disabled={isQuerying}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
                >
                  {isQuerying ? '분석 중...' : '질의'}
                </button>
              </div>

              {columniageResult && (
                <div className="mt-3 bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> GRAPH ANALYSIS RESULT
                  </div>
                  <p className="text-sm text-emerald-100 leading-relaxed">{columniageResult}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
