import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
// Keep Wrangler's development registry and logs inside the project sandbox.
const env = { ...process.env, XDG_CONFIG_HOME: resolve('.local-config'), WRANGLER_LOG_PATH: resolve('.wrangler/logs') };
const command = process.argv[2];
const args = command === 'build' ? ['build', ...process.argv.slice(3)] : [...(command === 'preview' ? ['preview'] : []), '--host', '127.0.0.1', ...process.argv.slice(command === 'preview' ? 3 : 2)];
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...args], { stdio: 'inherit', env });
child.on('exit', code => process.exit(code || 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
