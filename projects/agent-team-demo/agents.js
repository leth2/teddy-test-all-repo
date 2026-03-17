/**
 * 시뮬레이션 에이전트 — 리더 1명 + 팀원 3명
 * 각 에이전트는 자기 inbox를 주기적으로 확인하고,
 * 메시지/태스크에 반응하는 독립적인 루프로 동작
 */

const AGENT_PROFILES = {
  lead: {
    name: 'lead',
    role: 'Team Lead',
    color: '#E8B931',
    emoji: '🎯',
    description: '방향 설정, 태스크 분배, 결과 종합'
  },
  researcher: {
    name: 'researcher',
    role: 'Researcher',
    color: '#4A9EE0',
    emoji: '🔍',
    description: '코드베이스 분석, 문서 조사'
  },
  developer: {
    name: 'developer',
    role: 'Developer',
    color: '#50C878',
    emoji: '🛠️',
    description: '기능 구현, 버그 수정'
  },
  reviewer: {
    name: 'reviewer',
    role: 'Reviewer',
    color: '#E07C4A',
    emoji: '📝',
    description: '코드 리뷰, 품질 검증'
  }
};

// 시나리오: "할 일 관리 앱 설계하기"
const SCENARIO_STEPS = [
  // Lead가 팀 구성 + 태스크 생성
  { delay: 1000, agent: 'lead', action: 'broadcast', text: '팀 안녕! 오늘 할 일: "할 일 관리 앱" 설계. 태스크 나눠줄게.' },
  { delay: 2000, agent: 'lead', action: 'create_task', task: { id: '1', subject: '기존 Todo 앱 사례 조사', description: '인기 있는 할 일 관리 앱 5개 분석' } },
  { delay: 2500, agent: 'lead', action: 'create_task', task: { id: '2', subject: 'API 스키마 설계', description: 'REST API 엔드포인트 + 데이터 모델', blockedBy: ['1'] } },
  { delay: 3000, agent: 'lead', action: 'create_task', task: { id: '3', subject: '코드 구조 리뷰 기준 작성', description: '리뷰 체크리스트 + 품질 기준' } },
  
  // Lead가 태스크 할당
  { delay: 3500, agent: 'lead', action: 'message', to: 'researcher', text: '태스크 #1 맡아줘. 기존 Todo 앱들 조사해서 핵심 기능 정리해줘.' },
  { delay: 4000, agent: 'lead', action: 'message', to: 'reviewer', text: '태스크 #3 맡아줘. 코드 리뷰 기준 잡아놔.' },

  // Researcher가 태스크 claim + 작업
  { delay: 5000, agent: 'researcher', action: 'claim_task', taskId: '1' },
  { delay: 5500, agent: 'researcher', action: 'message', to: 'lead', text: '태스크 #1 시작합니다. Todoist, TickTick, Things 3, Microsoft To Do, Google Tasks 분석 중...' },
  
  // Reviewer도 태스크 claim
  { delay: 6000, agent: 'reviewer', action: 'claim_task', taskId: '3' },
  { delay: 6500, agent: 'reviewer', action: 'message', to: 'lead', text: '태스크 #3 접수! TypeScript strict mode, 테스트 커버리지 80%+ 기준으로 잡을게요.' },

  // Developer가 대기하면서 리드에게 물어봄
  { delay: 7500, agent: 'developer', action: 'message', to: 'lead', text: '리드, 제 태스크 #2는 태스크 #1 완료 후 시작 가능한데, 그동안 뭐 할까요?' },
  { delay: 8500, agent: 'lead', action: 'message', to: 'developer', text: '좋은 질문! 그동안 프로젝트 boilerplate 준비해둬. Node.js + TypeScript + Express 세팅.' },
  { delay: 9500, agent: 'developer', action: 'message', to: 'lead', text: '접수! boilerplate 세팅 시작합니다. 🛠️' },

  // Researcher 결과 보고
  { delay: 12000, agent: 'researcher', action: 'complete_task', taskId: '1', result: '핵심 기능: CRUD, 우선순위, 마감일, 카테고리, 반복 설정' },
  { delay: 12500, agent: 'researcher', action: 'broadcast', text: '📊 조사 완료!\n• 공통 기능: CRUD, 우선순위(P1~P4), 마감일, 카테고리\n• 차별점: 자연어 입력, AI 분류, 습관 추적\n• 추천 MVP: CRUD + 우선순위 + 마감일' },

  // Lead가 결과 확인 후 Developer에게 알림
  { delay: 14000, agent: 'lead', action: 'message', to: 'developer', text: 'Researcher 조사 끝났어! 태스크 #2 시작해. MVP는 CRUD + 우선순위 + 마감일이야.' },
  
  // Developer가 태스크 #2 claim
  { delay: 15000, agent: 'developer', action: 'claim_task', taskId: '2' },
  { delay: 15500, agent: 'developer', action: 'message', to: 'lead', text: '태스크 #2 시작! API 스키마 설계 중...' },

  // Reviewer 결과 보고
  { delay: 16000, agent: 'reviewer', action: 'complete_task', taskId: '3', result: '리뷰 기준서 완성 (TSLint, 80%+ coverage, RESTful 규칙)' },
  { delay: 16500, agent: 'reviewer', action: 'message', to: 'lead', text: '리뷰 기준 완성했어요!\n✅ TypeScript strict mode\n✅ 테스트 커버리지 80%+\n✅ RESTful 규칙 준수\n✅ 에러 핸들링 미들웨어 필수' },

  // 팀원 간 직접 소통
  { delay: 18000, agent: 'developer', action: 'message', to: 'reviewer', text: 'Reviewer, API에 soft delete 넣으려는데 리뷰 기준에 맞을까?' },
  { delay: 19000, agent: 'reviewer', action: 'message', to: 'developer', text: '좋아요! is_deleted 플래그 + deleted_at 타임스탬프 패턴 추천. 인덱스도 추가해주세요.' },
  
  // Developer 완료
  { delay: 22000, agent: 'developer', action: 'complete_task', taskId: '2', result: 'API 스키마: POST/GET/PUT/DELETE /todos, 우선순위/마감일/카테고리 지원' },
  { delay: 22500, agent: 'developer', action: 'broadcast', text: '🛠️ API 스키마 설계 완료!\nEndpoints: POST/GET/PUT/DELETE /api/todos\nModel: { id, title, priority, dueDate, category, isDone, isDeleted, deletedAt }' },

  // Lead가 종합
  { delay: 24000, agent: 'lead', action: 'broadcast', text: '🎉 전원 태스크 완료! 종합하면:\n\n1. MVP 기능: CRUD + 우선순위 + 마감일\n2. API: RESTful /api/todos\n3. 품질 기준: TS strict, 80%+ coverage\n\n다음 스프린트에서 구현 시작하자. 수고했어!' },

  // Idle 알림
  { delay: 25500, agent: 'researcher', action: 'idle', text: '작업 완료, 유휴 상태' },
  { delay: 26000, agent: 'developer', action: 'idle', text: '작업 완료, 유휴 상태' },
  { delay: 26500, agent: 'reviewer', action: 'idle', text: '작업 완료, 유휴 상태' },
];

export { AGENT_PROFILES, SCENARIO_STEPS };
