export const locales=['en','zh','pt','ja','es','ru','de'] as const;
export type Locale=typeof locales[number];
export type LanguagePreference=Locale|'auto';
export const localeNames:Record<Locale,string>={en:'English',zh:'中文',pt:'Português (Brasil)',ja:'日本語',es:'Español',ru:'Русский',de:'Deutsch'};
export const languageTags:Record<Locale,string>={en:'en-US',zh:'zh-CN',pt:'pt-BR',ja:'ja-JP',es:'es-ES',ru:'ru-RU',de:'de-DE'};
export function normalizeLocale(value:unknown):Locale {const prefix=String(value||'').toLowerCase().split(/[-_]/)[0];return locales.includes(prefix as Locale)?prefix as Locale:'en';}
export function detectLocale(languages:readonly string[]):Locale {for(const language of languages){const prefix=language.toLowerCase().split(/[-_]/)[0];if(locales.includes(prefix as Locale))return prefix as Locale;}return 'en';}
export function validPreference(value:unknown):LanguagePreference{return value==='auto'||locales.includes(value as Locale)?value as LanguagePreference:'auto';}
export const languageInstruction=(locale:Locale)=>'LANGUAGE OVERRIDE: All spoken replies must be in '+({en:'English',zh:'Simplified Chinese',pt:'Brazilian Portuguese',ja:'Japanese',es:'Spanish',ru:'Russian',de:'German'}[locale])+'. This overrides any earlier Chinese-language requirement. Keep replies concise (1–3 sentences). Keep JSON keys and attitude enum values unchanged, and copy game identifiers exactly. You remain the incoming caller, never the operator.';
