import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight, Code2, Github, Star } from 'lucide-react';
import { useLocale } from './i18n/LanguageSelector';
import type { Locale } from './i18n';
import messages from './openSourceMessages.json';
import './OpenSourceBanner.css';

const repository = 'https://github.com/mrzh7/scam-with-your-friends-web';
type ProjectCopy = {
  label: string;
  title: string;
  description: string;
  features: string[];
  star: string;
  docs: string;
  support: string;
  compact: string;
};
const copy: Record<Locale, ProjectCopy> = messages;

export function OpenSourceBanner() {
  const locale = useLocale();
  const text = copy[locale];
  const banner = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = banner.current;
    const shell = element?.parentElement;
    if (!element || !shell) return;
    const updateHeight = () => shell.style.setProperty('--source-banner-height', `${element.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <header className="source-banner" ref={banner} aria-label={text.label}>
    <div className="source-banner-inner">
      <div className="source-banner-mark" aria-hidden="true"><Code2 size={36} strokeWidth={1.8}/></div>
      <div className="source-banner-copy">
        <div className="source-banner-eyebrow"><span className="source-banner-dot"/>{text.label}<span className="source-banner-project">Scam With Your Friends Web</span></div>
        <h2>{text.title}</h2>
        <strong className="source-banner-compact">{text.compact}</strong>
        <p className="source-banner-description">{text.description}</p>
        <ul className="source-banner-features">{text.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      </div>
      <div className="source-banner-actions">
        <a className="source-banner-star" href={repository} target="_blank" rel="noopener noreferrer"><Github size={19} aria-hidden="true"/><span>{text.star}</span><Star size={17} aria-hidden="true"/></a>
        <a className="source-banner-docs" href={`${repository}/blob/main/docs/DEPLOYMENT${locale === 'zh' ? '.zh-CN' : ''}.md`} target="_blank" rel="noopener noreferrer">{text.docs}<ArrowUpRight size={16} aria-hidden="true"/></a>
        <small>{text.support}</small>
      </div>
    </div>
  </header>;
}
