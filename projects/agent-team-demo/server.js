import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { MailboxSystem } from './mailbox.js';
import { AGENT_PROFILES, SCENARIO_STEPS } from './agents.js';
import { promises as fs } from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;

// Claude Code 스타일 디렉토리 구조 생성
const TEAM_NAME = 'todo-app-design';
const BASE_DIR = path.join(os.tmpdir(), `.claude-demo/teams/${TEAM_NAME}`);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const mailbox = new MailboxSystem(BASE_DIR);
let scenarioRunning = false;
let scenarioTimeout = null;
let stepMode = false;
let currentStepIndex = -1;
let stepResolve = null;

// WebSocket — 실시간 이벤트 푸시
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// Mailbox 이벤트 → WebSocket
mailbox.onEvent((type, data) => {
  broadcast(type, data);
});

// API 라우트
app.get('/api/snapshot', async (req, res) => {
  const snapshot = await mailbox.getFileSystemSnapshot();
  res.json(snapshot);
});

app.get('/api/agents', (req, res) => {
  res.json(AGENT_PROFILES);
});

app.get('/api/filesystem', async (req, res) => {
  // 파일 시스템 트리 반환
  const tree = await buildFileTree(BASE_DIR);
  res.json(tree);
});

async function initTeam() {
  await fs.rm(BASE_DIR, { recursive: true, force: true });
  const teamConfig = {
    teamName: TEAM_NAME,
    members: Object.values(AGENT_PROFILES).map(a => ({
      name: a.name,
      role: a.role,
      color: a.color,
      agentType: a.name === 'lead' ? 'lead' : 'teammate'
    }))
  };
  await mailbox.init(teamConfig);
  broadcast('init', { teamConfig, baseDir: BASE_DIR });
  return teamConfig;
}

// 자동 재생 모드
app.post('/api/scenario/start', async (req, res) => {
  if (scenarioRunning) return res.status(400).json({ error: 'Scenario already running' });
  stepMode = false;
  currentStepIndex = -1;
  await initTeam();
  scenarioRunning = true;
  runScenario();
  res.json({ status: 'started', mode: 'auto' });
});

// 스텝 모드 시작
app.post('/api/scenario/step-start', async (req, res) => {
  if (scenarioRunning) return res.status(400).json({ error: 'Scenario already running' });
  stepMode = true;
  currentStepIndex = -1;
  await initTeam();
  scenarioRunning = true;
  
  // 스텝 정보 전송
  const steps = SCENARIO_STEPS.map((s, i) => ({
    index: i,
    agent: s.agent,
    action: s.action,
    to: s.to,
    text: s.text || s.task?.subject || s.taskId || '',
    description: describeStep(s)
  }));
  broadcast('step_mode', { steps, currentStep: -1, totalSteps: steps.length });
  res.json({ status: 'started', mode: 'step', totalSteps: steps.length });
});

// 다음 스텝 실행
app.post('/api/scenario/next-step', async (req, res) => {
  if (!scenarioRunning || !stepMode) return res.status(400).json({ error: 'Not in step mode' });
  
  currentStepIndex++;
  if (currentStepIndex >= SCENARIO_STEPS.length) {
    scenarioRunning = false;
    broadcast('scenario_complete', {});
    return res.json({ status: 'complete' });
  }
  
  const step = SCENARIO_STEPS[currentStepIndex];
  await executeStep(step);
  
  const snapshot = await mailbox.getFileSystemSnapshot();
  broadcast('fs_update', snapshot);
  broadcast('step_progress', { 
    currentStep: currentStepIndex, 
    totalSteps: SCENARIO_STEPS.length,
    step: describeStep(step),
    agent: step.agent,
    action: step.action
  });
  
  res.json({ 
    status: 'ok', 
    currentStep: currentStepIndex, 
    totalSteps: SCENARIO_STEPS.length,
    hasNext: currentStepIndex < SCENARIO_STEPS.length - 1
  });
});

app.post('/api/scenario/reset', async (req, res) => {
  scenarioRunning = false;
  stepMode = false;
  currentStepIndex = -1;
  if (scenarioTimeout) clearTimeout(scenarioTimeout);
  await fs.rm(BASE_DIR, { recursive: true, force: true });
  broadcast('reset', {});
  res.json({ status: 'reset' });
});

