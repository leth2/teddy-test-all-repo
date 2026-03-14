#!/usr/bin/env node
/**
 * pipeline-runner.js — Quinn's test pipeline executor
 * Usage: node pipeline-runner.js <test-queue.json>
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const queueFile = process.argv[2] || 'test-queue.json';

// ── Load queue ──────────────────────────────────────────────────────────────
const queue = JSON.parse(readFileSync(resolve(__dirname, queueFile), 'utf8'));
const { source, tasks } = queue;

// ── git pull ─────────────────────────────────────────────────────────────────
if (source?.pre_run) {
  console.log(`[pipeline] Running pre_run: ${source.pre_run}`);
  try {
    execSync(source.pre_run, { cwd: source.path || __dirname, stdio: 'inherit' });
  } catch (e) {
    console.warn('[pipeline] pre_run failed, continuing with local files');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function checkContains(text, patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  return list.every(p => text.includes(p));
}

async function runHttp(task) {
  const { url, method = 'GET' } = task.target;
  const body = task.input?.body;
  const start = Date.now();

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(task.timeout_ms || 10000),
  });

  const text = await res.text();
  const duration_ms = Date.now() - start;
  const { status, contains, body: bodyExact } = task.expect;

  const failures = [];
  if (status !== undefined && res.status !== status)
    failures.push(`status ${res.status}, expected ${status}`);
  if (contains && !checkContains(text, contains))
    failures.push(`response missing: ${[].concat(contains).join(', ')}`);
  if (bodyExact !== undefined && text !== bodyExact)
    failures.push(`body mismatch`);

  return { duration_ms, output: text.slice(0, 300), failures };
}

async function runCli(task) {
  return new Promise((resolve) => {
    const start = Date.now();
    const { command, args = [] } = task.target;
    const env = { ...process.env, ...(task.env || {}) };
    const chunks = [];

    // resolve 'node' to current process binary to avoid PATH issues
    const resolvedCmd = command === 'node' ? process.execPath : command;
    const proc = spawn(resolvedCmd, args, {
      env,
      cwd: source?.path || __dirname,
      timeout: task.timeout_ms || 10000,
    });

    proc.stdout.on('data', d => chunks.push(d));
    proc.stderr.on('data', d => chunks.push(d));

    proc.on('error', (err) => {
      resolve({ duration_ms: Date.now() - start, output: err.message, failures: [err.message] });
    });

    proc.on('close', (exit_code) => {
      const output = Buffer.concat(chunks).toString().slice(0, 300);
      const duration_ms = Date.now() - start;
      const { exit_code: expectedExit = 0, contains } = task.expect;
      const failures = [];

      if (exit_code !== expectedExit)
        failures.push(`exit_code ${exit_code}, expected ${expectedExit}`);
      if (contains && !checkContains(output, contains))
        failures.push(`output missing: ${[].concat(contains).join(', ')}`);

      resolve({ duration_ms, output, failures });
    });
  });
}

// ── Run tasks ─────────────────────────────────────────────────────────────────
const results = [];
const passed_ids = new Set();

for (const task of tasks) {
  // Check depends_on
  if (task.depends_on?.length) {
    const blocked = task.depends_on.filter(id => !passed_ids.has(id));
    if (blocked.length) {
      console.log(`[SKIP] ${task.id} — blocked by: ${blocked.join(', ')}`);
      results.push({ id: task.id, status: 'skipped', reason: `depends_on failed: ${blocked.join(', ')}` });
      continue;
    }
  }

  let attempt = 0;
  const maxRetries = task.retry?.max ?? 0;
  let lastResult;

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      console.log(`[RETRY] ${task.id} attempt ${attempt + 1}/${maxRetries + 1}`);
      await sleep(task.retry?.delay_ms ?? 1000);
    }

    try {
      if (task.target.kind === 'http') lastResult = await runHttp(task);
      else if (task.target.kind === 'cli') lastResult = await runCli(task);
      else lastResult = { failures: [`unknown kind: ${task.target.kind}`], duration_ms: 0, output: '' };
    } catch (e) {
      lastResult = { failures: [String(e.message || e)], duration_ms: 0, output: '' };
    }

    if (lastResult.failures.length === 0) break;
    attempt++;
  }

  const { duration_ms, output, failures } = lastResult;
  const status = failures.length === 0 ? 'pass' : 'fail';

  const entry = { id: task.id, status, duration_ms };
  if (status === 'fail') { entry.reason = failures.join('; '); entry.output = output; entry.retries = attempt; }
  if (status === 'pass') passed_ids.add(task.id);

  console.log(`[${status.toUpperCase()}] ${task.id} — ${task.description} (${duration_ms}ms)`);
  if (status === 'fail') {
    console.log(`       reason: ${entry.reason}`);
    if (task.on_failure === 'stop') { results.push(entry); console.log('[pipeline] Stopping on failure.'); break; }
    if (task.on_failure === 'escalate') console.log(`[ESCALATE] ${task.id} — review needed!`);
  }

  results.push(entry);
}

// ── Save results ──────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const skipped = results.filter(r => r.status === 'skipped').length;

const report = {
  queue_id: queueFile,
  run_at: new Date().toISOString(),
  passed, failed, skipped,
  tasks: results,
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = resolve(__dirname, '.sdd/test-results');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, `${timestamp}.json`);
writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`\n[pipeline] ✅ ${passed} passed | ❌ ${failed} failed | ⏭ ${skipped} skipped`);
console.log(`[pipeline] Results saved: ${outFile}`);

// ── Git push results ──────────────────────────────────────────────────────────
try {
  execSync(`git add .sdd/test-results/ && git commit -m "test: results ${timestamp}" && git push origin main`, {
    cwd: source?.path || __dirname,
    stdio: 'inherit',
  });
  console.log('[pipeline] Results pushed to GitHub ✅');
} catch (e) {
  console.warn('[pipeline] Git push skipped (no remote or nothing to commit)');
}
