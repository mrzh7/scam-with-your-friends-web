import { Portrait } from './Portrait';
// The phone's illustrated caller is separate from the office's 3D staff.
export function CallerPortrait({ person, talking, trust, level=0 }: { person: number; talking: boolean; trust: number; level?:number }) {
 return <div className="caller-illustration"><Portrait person={person} talking={talking} level={level} trust={trust}/></div>;
}
