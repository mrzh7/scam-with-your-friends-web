import {t} from '../i18n';
import { useState, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Window({ id, title, icon, color, children, onClose, onMinimize, onFocus, z, initial, className = '' }: { id: string; title: string; icon: string; color: string; children: ReactNode; onClose: () => void; onMinimize: () => void; onFocus: () => void; z: number; initial: { x: number; y: number; w: number; h?: number }; className?: string }) {
 const [position, setPosition] = useState({ x: initial.x, y: initial.y }); const [max, setMax] = useState(false);
 return <section className={`os-window ${className} ${max ? 'maximized' : ''}`} style={{ left: position.x, top: position.y, width: initial.w, height: initial.h, zIndex: z }} aria-label={t(title)} data-window={id} onPointerDown={onFocus}>
  <header className="window-title" onPointerDown={e => { if ((e.target as HTMLElement).closest('button') || max) return; e.currentTarget.setPointerCapture(e.pointerId); const dx = e.clientX - position.x, dy = e.clientY - position.y; const node = e.currentTarget; const move = (event: PointerEvent) => { setPosition({ x: Math.max(0, Math.min(window.innerWidth - Math.min(initial.w, 250), event.clientX - dx)), y: Math.max(0, Math.min(window.innerHeight - 140, event.clientY - dy)) }); }; const up = () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); }; node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up); }} onDoubleClick={() => setMax(!max)}>
   <span className="tiny-icon" style={{ background: color }}><Icon name={icon} size={14}/></span><span>{t(title)}</span><div className="window-controls"><button onClick={onMinimize} aria-label={t(`最小化 ${title}`)}><Icon name="minus" size={15}/></button><button onClick={() => setMax(!max)} aria-label={t(`最大化 ${title}`)}><Icon name="square" size={12}/></button><button onClick={onClose} aria-label={t(`关闭 ${title}`)} className="window-close"><Icon name="close" size={18}/></button></div>
  </header><div className="window-body">{children}</div>
 </section>;
}
