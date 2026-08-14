'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, BookmarkPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function AiSidePanel() {
  const { isAiPanelOpen, closeAiPanel, addClip, updateTaskStatus } = useAppStore();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'ai'; content: string; query?: string }[]>([
    { id: 'welcome', role: 'ai', content: '안녕하세요! 업무와 리서치를 도와드리는 AI 비서 헤이짜비입니다. 무엇을 도와드릴까요?' }
  ]);

  if (!isAiPanelOpen) return null;

  const handleSend = () => {
    if (!query.trim() || isLoading) return;
    
    const userMsg = query;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setQuery('');
    setIsLoading(true);

    // 문맥 파악 (Context-Aware)
    let contextStr = '';
    if (pathname.includes('/tasks')) contextStr = '[현재 화면: 칸반 보드] ';
    else if (pathname.includes('/meetings')) contextStr = '[현재 화면: 회의록 분석] ';
    else if (pathname.includes('/research')) contextStr = '[현재 화면: 리서치/스크랩 보관함] ';
    else if (pathname.includes('/dashboard')) contextStr = '[현재 화면: 메인 대시보드] ';

    // 자연어 업무 제어 파싱 (TM-005)
    let isCommand = false;
    let commandReply = '';
    
    // 단순 시뮬레이션을 위해 "완료 처리해" 입력 시 in-progress 상태인 첫 번째 업무를 shipped로 변경
    if (userMsg.includes('완료 처리해') || userMsg.includes('완료해줘')) {
      isCommand = true;
      const tasks = useAppStore.getState().tasks;
      const inProgressTask = tasks.find(t => t.status === 'in-progress');
      if (inProgressTask) {
        updateTaskStatus(inProgressTask.id, 'shipped');
        commandReply = `"${inProgressTask.title}" 업무를 "완료(Shipped)" 상태로 업데이트했습니다.`;
      } else {
        commandReply = '현재 진행 중인 업무가 없습니다.';
      }
    }

    // Mock API Call
    setTimeout(() => {
      if (isCommand) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: commandReply }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: `${contextStr}"${userMsg}"에 대한 리서치 결과입니다.\n\n해당 내용은 추후 컨텍스트 인식과 연동될 예정입니다.`, query: userMsg }]);
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <aside 
      className={cn(
        "flex flex-col bg-white border-l border-gray-200 transition-all duration-300 z-40 shadow-xl",
        isExpanded ? "w-[600px]" : "w-[360px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">AI 비서</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title={isExpanded ? "축소" : "확장"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={closeAiPanel} 
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex group", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div 
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-br-sm" 
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {/* Save/Clip Button for AI Messages */}
              {msg.role === 'ai' && msg.id !== 'welcome' && (
                <button
                  onClick={() => addClip({ query: msg.query || '일반 질문', content: msg.content })}
                  className="absolute -right-8 bottom-0 p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="리서치 결과 클리핑"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>AI가 답변을 작성 중입니다...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            placeholder="궁금한 내용을 물어보세요..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!query.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
           <span className="text-[10px] text-gray-400">💡 Tip: 자연어로 "내일 오전까지 회의록 요약 태스크 생성해줘"와 같이 명령할 수도 있습니다.</span>
        </div>
      </div>
    </aside>
  );
}
