import type { Env } from './auth';
export async function iceConfiguration(env: Env, fetcher: typeof fetch = fetch) {
 if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) return { relay: false, iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] };
 const response = await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 7200 }) });
 if (!response.ok) throw new Error('语音中继凭据获取失败，请检查 Cloudflare TURN 配置。');
 const result = await response.json() as { iceServers?: { urls: string[] | string; username?: string; credential?: string }[] };
 if (!Array.isArray(result.iceServers) || !result.iceServers.length) throw new Error('TURN 返回无效配置。');
 return { relay: true, iceServers: result.iceServers };
}
