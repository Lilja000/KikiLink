import type {CloudClient} from './client';
import {ModerationGenerationError} from './moderation-generation';

/** The identity belongs to the displayed target, never to a later submit/retry. */
export interface ReportSource {readonly generation?:string|undefined;current():boolean;}
export function captureReportSource(client:CloudClient,metadata:unknown,current:()=>boolean=()=>true):ReportSource {
 const me=metadata as {features?:{reportCreationRecoveryGeneration?:unknown};directRecovery?:{generation?:unknown;restored?:unknown}}|null;
 const flag=me?.features?.reportCreationRecoveryGeneration,raw=me?.directRecovery?.generation;
 if(flag!==undefined&&typeof flag!=='boolean'||flag===true&&(typeof raw!=='string'||!/^[a-f0-9]{32}$/u.test(raw)||typeof me?.directRecovery?.restored!=='boolean'))throw new ModerationGenerationError();
 const generation=typeof raw==='string'&&/^[a-f0-9]{32}$/u.test(raw)?raw:undefined,owner=client.memberNumber,origin=client.origin;
 return{generation,current:()=>client.connected&&client.memberNumber===owner&&client.origin===origin&&current()};
}
