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

app.post('/api/scenario/start', async (req, res) => {
  if (scenarioRunning) return res.status(400).json({ error: 'Scenario already running' });
  
  // 초기화
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
  
  scenarioRunning = true;
  runScenario();
  res.json({ status: 'started' });
});

app.post('/api/scenario/reset', async (req, res) => {
  scenarioRunning = false;
  if (scenarioTimeout) clearTimeout(scenarioTimeout);
  await fs.rm(BASE_DIR, { recursive: true, force: true });
  broadcast('reset', {});
  res.json({ status: 'reset' });
});

async function runScenario() {
  for (const step of SCENARIO_STEPS) {
    if (!scenarioRunning) break;
    
    await new Promise(r => {
      scenarioTimeout = setTimeout(r, step.delay > 0 ? step.delay : 500);
    });
    if (!scenarioRunning) break;

    const agent = AGENT_PROFILES[step.agent];
    
    switch (step.action) {
      case 'broadcast': {
        const others = Object.keys(AGENT_PROFILES).filter(n => n !== step.agent);
        for (const to of others) {
          await mailbox.sendMessage(to, {
            from: step.agent,
            text: step.text,
            color: agent.color,
            type: 'chat'
          });
        }
        broadcast('agent_action', { agent: step.agent, action: 'broadcast', text: step.text });
        break;
      }
      case 'message': {
        await mailbox.sendMessage(step.to, {
          from: step.agent,
          text: step.text,
          color: agent.color,
          type: 'chat'
        });
        broadcast('agent_action', { agent: step.agent, action: 'message', to: step.to, text: step.text });
        break;
      }
      case 'create_task': {
        await mailbox.createTask(step.task);
        break;
      }
      case 'claim_task': {
        await mailbox.claimTask(step.taskId, step.agent);
        break;
      }
      case 'complete_task': {
        await mailbox.completeTask(step.taskId, step.result);
        break;
      }
      case 'idle': {
        const others = Object.keys(AGENT_PROFILES).filter(n => n !== step.agent);
        for (const to of others) {
          await mailbox.sendMessage(to, {
            from: step.agent,
            text: step.text,
            color: agent.color,
            type: 'idle_notification'
          });
        }
        broadcast('agent_action', { agent: step.agent, action: 'idle' });
        break;
      }
    }
    
    // 매 액션마다 파일 시스템 스냅샷 전송
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
