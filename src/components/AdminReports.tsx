import {useEffect, useState} from 'react';
import {api, ApiError} from '../game/storage';
import type {AdminStats, AdminUsers} from '../game/adminReports';
import {formatDate, formatNumber, t} from '../i18n';

function useReport<T>(path: string) {
 const [data, setData] = useState<T | null>(null);
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(true);
 const [version, setVersion] = useState(0);
 useEffect(() => {
  const controller = new AbortController();
  setLoading(true); setError(''); setData(null);
  void api<T>(path, 'GET', undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(28000)]))
   .then(value => {if (!controller.signal.aborted) setData(value);})
   .catch(reason => {
    if (!controller.signal.aborted) setError(reason instanceof ApiError && [401, 403].includes(reason.status)
     ? '管理员身份验证失败。' : '管理数据加载失败，请重试。');
   }).finally(() => {if (!controller.signal.aborted) setLoading(false);});
  return () => controller.abort();
 }, [path, version]);
 return {data, error, loading, refresh: () => setVersion(value => value + 1)};
}

function ReportStatus({loading, error}: {loading: boolean; error: string}) {
 return <>{loading && <p role="status">{t('正在加载管理数据…')}</p>}{error && <p role="alert">{t(error)}</p>}</>;
}

export function AdminOverview() {
 const {data, error, loading, refresh} = useReport<AdminStats>('/admin/stats');
 const metrics: [keyof Pick<AdminStats, 'totalUsers' | 'newUsers24h' | 'newUsers7d' | 'newUsers30d' | 'activeUsers24h' | 'activeUsers7d' | 'activeUsers30d' | 'savedUsers' | 'savedRooms'>, string][] = [
  ['totalUsers', '注册用户总数'], ['newUsers24h', '近 24 小时新增'], ['newUsers7d', '近 7 天新增'],
  ['newUsers30d', '近 30 天新增'], ['activeUsers24h', '近 24 小时活跃'], ['activeUsers7d', '近 7 天活跃'],
  ['activeUsers30d', '近 30 天活跃'], ['savedUsers', '有云存档用户'], ['savedRooms', '已保存房间数'],
 ];
 const peak = Math.max(1, ...data?.registrations.map(day => day.count) || []);
 return <section aria-labelledby="admin-overview-title" aria-busy={loading}>
  <div className="admin-section-heading"><h2 id="admin-overview-title">{t('运营统计')}</h2><button disabled={loading} onClick={refresh}>{t('刷新数据')}</button></div>
  <ReportStatus loading={loading} error={error}/>
  {data && <>
   <p className="admin-note">{t('数据更新时间：{0}', [formatDate(new Date(data.generatedAt))])}</p>
   <dl className="admin-metrics">{metrics.map(([key, label]) => <div key={key}><dt>{t(label)}</dt><dd>{formatNumber(data[key])}</dd></div>)}</dl>
   <div className="admin-definitions">
    <p>{t('仅统计注册账号，不包含匿名游客。活跃用户指时间窗口内有单人存档写入或多人房间存档更新的去重账号；首次初始化存档不算活跃。')}</p>
    <p>{t('已保存房间按房间码去重，包含历史房间，不代表当前在线房间。新增与活跃按滚动时间窗口计算。')}</p>
   </div>
   <section className="admin-trend" aria-labelledby="admin-trend-title">
    <h3 id="admin-trend-title">{t('近 30 天注册趋势（UTC）')}</h3>
    <p className="admin-note">{t('按 UTC 自然日统计，包含今天；今天的数据尚未完整。')}</p>
    <div className="admin-bars" aria-hidden="true">{data.registrations.map(day => <div key={day.date} title={`${day.date}: ${formatNumber(day.count)}`}>
     <span>{day.count || ''}</span><i style={{height: `${day.count / peak * 130}px`}}/>
    </div>)}</div>
    <div className="admin-chart-dates" aria-hidden="true"><span>{data.registrations[0]?.date}</span><span>{data.registrations.at(-1)?.date}</span></div>
    <details><summary>{t('查看每日数据')}</summary><div className="admin-table-wrap"><table><caption>{t('近 30 天注册趋势（UTC）')}</caption><thead><tr><th scope="col">{t('日期（UTC）')}</th><th scope="col">{t('新增用户')}</th></tr></thead><tbody>{data.registrations.map(day => <tr key={day.date}><td>{day.date}</td><td>{formatNumber(day.count)}</td></tr>)}</tbody></table></div></details>
   </section>
  </>}
 </section>;
}

export function AdminUserList() {
 const [draft, setDraft] = useState('');
 const [query, setQuery] = useState('');
 const [page, setPage] = useState(1);
 const pageSize = 25;
 const {data, error, loading, refresh} = useReport<AdminUsers>(`/admin/users?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(query)}`);
 const providers: Record<string, string> = {email: '邮箱密码', google: 'Google', wechat: '微信'};
 return <section aria-labelledby="admin-users-title" aria-busy={loading}>
  <div className="admin-section-heading"><h2 id="admin-users-title">{t('用户列表')}</h2><button disabled={loading} onClick={refresh}>{t('刷新数据')}</button></div>
  <p className="admin-note">{t('仅展示注册账号，按注册时间从新到旧排序。最近存档包含单人和多人进度，不代表当前在线。')}</p>
  <form className="admin-search" onSubmit={event => {event.preventDefault(); setQuery(draft.trim()); setPage(1); refresh();}}>
   <label htmlFor="admin-user-search">{t('搜索用户')}<input id="admin-user-search" type="search" maxLength={100} value={draft} placeholder={t('昵称、邮箱或用户 ID')} onChange={event => setDraft(event.target.value)}/></label>
   <button type="submit" disabled={loading}>{t('搜索用户')}</button>
  </form>
  <ReportStatus loading={loading} error={error}/>
  {data && <>
   <p role="status">{t('共 {0} 位用户', [formatNumber(data.total)])}</p>
   {data.users.length ? <div className="admin-table-wrap" tabIndex={0} role="region" aria-label={t('用户列表')}><table className="admin-users-table">
    <thead><tr>{['用户 / ID', '邮箱地址', '登录方式', '注册时间', '最近存档', '房间存档数'].map(label => <th scope="col" key={label}>{t(label)}</th>)}</tr></thead>
    <tbody>{data.users.map(user => <tr key={user.id}>
     <td><strong>{user.name}</strong><code>{user.id}</code></td>
     <td>{user.email || '—'}</td>
     <td>{user.providers.map(provider => t(providers[provider] || provider)).join(' / ') || '—'}</td>
     <td><time dateTime={new Date(user.createdAt).toISOString()}>{formatDate(new Date(user.createdAt))}</time></td>
     <td>{user.lastSaveAt !== null ? <time dateTime={new Date(user.lastSaveAt).toISOString()}>{formatDate(new Date(user.lastSaveAt))}</time> : t(user.hasSave ? '仅初始化存档' : '暂无云存档')}</td>
     <td>{formatNumber(user.roomCount)}</td>
    </tr>)}</tbody>
   </table></div> : <p className="admin-empty">{t('没有匹配的用户。')}</p>}
   <nav className="admin-pagination" aria-label={t('用户列表分页')}>
    <button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>{t('上一页')}</button>
    <span>{t('第 {0} 页 / 共 {1} 页', [formatNumber(page), formatNumber(Math.max(1, Math.ceil(data.total / pageSize)))])}</span>
    <button disabled={loading || page * pageSize >= data.total} onClick={() => setPage(value => value + 1)}>{t('下一页')}</button>
   </nav>
  </>}
 </section>;
}
