import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import type { Plugin } from 'vite';
import { aiConfiguration, probeAI } from '../worker/dialogue';
import type { Env } from '../worker/auth';

type AIInput = { key?: string; model: string; base: string };
const keys = ['AI_API_KEY', 'OPENROUTER_API_KEY', 'AI_MODEL', 'AI_BASE_URL'];
export function validateAIInput(value: unknown): AIInput {
 const v = value as Record<string, unknown>;
 if (!v || typeof v !== 'object' || typeof v.model !== 'string' || !/^[\w./:@+-]{1,160}$/.test(v.model.trim())) throw new Error('请输入有效的模型 ID。');
 if (v.key !== undefined && (typeof v.key !== 'string' || !/^[!-~]{1,1024}$/.test(v.key))) throw new Error('密钥不能为空，也不能包含空格或换行。');
 let url: URL; try { url = new URL(String(v.base || 'https://openrouter.ai/api/v1')); } catch { throw new Error('服务地址不是有效的 URL。'); }
 if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('服务地址必须是无密码、查询参数的 HTTPS 地址。');
 return { key: v.key as string | undefined, model: v.model.trim(), base: url.toString().replace(/\/$/, '') };
}
export function mergeAIEnv(source: string, input: AIInput) {
 const old = parseEnv(source), key = input.key || old.AI_API_KEY || old.OPENROUTER_API_KEY;
 if (!key) throw new Error('请输入服务商的 API Key。');
 // parseEnv also handles quoted/multiline secrets. Never return those secrets to the browser.
 const values = { AI_API_KEY: key, AI_MODEL: input.model, AI_BASE_URL: input.base };
 // Refuse ambiguous multiline values for the four keys we replace, preserving all other settings.
 const lines = source.split(/\r?\n/);
 const retained = lines.filter(line => !keys.some(key => new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=').test(line)));
 for (const key of keys) if (old[key]?.includes('\n')) throw new Error('现有 AI 配置包含多行值，请先在 .dev.vars 中修正。');
 return retained.join('\n').trimEnd() + '\n\n# AI connection configured locally; never commit this file.\n' + Object.entries(values).map(([name, value]) => name + '=' + JSON.stringify(value)).join('\n') + '\n';
}
export function isLocalAIRequest(host: string | undefined, origin: string | undefined, address: string | undefined, mutating: boolean) {
 if (!host || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || '')) return false;
 let url: URL; try { url = new URL('http://' + host); } catch { return false; }
 if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
 return mutating ? origin === url.origin : !origin || origin === url.origin;
}
export function localAISetup(probe: typeof probeAI = probeAI): Plugin {
 return { name: 'local-ai-setup', apply: 'serve', enforce: 'pre', configureServer(server) {
  let saving = false;
  server.middlewares.use(async (req, res, next) => {
   if (req.url?.split('?')[0] !== '/__local/ai') return next();
   const reply = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
   const mutating = req.method !== 'GET';
   if (!isLocalAIRequest(req.headers.host, req.headers.origin, req.socket.remoteAddress, mutating) || (mutating && req.headers['x-local-ai-setup'] !== '1')) return reply(403, { error: 'AI 设置仅允许本机同源访问。' });
   if (!['GET', 'POST'].includes(req.method || '')) return reply(405, { error: '不支持的请求。' });
   const path = resolve(server.config.root, '.dev.vars');
   try {
    let source = ''; try { source = await readFile(path, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const env = parseEnv(source) as unknown as Env;
    if (!mutating) return reply(200, { local: true, ...aiConfiguration(env), base: env.AI_BASE_URL || 'https://openrouter.ai/api/v1', hasKey: !!(env.AI_API_KEY || env.OPENROUTER_API_KEY) });
    if (saving) return reply(409, { error: '另一项配置正在测试，请稍候。' });
    const chunks: Buffer[] = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 5000) return reply(413, { error: '配置过长。' }); chunks.push(Buffer.from(chunk)); }
    let data: unknown; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: '配置格式不正确。' }); }
    const input = validateAIInput(data);
    const output = mergeAIEnv(source, input);
    if (saving) return reply(409, { error: '另一项配置正在测试，请稍候。' });
    saving = true;
    try {
     await probe(parseEnv(output) as unknown as Env);
     // Don't overwrite a concurrent manual edit to the file.
     let current = ''; try { current = await readFile(path, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
     if (current !== source) return reply(409, { error: '.dev.vars 已被其他操作修改，请重新打开设置。' });
     const temporary = path + '.tmp'; await writeFile(temporary, output, { mode: 0o600 }); await rename(temporary, path);
     reply(200, { saved: true, model: input.model });
     // Let the response arrive before the Worker reloads its environment.
     setTimeout(() => { void server.restart().catch(() => server.config.logger.error('AI 配置已保存，请手动重启 npm run dev。')); }, 500);
    } finally { saving = false; }
   } catch (e) {
    const message = e instanceof Error ? e.message : '';
    // Filesystem errors can include sensitive paths/content; surface only controlled messages.
    reply(400, { error: /^(AI |请输入|服务地址|密钥|现有 AI)/.test(message) ? message : 'AI 配置或连接测试失败，请检查网络及配置后重试。' });
   }
  });
 } };
}
