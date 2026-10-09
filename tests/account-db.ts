import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { Env } from '../worker/auth';
export function accountDatabase() {
 const sqlite = new DatabaseSync(':memory:');
 sqlite.exec(readFileSync('migrations/0001_initial.sql','utf8')); sqlite.exec(readFileSync('migrations/0002_accounts.sql','utf8'));
 sqlite.exec(readFileSync('migrations/0003_site_settings.sql','utf8'));
 sqlite.exec(readFileSync('migrations/0004_email_verification.sql','utf8'));
 const prepare = (sql: string, values: SQLInputValue[] = []) => ({
  bind: (...args: SQLInputValue[]) => prepare(sql, args),
  first: async () => sqlite.prepare(sql).get(...values) || null,
  all: async () => ({success:true, results: sqlite.prepare(sql).all(...values)}),
  run: async () => ({success:true, meta: sqlite.prepare(sql).run(...values)}),
 });
 const database = { prepare, batch: async (statements: ReturnType<typeof prepare>[]) => { sqlite.exec('BEGIN'); try { const results=[]; for (const statement of statements) results.push(await statement.all()); sqlite.exec('COMMIT'); return results; } catch(e) { sqlite.exec('ROLLBACK'); throw e; } } } as unknown as D1Database;
 return {sqlite, env: {DB:database,ACCOUNTS_ENABLED:'true'} as Env};
}
