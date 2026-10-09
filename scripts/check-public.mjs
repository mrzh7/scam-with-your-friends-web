import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
// Deliberately reports paths and rule names, never matched credential values.
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=/(^|\/)(references|node_modules|dist|\.local-config|\.wrangler|\.codex-remote-attachments)\/|(^|\/)(\.env|\.dev.vars)(?!\.example$)|\.(pem|p12|pfx|sqlite3?|db)$/;
const rules=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/],['google-secret',/GOCSPX-[A-Za-z0-9_-]{20,}/],['provider-key',/\bsk-[A-Za-z0-9_-]{24,}/],['aws-key',/\bAKIA[A-Z0-9]{16}\b/]];
let failed=false;
for(const file of files){
 if(forbidden.test(file)){console.error('Excluded file tracked:',file);failed=true;continue;}
 if(!fs.existsSync(file)||fs.statSync(file).size>2000000)continue;
 const content=fs.readFileSync(file,'utf8');
 for(const [rule,pattern] of rules)if(pattern.test(content)){console.error(rule+': '+file);failed=true;}
}
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
if(config.d1_databases[0].database_id!=='00000000-0000-0000-0000-000000000000')console.warn('Deployment-specific D1 ID present; verify this is intentional.');
if(failed)process.exitCode=1;else console.log('Tracked-file public checks passed. This heuristic does not prove absence of secrets.');
