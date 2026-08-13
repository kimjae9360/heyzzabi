'use client';

import { Network, Construction } from 'lucide-react';

export default function KnowledgeBase() {
  return (
    <div className="h-full flex flex-col bg-[#f4f5f7]">
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">사내 지식망 (Knowledge Graph)</h1>
            <p className="text-xs text-gray-500">회의록·기획서·업무를 시맨틱하게 연결한 지식 지도입니다.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Construction className="w-14 h-14 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">준비 중인 기능입니다</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            문서 인덱싱과 시맨틱 검색을 결합한 실제 지식그래프는 아직 구현되지 않았습니다.
            실제 데이터 없이 가짜 그래프를 보여드리는 대신, 준비가 되면 이 자리에서 정식으로 연결하겠습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
