
import fs from 'node:fs';
import ts from 'typescript';
const keys=new Set(JSON.parse(fs.readFileSync('src/i18n/messages.json','utf8')));
const missing=new Set();
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory()){if(entry.name!=='i18n')scan(path);continue;}if(!/\.tsx?$/.test(path))continue;const file=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),99,true,path.endsWith('tsx')?4:3);function visit(node){if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node))&&/[\u3400-\u9fff]/.test(node.text)&&!keys.has(node.text)&&node.text.trim())missing.add(node.text);ts.forEachChild(node,visit);}visit(file);}}
scan('src');
if(missing.size){console.error('Messages missing from i18n manifest:',[...missing]);process.exitCode=1;}else console.log('All source Chinese display messages are covered by the i18n manifest.');

