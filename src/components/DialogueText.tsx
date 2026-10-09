import {t} from '../i18n';
import type { KeyboardEvent, MouseEvent } from 'react';

function selectValue(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
 const node = event.currentTarget;
 node.focus({ preventScroll: true });
 const selection = node.ownerDocument.getSelection();
 if (!selection) return;
 const range = node.ownerDocument.createRange();
 range.selectNodeContents(node);
 selection.removeAllRanges();
 selection.addRange(range);
}

export function DialogueText({ text, values }: { text: string; values: string[] }) {
 const known = [...new Set(values.filter(Boolean))];
 if (!known.length) return <>{text}</>;
 const escaped = known.sort((a, b) => b.length - a.length).map(value => value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&'));
 const pattern = new RegExp('(?<![A-Za-z0-9_-])(' + escaped.join('|') + ')(?![A-Za-z0-9_-])', 'gi');
 const selectable = new Set(known.map(value => value.toUpperCase()));
 return <>{text.split(pattern).map((part, index) => selectable.has(part.toUpperCase())
  ? <span key={index} className="dialogue-value" role="button" tabIndex={0} aria-label={t('全选 {0}', [part])} title={t("单击全选，再按 Ctrl+C / ⌘C 复制")} onClick={selectValue} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectValue(event); } }}>{part}</span>
  : part)}</>;
}
