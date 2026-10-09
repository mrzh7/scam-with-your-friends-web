import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function historyPoints(weeks) {
  if (!Array.isArray(weeks)) throw new Error('Invalid star history response');
  const days = new Map();
  for (const w of weeks) {
    if (!Number.isFinite(w.week) || !Array.isArray(w.days) || w.days.length !== 7 || w.days.some(n => !Number.isInteger(n) || n < 0)) throw new Error('Invalid history week');
    w.days.forEach((n, i) => days.set((w.week + i * 86400) * 1000, n));
  }
  let cumulative = 0;
  return [...days].sort((a, b) => a[0] - b[0]).map(([time, n]) => ({ time, count: cumulative += n }));
}

export function render(repo, weeks, count, dark = false, now = Date.now()) {
  if (!Number.isInteger(count) || count < 0) throw new Error('Invalid star count');
  const points = historyPoints(weeks).filter(p => p.time <= now);
  if (count > 0 && !points.some(p => p.count > 0)) throw new Error('Nonzero stars but empty history; retaining previous chart');
  if (!points.length) points.push({ time: now - 86400000, count: 0 });
  // Historical totals and the current count can differ after stars are removed.
  // Keep history as supplied by GitHub; display the current count separately.
  const min = points[0].time, max = Math.max(now, min + 86400000);
  const top = Math.max(1, count, ...points.map(p => p.count));
  const x = t => 70 + (t - min) / (max - min) * 690;
  const y = n => 320 - n / top * 205;
  const bg = dark ? '#0d1117' : '#ffffff', fg = dark ? '#e6edf3' : '#1f2328', grid = dark ? '#30363d' : '#d8dee4';
  const date = t => new Date(t).toISOString().slice(0, 10);
  const ticks = [...new Set([0, Math.round(top / 2), top])];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(2)},${y(p.count).toFixed(2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="410" viewBox="0 0 800 410" role="img" aria-labelledby="title desc">
<title id="title">Star history — ${escape(repo)}</title><desc id="desc">${count} current stars. Daily cumulative history from GitHub's aggregate API. Updated ${date(now)}.</desc>
<rect width="800" height="410" rx="16" fill="${bg}"/>
<g font-family="system-ui, sans-serif" fill="${fg}">
<text x="40" y="43" font-size="24" font-weight="700">Star History</text><text x="40" y="70" font-size="14">${escape(repo)}</text>
<text x="760" y="45" text-anchor="end" font-size="22" font-weight="700">★ ${count}</text>
${ticks.map(n => `<path d="M70 ${y(n)}H760" stroke="${grid}"/><text x="57" y="${y(n) + 5}" text-anchor="end" font-size="13">${n}</text>`).join('\n')}
<path d="${path}" fill="none" stroke="#39ba93" stroke-width="3" stroke-linejoin="round"/>
${points.map(p => `<circle cx="${x(p.time).toFixed(2)}" cy="${y(p.count).toFixed(2)}" r="4" fill="#39ba93"><title>${date(p.time)}: ${p.count}</title></circle>`).join('')}
<text x="70" y="349" font-size="13">${date(min)}</text><text x="760" y="349" text-anchor="end" font-size="13">${date(max)}</text>
<text x="40" y="387" font-size="12">GitHub aggregate history · Updated ${date(now)} · Daily automatic refresh</text>
</g></svg>\n`;
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || 'mrzh7/scam-with-your-friends-web';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid repository');
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const get = async route => {
    const r = await fetch(`https://api.github.com/repos/${repo}/${route}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`GitHub API returned ${r.status}`);
    return r.json();
  };
  const weeks = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await get(`stargazers/history?per_page=30&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Invalid history response');
    weeks.push(...batch);
    if (batch.length < 30) break;
    if (page === 100) throw new Error('History pagination limit exceeded');
  }
  const { count } = await get('stargazers/count');
  const now = Date.now();
  const charts = [false, true].map(dark => render(repo, weeks, count, dark, now));
  await mkdir('docs/media', { recursive: true });
  await Promise.all(charts.map((svg, i) => writeFile(`docs/media/star-history-${i ? 'dark' : 'light'}.svg`, svg)));
  console.log(`Generated star history: ${count} current stars, ${weeks.length} weeks`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
