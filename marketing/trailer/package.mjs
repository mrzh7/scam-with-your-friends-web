import { spawn } from 'node:child_process';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const renders = 'marketing/trailer/.renders';
const media = 'docs/media';
await mkdir(media, { recursive: true });
const run = args => new Promise((yes, no) => {
  const p = spawn(ffmpeg, ['-hide_banner','-loglevel','warning','-y',...args], { stdio: 'inherit', windowsHide: true });
  p.on('error', no); p.on('close', code => code === 0 ? yes() : no(new Error(`ffmpeg exited ${code}`)));
});

// English master; 48 kHz stereo, slightly below the score's measured -15 LUFS.
await run(['-i',`${renders}/silent.mp4`,'-i',`${renders}/mix.wav`,'-map','0:v','-map','1:a','-vf','hqdn3d=1.2:1.2:2:2','-c:v','libx264','-preset','slow','-tune','animation','-crf','21','-maxrate','5M','-bufsize','10M','-pix_fmt','yuv420p','-af','volume=0.93','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-metadata','title=Scam With Your Friends — Web | Launch Trailer','-metadata','comment=Scripted cinematic animation of the unofficial web project. Original synthesized score and effects.','-shortest',`${media}/trailer-en.mp4`]);

// Convert SRT to ASS so the Chinese font size and safe caption area are explicit.
await run(['-i','marketing/trailer/captions.zh-CN.srt',`${renders}/captions.zh-CN.ass`]);
let ass = await readFile(`${renders}/captions.zh-CN.ass`, 'utf8');
ass = ass.replace(/PlayResX: \d+/, 'PlayResX: 1920').replace(/PlayResY: \d+/, 'PlayResY: 1080');
const font = process.env.CJK_FONT || (process.platform === 'win32' ? 'Microsoft YaHei' : 'Noto Sans CJK SC');
ass = ass.replace(/^Style: Default,.*$/m, `Style: Default,${font},35,&H00DDEFf3,&H000000FF,&H00141805,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,30,30,17,1`);
await writeFile(`${renders}/captions.zh-CN.ass`, ass, 'utf8');
await run(['-i',`${media}/trailer-en.mp4`,'-vf',`scale=1792:1008:flags=lanczos,pad=1920:1080:64:0:0x051418,ass=${renders}/captions.zh-CN.ass`,'-c:v','libx264','-preset','slow','-crf','21','-maxrate','5M','-bufsize','10M','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-metadata','title=Scam With Your Friends — Web | 中文字幕宣传片',`${media}/trailer-zh-CN.mp4`]);

// A lightweight, soundless GitHub README loop; the poster links to the full film.
await run(['-ss','41.6','-t','5','-i',`${media}/trailer-en.mp4`,'-vf','fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-an','-loop','0',`${media}/trailer-preview.gif`]);
await run(['-ss','43.2','-i',`${media}/trailer-en.mp4`,'-frames:v','1','-update','1','-q:v','2',`${media}/trailer-poster.jpg`]);
await run(['-i',`${renders}/score.wav`,'-af','volume=0.93','-c:a','libmp3lame','-b:a','192k','-metadata','title=Clock In, Cash Out — Original Trailer Score',`${media}/trailer-score.mp3`]);
for (const lang of ['en','zh-CN']) await copyFile(`marketing/trailer/captions.${lang}.srt`,`${media}/trailer.${lang}.srt`);
console.log('Delivered two H.264/AAC MP4s, README GIF, poster, original score and SRT captions in',resolve(media));
