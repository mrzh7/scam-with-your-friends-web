import {useSyncExternalStore} from 'react';
import {getLocale,getPreference,setLanguage,subscribeLanguage,t,localeNames,locales,validPreference} from './index';
export function useLocale(){return useSyncExternalStore(subscribeLanguage,getLocale,()=> 'en' as const);}
export function useLanguagePreference(){return useSyncExternalStore(subscribeLanguage,getPreference,()=> 'auto' as const);}
export function LanguageSelector(){useSyncExternalStore(subscribeLanguage,()=>getPreference()+':'+getLocale());return <label className="language-selector"><span>{t('界面与对话语言')}</span><select aria-label={t('语言')} value={getPreference()} onChange={e=>setLanguage(validPreference(e.target.value))}><option value="auto">{t('自动（跟随浏览器）')}</option>{locales.map(locale=><option key={locale} value={locale}>{localeNames[locale]}</option>)}</select></label>;}
