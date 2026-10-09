import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountDatabase } from './account-db';
import { readSave, writeSave } from '../worker/saves';
import { AccountSaveQueue } from '../src/game/accountSave';
import { ApiError, defaultSettings, loadAccountCache } from '../src/game/storage';
import { newGame } from '../src/game/engine';
import type { UserRow } from '../worker/auth';
describe('User-bound persistent progress',()=>{
 let database:ReturnType<typeof accountDatabase>, alice:UserRow, bob:UserRow;
 beforeEach(()=>{database=accountDatabase();for(const id of ['alice','bob'])database.sqlite.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,0,?)').run(id,id,Date.now());alice={id:'alice'} as UserRow;bob={id:'bob'} as UserRow;});
 afterEach(()=>database.sqlite.close());
 it('initializes one stable progress record per user without resetting repeated loads',async()=>{
  const first=await readSave(database.env,alice.id), again=await readSave(database.env,alice.id);
  expect(again.state).toEqual(first.state); expect(first.userId).toBe(alice.id); expect(first.revision).toBe(0);
 });
 it('persists the full game snapshot and preferences, isolated from another account',async()=>{
  const state={...newGame(42),day:3,balance:570,lifetime:1200,inventory:{repair:2},upgrades:['headset'],achievements:['buyer'],ledger:[{day:3,amount:250,balance:570,label:'Task reward'}],highlights:[],deliveries:[{id:1,item:'energy',seconds:3}],orderSerial:1};
  const result=await writeSave(database.env,alice,{userId:alice.id,state,settings:{sound:true,wallpaper:'night'},revision:0});
  expect(result.status).toBe(200); const saved=await readSave(database.env,alice.id);
  expect(saved.state).toMatchObject(state);expect(saved.settings).toEqual({sound:true,wallpaper:'night'});
  expect((await readSave(database.env,bob.id)).state.balance).toBe(80);
 });
 it('rejects a stale browser trying to save under a switched account',async()=>{
  expect((await writeSave(database.env,bob,{userId:alice.id,state:newGame(),revision:0})).status).toBe(409);
  expect((await readSave(database.env,bob.id)).state.balance).toBe(80);
 });
 it('allows only one write at a given revision and never silently overwrites newer progress',async()=>{
  await readSave(database.env,alice.id);
  const results=await Promise.all([writeSave(database.env,alice,{userId:alice.id,state:{...newGame(1),balance:100},revision:0}),writeSave(database.env,alice,{userId:alice.id,state:{...newGame(1),balance:200},revision:0})]);
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);expect((await readSave(database.env,alice.id)).revision).toBe(1);
 });
 it('rejects corrupt saves and invalid settings without changing the stored progress',async()=>{
  const before=await readSave(database.env,alice.id);
  for(const data of [{state:{...newGame(),balance:-1},revision:0},{state:newGame(),revision:-1},{state:newGame(),revision:0,settings:{sound:'yes',wallpaper:'evil'}}]) expect((await writeSave(database.env,alice,{userId:alice.id,...data})).status).toBe(400);
  expect(await readSave(database.env,alice.id)).toEqual(before);
 });
});
describe('Serialized account autosave and local recovery',()=>{
 const memory=new Map<string,string>();
 beforeEach(()=>{memory.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)});});
 afterEach(()=>vi.unstubAllGlobals());
 it('does not write clean initial progress and binds each local backup to its owner',async()=>{
  const sender=vi.fn();const queue=new AccountSaveQueue('alice',newGame(1),defaultSettings,4,false,vi.fn(),sender);
  await queue.flush();expect(sender).not.toHaveBeenCalled();expect(loadAccountCache('alice')?.state.seed).toBe(1);expect(loadAccountCache('bob')).toBeNull();
  new AccountSaveQueue('bob',newGame(2),defaultSettings,0,false,vi.fn(),sender);expect(loadAccountCache('alice')?.state.seed).toBe(1);expect(loadAccountCache('bob')?.state.seed).toBe(2);
 });
 it('keeps new progress while an older snapshot is being saved and serializes revisions',async()=>{
  let finish!:(v:{userId:string;revision:number})=>void;
  const sender=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({userId:'alice',revision:6});
  const queue=new AccountSaveQueue('alice',newGame(),defaultSettings,4,false,vi.fn(),sender);
  queue.update({...newGame(),balance:100},defaultSettings);const pending=queue.flush();
  queue.update({...newGame(),balance:200},defaultSettings);
  finish({userId:'alice',revision:5});await pending;expect(loadAccountCache('alice')?.dirty).toBe(true);expect(loadAccountCache('alice')?.state.balance).toBe(200);
  await queue.flush();expect(sender.mock.calls[0][0].revision).toBe(4);expect(sender.mock.calls[1][0].revision).toBe(5);expect(loadAccountCache('alice')?.dirty).toBe(false);
 });
 it('recovers a dirty local snapshot and retries a network failure without losing its revision',async()=>{
  const sender=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({userId:'alice',revision:4});
  const queue=new AccountSaveQueue('alice',{...newGame(),balance:400},defaultSettings,3,true,vi.fn(),sender);
  await expect(queue.flush()).rejects.toThrow('offline');expect(loadAccountCache('alice')?.dirty).toBe(true);
  await queue.flush();expect(sender.mock.calls[1][0]).toMatchObject({userId:'alice',revision:3,state:{balance:400}});expect(loadAccountCache('alice')?.dirty).toBe(false);
 });
 it('pauses conflict retries until an explicit cloud reload',async()=>{
  const notify=vi.fn(),sender=vi.fn().mockRejectedValueOnce(new ApiError('newer cloud save',409)).mockResolvedValueOnce({userId:'alice',revision:10});
  const queue=new AccountSaveQueue('alice',newGame(),defaultSettings,1,true,notify,sender);
  await expect(queue.flush()).rejects.toThrow();await expect(queue.flush()).rejects.toThrow();expect(sender).toHaveBeenCalledOnce();expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({status:'conflict'}));
  queue.replace(newGame(),defaultSettings,9);queue.update({...newGame(),balance:123},defaultSettings);await queue.flush();expect(sender.mock.calls[1][0].revision).toBe(9);
 });
 it('refuses an acknowledgement belonging to another user',async()=>{
  const queue=new AccountSaveQueue('alice',newGame(),defaultSettings,0,true,vi.fn(),async()=>({userId:'bob',revision:1}));
  await expect(queue.flush()).rejects.toThrow('账号');expect(loadAccountCache('alice')?.dirty).toBe(true);expect(loadAccountCache('bob')).toBeNull();
 });
 it('does not report success to an unmounted account after a pending save completes',async()=>{
  let finish!:(v:{userId:string;revision:number})=>void;const notify=vi.fn();
  const queue=new AccountSaveQueue('alice',newGame(),defaultSettings,0,true,notify,()=>new Promise(resolve=>{finish=resolve;}));const pending=queue.flush();queue.dispose();notify.mockClear();finish({userId:'alice',revision:1});await pending;
  expect(notify).not.toHaveBeenCalled();expect(loadAccountCache('alice')?.revision).toBe(1);
 });
});

describe('Language preferences in account storage',()=>{
 it.each(['auto','en','zh','pt','ja','es'])('persists %s with the account without exposing AI settings',async language=>{
  const db=accountDatabase();try{db.sqlite.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,0,?)').run('locale-user','Locale user',Date.now());const user={id:'locale-user'} as UserRow;
   const result=await writeSave(db.env,user,{userId:user.id,state:newGame(),revision:0,settings:{sound:false,wallpaper:'mountain',language,AI_MODEL:'injected',AI_API_KEY:'not-allowed'}});
   expect(result.status).toBe(200);expect((await readSave(db.env,user.id)).settings).toEqual({sound:false,wallpaper:'mountain',language});
  }finally{db.sqlite.close();}
 });
});