// 스텝 설명 생성
function describeStep(step) {
  const agent = AGENT_PROFILES[step.agent];
  const emoji = agent?.emoji || '?';
  switch (step.action) {
    case 'broadcast': return `${emoji} ${step.agent}이(가) 전체에게: "${(step.text||'').slice(0, 60)}..."`;
    case 'message': return `${emoji} ${step.agent} → ${step.to}: "${(step.text||'').slice(0, 60)}..."`;
    case 'create_task': return `${emoji} ${step.agent}이(가) 태스크 생성: #${step.task.id} ${step.task.subject}`;
    case 'claim_task': return `${emoji} ${step.agent}이(가) 태스크 #${step.taskId} claim`;
    case 'complete_task': return `${emoji} ${step.agent}이(가) 태스크 #${step.taskId} 완료`;
    case 'idle': return `${emoji} ${step.agent} → 유휴 상태`;
    case 'llm_call': return `🧠 ${step.agent} LLM 호출 — inbox 확인 → API 요청 → 응답 수신`;
    default: return `${emoji} ${step.agent}: ${step.action}`;
  }
}

// 단일 스텝 실행
async function executeStep(step) {
  const agent = AGENT_PROFILES[step.agent];
  switch (step.action) {
    case 'broadcast': {
      const others = Object.keys(AGENT_PROFILES).filter(n => n !== step.agent);
      for (const to of others) {
        await mailbox.sendMessage(to, { from: step.agent, text: step.text, color: agent.color, type: 'chat' });
      }
      broadcast('agent_action', { agent: step.agent, action: 'broadcast', text: step.text });
      break;
    }
    case 'message': {
      await mailbox.sendMessage(step.to, { from: step.agent, text: step.text, color: agent.color, type: 'chat' });
      broadcast('agent_action', { agent: step.agent, action: 'message', to: step.to, text: step.text });
      break;
    }
    case 'create_task': { await mailbox.createTask(step.task); break; }
    case 'claim_task': { await mailbox.claimTask(step.taskId, step.agent); break; }
    case 'complete_task': { await mailbox.completeTask(step.taskId, step.result); break; }
    case 'idle': {
      const others = Object.keys(AGENT_PROFILES).filter(n => n !== step.agent);
      for (const to of others) {
        await mailbox.sendMessage(to, { from: step.agent, text: step.text, color: agent.color, type: 'idle_notification' });
      }
      broadcast('agent_action', { agent: step.agent, action: 'idle' });
      break;
    }
    case 'llm_call': {
      // 가상 LLM 호출 시뮬레이션
      // 1. inbox에서 미읽 메시지 수집
      const unread = await mailbox.readUnreadMessages(step.agent);
      // 2. 읽음 처리
      await mailbox.markMessagesAsRead(step.agent);
      
      broadcast('llm_call', {
        agent: step.agent,
        prompt: step.prompt,
        inbox_context: step.inbox_context,
        llm_response: step.llm_response,
        unread_count: unread.length
      });
      break;
    }
  }
}

async function runScenario() {
  for (const step of SCENARIO_STEPS) {
    if (!scenarioRunning) break;
    
    await new Promise(r => {
      scenarioTimeout = setTimeout(r, step.delay > 0 ? step.delay : 500);
    });
    if (!scenarioRunning) break;

    await executeStep(step);
    
    const snapshot = await mailbox.getFileSystemSnapshot();
    broadcast('fs_update', snapshot);
  }
  
  scenarioRunning = false;
  broadcast('scenario_complete', {});
}

async function buildFileTree(dir, prefix = '') {
  const items = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          type: 'dir',
          path: fullPath,
          children: await buildFileTree(fullPath, prefix + '  ')
        });
      } else {
        let content = null;
        try { content = await fs.readFile(fullPath, 'utf-8'); } catch {}
        items.push({
          name: entry.name,
          type: 'file',
          path: fullPath,
          size: content?.length || 0,
          content
        });
      }
    }
  } catch {}
  return items;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎯 Agent Team Demo Server`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`   파일 기반 통신 경로: ${BASE_DIR}\n`);
});
