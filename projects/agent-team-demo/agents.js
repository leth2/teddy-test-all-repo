/**
 * 시뮬레이션 에이전트 - 리더 1명 + 팀원 3명
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

/**
 * 시나리오 스텝 구조:
 * - 각 스텝은 LLM 턴을 시뮬레이션
 * - llm_call: 가상 LLM API 호출 (프롬프트 + inbox 메시지 → 응답)
 * - action: LLM 응답에 따른 도구 호출 (메시지 전송, 태스크 생성 등)
 *
 * 실제 Claude Code 동작:
 * 1. 에이전트의 inbox에서 미읽 메시지 수집
 * 2. 메시지를 <teammate-message> XML로 시스템 프롬프트에 주입
 * 3. LLM API 호출 (프롬프트 + inbox 컨텍스트)
 * 4. LLM 응답에서 도구 호출 추출
 * 5. 도구 실행 (SendMessage, TaskCreate 등)
 * 6. 다음 턴 반복
 */
const SCENARIO_STEPS = [
  // ── Turn 1: Lead 시작 ──
  { delay: 1000, agent: 'lead', action: 'llm_call',
    prompt: '사용자가 "할 일 관리 앱을 설계해줘"라고 요청했습니다. 팀을 구성하고 태스크를 분배하세요.',
    inbox_context: '(inbox 비어있음 - 첫 번째 턴)',
    llm_response: '팀 전원에게 브리핑하고 태스크 3개를 생성하겠습니다.\n→ Tool: SendMessage(broadcast), TaskCreate x3' },
  { delay: 400, agent: 'lead', action: 'tool_call', tool: 'SendMessage', desc: 'Broadcasting to all teammates' },
  { delay: 500, agent: 'lead', action: 'broadcast', text: '팀 안녕! 오늘 할 일: "할 일 관리 앱" 설계. 태스크 나눠줄게.' },
  { delay: 200, agent: 'lead', action: 'tool_call', tool: 'TaskCreate', desc: 'Creating task #1' },
  { delay: 300, agent: 'lead', action: 'create_task', task: { id: '1', subject: '기존 Todo 앱 사례 조사', description: '인기 있는 할 일 관리 앱 5개 분석' } },
  { delay: 200, agent: 'lead', action: 'tool_call', tool: 'TaskCreate', desc: 'Creating task #2' },
  { delay: 300, agent: 'lead', action: 'create_task', task: { id: '2', subject: 'API 스키마 설계', description: 'REST API 엔드포인트 + 데이터 모델', blockedBy: ['1'] } },
  { delay: 200, agent: 'lead', action: 'tool_call', tool: 'TaskCreate', desc: 'Creating task #3' },
  { delay: 300, agent: 'lead', action: 'create_task', task: { id: '3', subject: '코드 구조 리뷰 기준 작성', description: '리뷰 체크리스트 + 품질 기준' } },

  // ── Turn 2: Lead 태스크 할당 ──
  { delay: 800, agent: 'lead', action: 'llm_call',
    prompt: '태스크 3개를 생성했습니다. 적절한 팀원에게 할당하세요.',
    inbox_context: '(inbox 비어있음)',
    llm_response: 'Researcher에게 #1, Reviewer에게 #3 할당. Developer는 #2가 #1 의존이라 대기.\n→ Tool: SendMessage x2' },
  { delay: 400, agent: 'lead', action: 'tool_call', tool: 'SendMessage', desc: 'Sending task to researcher' },
  { delay: 300, agent: 'lead', action: 'message', to: 'researcher', text: '태스크 #1 맡아줘. 기존 Todo 앱들 조사해서 핵심 기능 정리해줘.' },
  { delay: 200, agent: 'lead', action: 'tool_call', tool: 'SendMessage', desc: 'Sending task to reviewer' },
  { delay: 300, agent: 'lead', action: 'message', to: 'reviewer', text: '태스크 #3 맡아줘. 코드 리뷰 기준 잡아놔.' },

  // ── Turn 3: Researcher inbox 확인 → claim ──
  { delay: 1000, agent: 'researcher', action: 'llm_call',
    prompt: '(시스템 프롬프트: 당신은 Researcher입니다)',
    inbox_context: '<teammate-message teammate_id="lead" color="#E8B931">\n  팀 안녕! 오늘 할 일: "할 일 관리 앱" 설계.\n</teammate-message>\n<teammate-message teammate_id="lead" color="#E8B931">\n  태스크 #1 맡아줘. 기존 Todo 앱들 조사해서 핵심 기능 정리해줘.\n</teammate-message>',
    llm_response: 'Lead가 태스크 #1을 할당했습니다. Claim하고 작업 시작합니다.\n→ Tool: TaskUpdate(claim #1), SendMessage(lead)' },
  { delay: 300, agent: 'researcher', action: 'tool_call', tool: 'TaskUpdate', desc: 'Claiming task #1' },
  { delay: 400, agent: 'researcher', action: 'claim_task', taskId: '1' },
  { delay: 200, agent: 'researcher', action: 'tool_call', tool: 'WebSearch', desc: 'Searching for "top todo apps 2026"' },
  { delay: 300, agent: 'researcher', action: 'message', to: 'lead', text: '태스크 #1 시작합니다. Todoist, TickTick, Things 3, Microsoft To Do, Google Tasks 분석 중...' },
  
  // ── Turn 4: Reviewer inbox 확인 → claim ──
  { delay: 800, agent: 'reviewer', action: 'llm_call',
    prompt: '(시스템 프롬프트: 당신은 Reviewer입니다)',
    inbox_context: '<teammate-message teammate_id="lead" color="#E8B931">\n  태스크 #3 맡아줘. 코드 리뷰 기준 잡아놔.\n</teammate-message>',
    llm_response: 'Lead가 태스크 #3을 할당했습니다. Claim하고 리뷰 기준 작성합니다.\n→ Tool: TaskUpdate(claim #3), SendMessage(lead)' },
  { delay: 300, agent: 'reviewer', action: 'tool_call', tool: 'TaskUpdate', desc: 'Claiming task #3' },
  { delay: 400, agent: 'reviewer', action: 'claim_task', taskId: '3' },
  { delay: 200, agent: 'reviewer', action: 'tool_call', tool: 'Read', desc: 'Reading existing code standards' },
  { delay: 300, agent: 'reviewer', action: 'message', to: 'lead', text: '태스크 #3 접수! TypeScript strict mode, 테스트 커버리지 80%+ 기준으로 잡을게요.' },

  // ── Turn 5: Developer inbox 확인 → 질문 ──
  { delay: 800, agent: 'developer', action: 'llm_call',
    prompt: '(시스템 프롬프트: 당신은 Developer입니다)',
    inbox_context: '<teammate-message teammate_id="lead" color="#E8B931">\n  팀 안녕! 오늘 할 일: "할 일 관리 앱" 설계.\n</teammate-message>',
    llm_response: '태스크 #2가 #1에 의존합니다. Lead에게 대기 중 할 일을 물어봅니다.\n→ Tool: SendMessage(lead)' },
  { delay: 500, agent: 'developer', action: 'message', to: 'lead', text: '리드, 제 태스크 #2는 태스크 #1 완료 후 시작 가능한데, 그동안 뭐 할까요?' },

  // ── Turn 6: Lead inbox 확인 → Developer에게 지시 ──
  { delay: 800, agent: 'lead', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="researcher" color="#4A9EE0">\n  태스크 #1 시작합니다. Todoist, TickTick... 분석 중...\n</teammate-message>\n<teammate-message teammate_id="reviewer" color="#E07C4A">\n  태스크 #3 접수! TypeScript strict mode...\n</teammate-message>\n<teammate-message teammate_id="developer" color="#50C878">\n  리드, 태스크 #2는 #1 완료 후 시작 가능한데, 그동안 뭐 할까요?\n</teammate-message>',
    llm_response: 'Developer에게 boilerplate 준비를 지시합니다.\n→ Tool: SendMessage(developer)' },
  { delay: 500, agent: 'lead', action: 'message', to: 'developer', text: '좋은 질문! 그동안 프로젝트 boilerplate 준비해둬. Node.js + TypeScript + Express 세팅.' },

  // ── Turn 7: Developer 응답 ──
  { delay: 800, agent: 'developer', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="lead" color="#E8B931">\n  좋은 질문! 그동안 프로젝트 boilerplate 준비해둬.\n</teammate-message>',
    llm_response: 'Boilerplate 세팅을 시작합니다.\n→ Tool: SendMessage(lead)' },
  { delay: 500, agent: 'developer', action: 'message', to: 'lead', text: '접수! boilerplate 세팅 시작합니다. 🛠️' },

  // ── Turn 8: Researcher 완료 보고 ──
  { delay: 1200, agent: 'researcher', action: 'llm_call',
    prompt: '(연구 완료)',
    inbox_context: '(inbox 비어있음 - 작업에 집중 중이었음)',
    llm_response: '조사 완료. 태스크 #1 완료 처리하고 결과를 전체에게 공유합니다.\n→ Tool: TaskUpdate(complete #1), SendMessage(broadcast)' },
  { delay: 300, agent: 'researcher', action: 'tool_call', tool: 'WebSearch', desc: 'Searching for "Todoist features API"' },
  { delay: 300, agent: 'researcher', action: 'tool_call', tool: 'WebSearch', desc: 'Searching for "TickTick vs Things 3 comparison"' },
  { delay: 300, agent: 'researcher', action: 'tool_call', tool: 'TaskUpdate', desc: 'Completing task #1' },
  { delay: 400, agent: 'researcher', action: 'complete_task', taskId: '1', result: '핵심 기능: CRUD, 우선순위, 마감일, 카테고리, 반복 설정' },
  { delay: 200, agent: 'researcher', action: 'tool_call', tool: 'SendMessage', desc: 'Broadcasting results to team' },
  { delay: 300, agent: 'researcher', action: 'broadcast', text: '📊 조사 완료!\n• 공통 기능: CRUD, 우선순위(P1~P4), 마감일, 카테고리\n• 차별점: 자연어 입력, AI 분류, 습관 추적\n• 추천 MVP: CRUD + 우선순위 + 마감일' },

  // ── Turn 9: Lead → Developer에게 시작 지시 ──
  { delay: 1000, agent: 'lead', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="researcher" color="#4A9EE0">\n  📊 조사 완료! 공통 기능: CRUD, 우선순위...\n</teammate-message>\n<teammate-message teammate_id="developer" color="#50C878">\n  접수! boilerplate 세팅 시작합니다.\n</teammate-message>',
    llm_response: 'Researcher 조사 완료! Developer에게 태스크 #2 시작을 알립니다.\n→ Tool: SendMessage(developer)' },
  { delay: 500, agent: 'lead', action: 'message', to: 'developer', text: 'Researcher 조사 끝났어! 태스크 #2 시작해. MVP는 CRUD + 우선순위 + 마감일이야.' },

  // ── Turn 10: Developer 태스크 #2 시작 ──
  { delay: 800, agent: 'developer', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="lead" color="#E8B931">\n  Researcher 조사 끝났어! 태스크 #2 시작해.\n</teammate-message>\n<teammate-message teammate_id="researcher" color="#4A9EE0">\n  📊 조사 완료! MVP: CRUD + 우선순위 + 마감일\n</teammate-message>',
    llm_response: '태스크 #2 claim하고 API 설계를 시작합니다.\n→ Tool: TaskUpdate(claim #2), SendMessage(lead)' },
  { delay: 300, agent: 'developer', action: 'tool_call', tool: 'TaskUpdate', desc: 'Claiming task #2' },
  { delay: 400, agent: 'developer', action: 'claim_task', taskId: '2' },
  { delay: 200, agent: 'developer', action: 'tool_call', tool: 'Read', desc: 'Reading researcher findings' },
  { delay: 300, agent: 'developer', action: 'message', to: 'lead', text: '태스크 #2 시작! API 스키마 설계 중...' },

  // ── Turn 11: Reviewer 완료 ──
  { delay: 800, agent: 'reviewer', action: 'llm_call',
    prompt: '(리뷰 기준 작성 완료)',
    inbox_context: '<teammate-message teammate_id="researcher" color="#4A9EE0">\n  📊 조사 완료!\n</teammate-message>',
    llm_response: '리뷰 기준 완성. 태스크 #3 완료 처리합니다.\n→ Tool: TaskUpdate(complete #3), SendMessage(lead)' },
  { delay: 300, agent: 'reviewer', action: 'tool_call', tool: 'Write', desc: 'Writing review-standards.md' },
  { delay: 300, agent: 'reviewer', action: 'tool_call', tool: 'TaskUpdate', desc: 'Completing task #3' },
  { delay: 400, agent: 'reviewer', action: 'complete_task', taskId: '3', result: '리뷰 기준서 완성 (TSLint, 80%+ coverage, RESTful 규칙)' },
  { delay: 200, agent: 'reviewer', action: 'tool_call', tool: 'SendMessage', desc: 'Reporting to lead' },
  { delay: 300, agent: 'reviewer', action: 'message', to: 'lead', text: '리뷰 기준 완성했어요!\n✅ TypeScript strict mode\n✅ 테스트 커버리지 80%+\n✅ RESTful 규칙 준수\n✅ 에러 핸들링 미들웨어 필수' },

  // ── Turn 12: Developer ↔ Reviewer 직접 통신 ──
  { delay: 1000, agent: 'developer', action: 'llm_call',
    prompt: '(API 설계 중 질문 발생)',
    inbox_context: '<teammate-message teammate_id="reviewer" color="#E07C4A">\n  리뷰 기준 완성! TS strict, 80%+ coverage...\n</teammate-message>',
    llm_response: 'soft delete 패턴에 대해 Reviewer에게 직접 확인합니다.\n→ Tool: SendMessage(reviewer)' },
  { delay: 500, agent: 'developer', action: 'message', to: 'reviewer', text: 'Reviewer, API에 soft delete 넣으려는데 리뷰 기준에 맞을까?' },

  // ── Turn 13: Reviewer 응답 ──
  { delay: 800, agent: 'reviewer', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="developer" color="#50C878">\n  Reviewer, API에 soft delete 넣으려는데 리뷰 기준에 맞을까?\n</teammate-message>',
    llm_response: 'soft delete는 좋은 패턴입니다. 구체적인 구현 방법을 추천합니다.\n→ Tool: SendMessage(developer)' },
  { delay: 500, agent: 'reviewer', action: 'message', to: 'developer', text: '좋아요! is_deleted 플래그 + deleted_at 타임스탬프 패턴 추천. 인덱스도 추가해주세요.' },

  // ── Turn 14: Developer 완료 ──
  { delay: 1200, agent: 'developer', action: 'llm_call',
    prompt: '(API 설계 완료)',
    inbox_context: '<teammate-message teammate_id="reviewer" color="#E07C4A">\n  좋아요! is_deleted + deleted_at 패턴 추천.\n</teammate-message>',
    llm_response: 'API 스키마 설계 완료. 태스크 #2 완료 처리하고 결과를 공유합니다.\n→ Tool: TaskUpdate(complete #2), SendMessage(broadcast)' },
  { delay: 300, agent: 'developer', action: 'tool_call', tool: 'Write', desc: 'Writing api-schema.ts' },
  { delay: 300, agent: 'developer', action: 'tool_call', tool: 'Write', desc: 'Writing todo.model.ts' },
  { delay: 200, agent: 'developer', action: 'tool_call', tool: 'TaskUpdate', desc: 'Completing task #2' },
  { delay: 400, agent: 'developer', action: 'complete_task', taskId: '2', result: 'API 스키마: POST/GET/PUT/DELETE /todos, 우선순위/마감일/카테고리 지원' },
  { delay: 200, agent: 'developer', action: 'tool_call', tool: 'SendMessage', desc: 'Broadcasting results' },
  { delay: 300, agent: 'developer', action: 'broadcast', text: '🛠️ API 스키마 설계 완료!\nEndpoints: POST/GET/PUT/DELETE /api/todos\nModel: { id, title, priority, dueDate, category, isDone, isDeleted, deletedAt }' },

  // ── Turn 15: Lead 종합 ──
  { delay: 1000, agent: 'lead', action: 'llm_call',
    prompt: '(다음 턴)',
    inbox_context: '<teammate-message teammate_id="developer" color="#50C878">\n  🛠️ API 스키마 설계 완료! Endpoints: POST/GET/PUT/DELETE...\n</teammate-message>\n<teammate-message teammate_id="reviewer" color="#E07C4A">\n  리뷰 기준 완성!\n</teammate-message>',
    llm_response: '모든 태스크 완료! 결과를 종합하여 전체에게 공유합니다.\n→ Tool: SendMessage(broadcast)' },
  { delay: 500, agent: 'lead', action: 'broadcast', text: '🎉 전원 태스크 완료! 종합하면:\n\n1. MVP 기능: CRUD + 우선순위 + 마감일\n2. API: RESTful /api/todos\n3. 품질 기준: TS strict, 80%+ coverage\n\n다음 스프린트에서 구현 시작하자. 수고했어!' },

  // ── Idle 알림 ──
  { delay: 800, agent: 'researcher', action: 'idle', text: '작업 완료, 유휴 상태' },
  { delay: 300, agent: 'developer', action: 'idle', text: '작업 완료, 유휴 상태' },
  { delay: 300, agent: 'reviewer', action: 'idle', text: '작업 완료, 유휴 상태' },
];

export { AGENT_PROFILES, SCENARIO_STEPS };
