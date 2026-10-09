import {t} from '../i18n';
import { useEffect, useId, useState } from 'react';
import { Icon } from './Icon';

export function SoundControl({ sound, onChange }: { sound: boolean; onChange: (enabled: boolean) => void }) {
 const [dismissed, setDismissed] = useState(false);
 const hintId = useId();
 useEffect(() => { if (sound) setDismissed(false); }, [sound]);
 const hint = !sound && !dismissed;
 return <div className="sound-control">
  {hint && <aside className="sound-hint" aria-label={t("声音提醒")}>
   <button className="sound-hint-close" aria-label={t("暂时关闭声音提醒")} onClick={() => setDismissed(true)}><Icon name="close" size={15}/></button>
   <div className="sound-hint-title" role="status"><Icon name="muted" size={21}/><strong>{t("你还听不到来电者的声音")}</strong></div>
   <p id={hintId}>{t("声音已关闭，开启后听见角色对话和来电铃声。")}</p>
   <button className="sound-hint-enable" onClick={() => onChange(true)}><Icon name="volume" size={17}/>{t("开启声音")}<Icon name="right" size={16}/></button>
  </aside>}
  <button className={'sound-toggle' + (!sound ? ' is-muted' : '')} onClick={() => onChange(!sound)} aria-label={t(sound ? '关闭声音' : '开启声音')} aria-pressed={sound} aria-describedby={hint ? hintId : undefined} title={t(sound ? '关闭声音' : '声音已关闭 · 点击开启')}><Icon name={sound ? 'volume' : 'muted'} size={20}/>{!sound && <i aria-hidden="true"/>}</button>
 </div>;
}
