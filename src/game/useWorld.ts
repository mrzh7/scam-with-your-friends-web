import { useCallback, useEffect, useRef, useState } from 'react';
import { makeWorld, addActor, stepWorld, setInput, interactWorld, syncDeliveries, type Input, type WorldCommand, type World } from './world';
import type { GameState } from './engine';
import type { RoomClient } from './useRoom';
const fresh = () => { const w = makeWorld(); addActor(w, 'local', '实习生', 0); return w; };
export function useWorld(network: RoomClient, game: GameState, setGame: (g: GameState) => void, active: boolean) {
 const local = useRef<World>(fresh()), gameRef = useRef(game), networkRef = useRef(network), setter = useRef(setGame), sequence = useRef(0);
 gameRef.current = game; networkRef.current = network; setter.current = setGame;
 const [snapshot, setSnapshot] = useState<World>(local.current), [hint, setHint] = useState('');
 useEffect(() => { if (network.room) return; syncDeliveries(local.current, 'local', game); setSnapshot(structuredClone(local.current)); }, [game, network.room?.code]);
 useEffect(() => { if (network.room || !active) return; let previous = performance.now(), count = 0; const timer = setInterval(() => { const now = performance.now(); if (!document.hidden) stepWorld(local.current, (now - previous) / 1000); previous = now; if (++count % 3 === 0) setSnapshot(structuredClone(local.current)); }, 20); return () => clearInterval(timer); }, [network.room?.code, active]);
 const input = useCallback((value: Input) => { const n = networkRef.current; const self = n.room?.world.actors[n.room.self]; sequence.current = Math.max(sequence.current, self?.input.seq || 0) + 1; const v = { ...value, seq: sequence.current }; if (n.room) n.move(v); else setInput(local.current, 'local', v); }, []);
 const command = useCallback((command: WorldCommand) => { const n = networkRef.current; if (n.room) { n.worldCommand(command); return; } const result = interactWorld(local.current, 'local', command, gameRef.current); if (result.game !== gameRef.current) { gameRef.current = result.game; setter.current(result.game); } if (result.message) { setHint(''); queueMicrotask(() => setHint(result.message)); } setSnapshot(structuredClone(local.current)); }, []);
 const speech = useCallback((level: number) => { const n=networkRef.current; if(n.room){n.phoneSpeech(level);return;} const actor=local.current.actors.local; if(actor){actor.phoneTalking=level;actor.phoneTalkingUntil=local.current.time+.6;} }, []);
 const reset = useCallback(() => { local.current = fresh(); sequence.current = 0; setSnapshot(structuredClone(local.current)); }, []);
 const world = network.room?.world || snapshot, selfId = network.room?.self || 'local';
 return { world, selfId, actor: world.actors[selfId], input, command, speech, reset, hint: network.hint || hint };
}
