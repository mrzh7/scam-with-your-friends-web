import {t} from '../i18n';
import { useId } from 'react';
import { CALLERS } from '../game/content';

export function Portrait({ person = 0, talking = false, trust = 50, level=0 }: { person?: number; talking?: boolean; trust?: number; level?:number }) {
 const p = CALLERS[person], grid = useId().replace(/:/g, ''), angry = trust < 35;
 const hair = person === 3 ? '#a1e1cc' : person === 4 ? '#82511e' : p.hair;
 const skin = person === 2 ? '#bd814f' : '#f2dfa0';
 const long = [2, 4].includes(person), glasses = [0, 5].includes(person), shades = [3, 6].includes(person);
 return <svg className={`portrait illustrated-portrait ${talking ? 'talking' : ''} ${angry ? 'angry' : ''}`} viewBox="0 0 180 180" aria-label={t(`${p.name} 的二维${angry ? '生气' : trust >= 65 ? '信任' : '平静'}头像`)} role="img">
  <defs><pattern id={grid} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#c5dbd6" strokeOpacity=".2"/></pattern></defs>
  <rect width="180" height="180" fill="#597b7d"/><rect width="180" height="180" fill={`url(#${grid})`}/>
  <g className="caller-head" style={{transform:`translateY(${level*1.7}px) rotate(${(person%2 ? -1:1)*level*1.5}deg)`}} stroke="#111b1c" strokeWidth="4.8" strokeLinejoin="round" strokeLinecap="round">
   {long && <path d={person === 2 ? 'M33 83Q12 55 36 39 41 14 68 24 89 8 109 25 143 15 150 44 172 57 151 82L161 160Q138 173 117 154H61Q34 173 20 156Z' : 'M31 80Q22 33 56 27 73 16 92 29 117 12 134 34 161 44 148 77L158 158Q131 172 113 153H64Q44 171 24 156Z'} fill={hair}/>}
   {[0, 5].includes(person) && <><circle cx={person === 0 ? 56 : 93} cy="34" r="22" fill={hair}/><path d="M37 89Q20 35 69 29 117 12 145 60L142 121H37Z" fill={hair}/></>}
   <path d="M42 80Q28 69 26 88 27 108 43 105M140 80Q155 70 155 88 154 108 139 105" fill={skin}/>
   <path d="M43 63Q88 32 137 65L140 110Q138 147 94 156 52 153 42 119Z" fill={skin}/>
   {person === 3 ? <path d="M40 85Q28 74 43 62L63 56 58 35Q60 17 91 21L121 29Q138 34 134 60 155 66 145 88L127 74 119 59Q91 68 66 60L53 87Z" fill={hair}/> : person === 1 ? <path d="M48 68Q48 32 88 34 128 28 137 72L112 58 92 53 72 64Z" fill={hair}/> : <path d="M40 84Q30 46 66 39 95 26 125 44 143 52 141 82L124 70 115 53Q95 65 80 52 69 79 40 84Z" fill={hair}/>}
   {person === 7 && <path d="M31 57H147L136 48 130 26Q87 17 53 29L48 48Z" fill="#788c53"/>}
   <g className="caller-eyes" fill="#15201e" strokeWidth="3.7">
    {!shades && <><ellipse cx="66" cy="93" rx="3" ry="5"/><ellipse cx="116" cy="93" rx="3" ry="5"/></>}
   </g>
   <path d={angry ? 'M54 77L77 84M104 84L127 76' : 'M54 78Q66 73 77 78M104 78Q116 73 127 78'} fill="none"/>
   {glasses && <g fill="none" strokeWidth="3.5"><circle cx="65" cy="92" r="16"/><circle cx="117" cy="92" r="16"/><path d="M81 90H101M43 85L49 88M133 88L140 85"/></g>}
   {shades && <g fill="#171c1c" strokeWidth="3.5"><path d="M48 86L79 88 75 102Q61 117 51 99ZM103 88L134 85 130 102Q114 113 107 101ZM79 90H103"/><path d="M55 88L63 99M114 89L122 98" fill="none" stroke="#8e9290" strokeWidth="3"/></g>}
   <path d="M91 93L85 109Q89 115 97 111" fill="none" strokeWidth="3.6"/>
   {long && <g fill="none" stroke="#ead128" strokeWidth="5"><ellipse cx="41" cy="108" rx="6" ry="10"/><ellipse cx="141" cy="108" rx="6" ry="10"/></g>}
   <g className="caller-mouth" transform={talking ? `translate(90 128) scale(${1-level*.12} ${.12+level*.95}) translate(-90 -128)` : undefined} data-mouth-level={level.toFixed(2)}>
    {talking ? <><path d="M65 126Q92 120 118 126Q113 145 92 145 72 145 65 126Z" fill="#563025" strokeWidth="3.5"/><path d="M70 127H113L110 132H74Z" fill="#fff5cf" stroke="none"/></> : <path d={angry ? 'M66 134Q90 128 118 133' : trust >= 65 ? 'M67 126Q91 143 117 125' : 'M65 129Q91 132 118 128'} fill="none" strokeWidth="3.6"/>}
   </g>
   {person === 1 && <><path d="M34 115Q11 70 33 36 50 11 91 12 138 10 153 51 164 91 145 119L140 144H42Z" fill="none" stroke="#17232a" strokeWidth="17"/><path d="M34 115Q11 70 33 36 50 11 91 12 138 10 153 51 164 91 145 119L140 144H42Z" fill="none" stroke="#e9eff1" strokeWidth="10"/><path d="M39 57Q58 27 89 29" fill="none" stroke="#b6e7e3" strokeWidth="5"/><path d="M43 150H139L130 165H51Z" fill="#dde5e6"/><path d="M66 157H104" stroke="#729999"/></>}
  </g>
 </svg>;
}
