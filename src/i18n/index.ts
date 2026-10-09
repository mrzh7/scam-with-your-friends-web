import {callerGreetings,callerSituations} from '../game/dialogueContent';
import en from './catalogs/en.json';
import zh from './catalogs/zh.json';
import pt from './catalogs/pt.json';
import ja from './catalogs/ja.json';
import es from './catalogs/es.json';
import {detectLocale,languageTags,validPreference,type Locale,type LanguagePreference} from './locales';
export * from './locales';
const catalogs:Record<Locale,Record<string,string>>={en,zh,pt,ja,es};
const storageKey='swyf-language';
let preference:LanguagePreference='auto';
try{if(typeof localStorage!=='undefined')preference=validPreference(localStorage.getItem(storageKey));}catch{/* Optional browser storage. */}
const listeners=new Set<()=>void>();
export function getLocale():Locale{return preference==='auto'?detectLocale(typeof navigator==='undefined'?['en']:navigator.languages):preference;}
export const getPreference=()=>preference;
function notify(){if(typeof document!=='undefined')document.documentElement.lang=languageTags[getLocale()];listeners.forEach(fn=>fn());}
export function setLanguage(value:LanguagePreference){preference=validPreference(value);try{localStorage.setItem(storageKey,preference);}catch{/* In-memory preference still works. */}notify();}
export function subscribeLanguage(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
if(typeof window!=='undefined'){window.addEventListener('languagechange',()=>{if(preference==='auto')notify();});window.addEventListener('storage',e=>{if(e.key===storageKey){preference=validPreference(e.newValue);notify();}});notify();}
const escape=(s:string)=>s.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const patterns=Object.keys(en).filter(key=>/\{\d+\}/.test(key)).map(key=>{const indices:number[]=[];let last=0,source='^';for(const m of key.matchAll(/\{(\d+)\}/g)){source+=escape(key.slice(last,m.index))+'([\\s\\S]*?)';indices.push(Number(m[1]));last=m.index!+m[0].length;}return {key,indices,pattern:new RegExp(source+escape(key.slice(last))+'$')};}).sort((a,b)=>b.key.length-a.key.length);
const openings=new Map(callerGreetings.flatMap(greeting=>Object.values(callerSituations).map(situation=>[greeting+situation,[greeting,situation]] as const)));
function translate(text:string,locale:Locale,depth=0):string {
 const opening=openings.get(text);if(opening)return opening.map(part=>translate(part,locale,depth+1)).join(locale==='zh'||locale==='ja'?'':' ');
 const catalog=catalogs[locale],exact=catalog[text];if(exact!==undefined)return exact;
 const trim=text.trim();if(trim!==text&&catalog[trim]!==undefined)return text.replace(trim,catalog[trim]);
 if(depth<4){for(const {key,indices,pattern} of patterns){const match=pattern.exec(text);if(match){const args:Record<number,string>={};indices.forEach((n,i)=>{args[n]=translate(match[i+1],locale,depth+1);});return (catalog[key]||catalogs.en[key]||key).replace(/\{(\d+)\}/g,(_,n)=>args[n]??'{'+n+'}');}}}
 return text;
}
/** Translate known display messages only. Game state and identifiers retain their original values. */
export function t<T>(value:T):T;
export function t(value:string,args:readonly unknown[]):string;
export function t<T>(value:T,args?:readonly unknown[]):T|string {
 if(typeof value!=='string')return value;
 const locale=getLocale();
 if(args)return (catalogs[locale][value]||catalogs.en[value]||value).replace(/\{(\d+)\}/g,(_,index)=>{const item=args[Number(index)];return typeof item==='string'?translate(item,locale):item==null?'':String(item);});
 return translate(value,locale) as T;
}
export const formatNumber=(value:number)=>new Intl.NumberFormat(languageTags[getLocale()]).format(value);
export const formatDate=(value:Date)=>value.toLocaleString(languageTags[getLocale()]);

/** Opaque interpolation values such as player names must never be translated. */
export const literal=(value:string)=>({toString:()=>value});
