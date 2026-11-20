import {scopePersistenceName} from '../core/storage-scope';
import {readStoredZip} from '../utils/read-stored-zip';
import {deviceDataDigest as restorePointDigest} from './device-data-digest';
export {restorePointDigest};

export const RESTORE_POINT_COUNT=5,RESTORE_POINT_TOTAL=1024*1024*1024,RESTORE_POINT_ARCHIVE=512*1024*1024,RESTORE_POINT_OPERATIONS=32;
export const RESTORE_ACTIONS=['settings','chat','chat-attachments','chat-files','gallery','music','sounds','sound-choices','feed','thread-history'] as const;
export type RestoreAction=typeof RESTORE_ACTIONS[number];
export interface RestoreOperation {id:number;action:RestoreAction;state:'pending'|'complete'|'uncertain';startedAt:number;finishedAt:number|null}
export interface DeviceRestorePoint {format:1;id:string;owner:number;createdAt:number;version:string;before:Blob;source:Blob;beforeHash:string;sourceHash:string;bytes:number;operations:RestoreOperation[]}
export type RestorePointInfo=Omit<DeviceRestorePoint,'before'|'source'>;
export type RestorePointToken=Pick<DeviceRestorePoint,'id'|'beforeHash'|'sourceHash'>;
export type DeviceImportCheckpoint=<T>(action:RestoreAction,current:()=>boolean,signal:AbortSignal,apply:(current:()=>boolean)=>Promise<T>|T)=>Promise<T>;
export function awaitRestorePoint<T>(task:Promise<T>,signal:AbortSignal):Promise<T> {
 return new Promise((resolve,reject)=>{let settled=false;const abort=()=>finish(new Error('Restore point capture cancelled or timed out.'));
  const finish=(error?:unknown,value?:T)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);error?reject(error):resolve(value!);};
  signal.addEventListener('abort',abort,{once:true});task.then(value=>finish(undefined,value),error=>finish(error??new Error('Restore point capture failed.')));if(signal.aborted)abort();
 });
}
const need=(value:unknown)=>{if(!value)throw new Error('Saved restore points are unsupported or inconsistent. No copy was replaced.');};
const time=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>0&&Number(value)<=8640000000000000;
export function restorePointDatabaseName(owner:number):string {need(Number.isSafeInteger(owner)&&owner>0);return scopePersistenceName(`kikilink-device-restore-points-${owner}`);}
export const restorePointLockName=(owner:number):string=>restorePointDatabaseName(owner)+':import';
export function checkRestorePoint(value:unknown,owner:number):asserts value is DeviceRestorePoint {
 const p=value as DeviceRestorePoint;need(p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length===11&&p.format===1&&p.owner===owner);
 need(typeof p.id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(p.id)&&time(p.createdAt)&&typeof p.version==='string'&&p.version.length>0&&p.version.length<=256);
 need(p.before instanceof Blob&&p.source instanceof Blob&&p.before.size>0&&p.source.size>0&&p.before.size<=RESTORE_POINT_ARCHIVE&&p.source.size<=RESTORE_POINT_ARCHIVE&&p.bytes===p.before.size+p.source.size);
 need(typeof p.beforeHash==='string'&&/^[a-f0-9]{64}$/.test(p.beforeHash)&&typeof p.sourceHash==='string'&&/^[a-f0-9]{64}$/.test(p.sourceHash));
 need(Array.isArray(p.operations)&&p.operations.length<=RESTORE_POINT_OPERATIONS);
 for(const [i,op]of p.operations.entries())need(op&&Object.keys(op).length===5&&op.id===i+1&&RESTORE_ACTIONS.includes(op.action)&&['pending','complete','uncertain'].includes(op.state)&&time(op.startedAt)&&op.startedAt>=p.createdAt&&
  (op.state==='pending'?op.finishedAt===null:time(op.finishedAt)&&op.finishedAt!>=op.startedAt));
}
export function restorePointInfo(p:DeviceRestorePoint):RestorePointInfo {const {before:_b,source:_s,...info}=p;return {...info,operations:info.operations.map(op=>({...op}))};}
export function sameRestorePoint(p:RestorePointToken,token:RestorePointToken):boolean {return p.id===token.id&&p.beforeHash===token.beforeHash&&p.sourceHash===token.sourceHash;}
/** Ignore capture timestamps; compare all exact account/database/binary payloads of checked ZIPs. */
export async function restorePointPayloadDigest(blob:Blob,check:()=>void):Promise<string> {
 const entries=await readStoredZip(blob,check),payload:Array<[string,number,string]>=[];
 for(const [name,entry]of [...entries].sort(([a],[b])=>a<b?-1:a>b?1:0))if(name!=='manifest.json'&&name!=='README.txt')payload.push([name,entry.blob.size,await restorePointDigest(entry.blob,check)]);
 return restorePointDigest(new Blob([JSON.stringify(payload)]),check);
}
