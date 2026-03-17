/**
 * Claude Code Agent Teams — Mailbox System (File-based IPC)
 * 
 * 역공학으로 밝혀낸 Claude Code의 실제 통신 패턴을 재현:
 * - JSON 파일 기반 메시지 큐
 * - 파일 락킹으로 동시성 제어
 * - read/unread 상태 관리
 */

import { promises as fs } from 'fs';
import path from 'path';

const LOCK_RETRY = 10;
const LOCK_MIN_TIMEOUT = 5;
const LOCK_MAX_TIMEOUT = 100;

export class MailboxSystem {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.inboxDir = path.join(baseDir, 'inboxes');
    this.tasksDir = path.join(baseDir, 'tasks');
    this.configPath = path.join(baseDir, 'config.json');
    this.listeners = [];
  }

  async init(teamConfig) {
    await fs.mkdir(this.inboxDir, { recursive: true });
    await fs.mkdir(this.tasksDir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(teamConfig, null, 2));
    
    // 각 멤버의 inbox 초기화
    for (const member of teamConfig.members) {
      const inboxPath = this._getInboxPath(member.name);
      try {
        await fs.writeFile(inboxPath, '[]', { flag: 'wx' });
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
    }
  }

  _getInboxPath(agentName) {
    return path.join(this.inboxDir, `${agentName}.json`);
  }

  _getLockPath(inboxPath) {
    return `${inboxPath}.lock`;
  }

  // 파일 락 획득 (Claude Code의 proper-lockfile 패턴 재현)
  async _acquireLock(filePath) {
    const lockPath = this._getLockPath(filePath);
    for (let i = 0; i < LOCK_RETRY; i++) {
      try {
        await fs.writeFile(lockPath, String(process.pid), { flag: 'wx' });
        return async () => {
          try { await fs.unlink(lockPath); } catch {}
        };
      } catch (e) {
        if (e.code === 'EEXIST') {
          const timeout = LOCK_MIN_TIMEOUT + Math.random() * (LOCK_MAX_TIMEOUT - LOCK_MIN_TIMEOUT);
          await new Promise(r => setTimeout(r, timeout));
          continue;
        }
        throw e;
      }
    }
    // 강제 해제 후 재시도
    try { await fs.unlink(this._getLockPath(filePath)); } catch {}
    await fs.writeFile(this._getLockPath(filePath), String(process.pid), { flag: 'wx' });
    return async () => {
      try { await fs.unlink(this._getLockPath(filePath)); } catch {}
    };
  }

  // 메시지 전송 (writeToMailbox)
  async sendMessage(recipient, message) {
    const inboxPath = this._getInboxPath(recipient);
    const unlock = await this._acquireLock(inboxPath);
    try {
      let messages = [];
      try {
        const data = await fs.readFile(inboxPath, 'utf-8');
        messages = JSON.parse(data);
      } catch {}

      const msg = {
        ...message,
        read: false,
        timestamp: new Date().toISOString()
      };
      messages.push(msg);
      await fs.writeFile(inboxPath, JSON.stringify(messages, null, 2));
      
      this._notifyListeners('message', { recipient, message: msg });
      return msg;
    } finally {
      await unlock();
    }
  }

  // 메일박스 읽기 (readMailbox)
  async readMailbox(agentName) {
    const inboxPath = this._getInboxPath(agentName);
    try {
      const data = await fs.readFile(inboxPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // 미읽 메시지 조회 (readUnreadMessages)
  async readUnreadMessages(agentName) {
    const messages = await this.readMailbox(agentName);
    return messages.filter(m => !m.read);
  }

  // 읽음 처리 (markMessagesAsRead)
  async markMessagesAsRead(agentName) {
    const inboxPath = this._getInboxPath(agentName);
    const unlock = await this._acquireLock(inboxPath);
    try {
      const messages = await this.readMailbox(agentName);
      const updated = messages.map(m => ({ ...m, read: true }));
      await fs.writeFile(inboxPath, JSON.stringify(updated, null, 2));
      this._notifyListeners('read', { agentName, count: messages.filter(m => !m.read).length });
    } finally {
      await unlock();
    }
  }

  // 태스크 생성
  async createTask(task) {
    const taskId = task.id || String(Date.now());
    const taskPath = path.join(this.tasksDir, `${taskId}.json`);
    const taskData = {
      id: taskId,
      ...task,
      status: 'pending',
      owner: null,
      createdAt: new Date().toISOString()
    };
    await fs.writeFile(taskPath, JSON.stringify(taskData, null, 2));
    this._notifyListeners('task_created', taskData);
    return taskData;
  }

  // 태스크 Claim (파일 락 기반 race condition 방지)
  async claimTask(taskId, owner) {
    const taskPath = path.join(this.tasksDir, `${taskId}.json`);
    const unlock = await this._acquireLock(taskPath);
    try {
      const data = await fs.readFile(taskPath, 'utf-8');
      const task = JSON.parse(data);
      
      if (task.owner && task.owner !== owner) {
        return { success: false, reason: 'already_claimed', task };
      }
      if (task.status === 'completed') {
        return { success: false, reason: 'already_completed', task };
      }
      
      task.owner = owner;
      task.status = 'in_progress';
      task.claimedAt = new Date().toISOString();
      await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
      
      this._notifyListeners('task_claimed', task);
      return { success: true, task };
    } finally {
      await unlock();
    }
  }

  // 태스크 완료
  async completeTask(taskId, result) {
    const taskPath = path.join(this.tasksDir, `${taskId}.json`);
    const unlock = await this._acquireLock(taskPath);
    try {
      const data = await fs.readFile(taskPath, 'utf-8');
      const task = JSON.parse(data);
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date().toISOString();
      await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
      this._notifyListeners('task_completed', task);
      return task;
    } finally {
      await unlock();
    }
  }

  // 모든 태스크 조회
  async listTasks() {
    try {
      const files = await fs.readdir(this.tasksDir);
      const tasks = [];
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const data = await fs.readFile(path.join(this.tasksDir, f), 'utf-8');
        tasks.push(JSON.parse(data));
      }
      return tasks.sort((a, b) => a.id.localeCompare(b.id));
    } catch {
      return [];
    }
  }

  // 파일 시스템 상태 스냅샷
  async getFileSystemSnapshot() {
    const snapshot = { inboxes: {}, tasks: [], config: null, lockFiles: [] };
    
    try {
      snapshot.config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
    } catch {}

    try {
      const inboxFiles = await fs.readdir(this.inboxDir);
      for (const f of inboxFiles) {
        if (f.endsWith('.lock')) {
          snapshot.lockFiles.push(f);
          continue;
        }
        if (!f.endsWith('.json')) continue;
        const name = f.replace('.json', '');
        const data = await fs.readFile(path.join(this.inboxDir, f), 'utf-8');
        snapshot.inboxes[name] = JSON.parse(data);
      }
    } catch {}

    snapshot.tasks = await this.listTasks();
    return snapshot;
  }

  onEvent(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  _notifyListeners(type, data) {
    for (const l of this.listeners) {
      try { l(type, data); } catch {}
    }
  }
}
