const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class WorkshopGenerationError extends Error {
 constructor(){super('Workshop changed after recovery. Your original draft and request are kept. Review the current Cloud copy before starting a new action.');}
}
export function checkedWorkshopSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new WorkshopGenerationError();
 return structuredClone(v);
}
export function workshopSource(metadata){
 if(!object(metadata))throw new WorkshopGenerationError();
 const flag=object(metadata.features)?metadata.features.workshopMutationRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new WorkshopGenerationError();
 return Object.freeze(checkedWorkshopSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}}));
}
export const sameWorkshopSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireWorkshopSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new WorkshopGenerationError();return;}
 if(!sameWorkshopSource(checkedWorkshopSource(original),checkedWorkshopSource(fresh))||fresh.restored&&!fresh.required)throw new WorkshopGenerationError();
}
