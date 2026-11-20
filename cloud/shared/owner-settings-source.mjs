const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class OwnerSettingsGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. Your original choices and pending settings request are kept. Review the current Cloud settings before choosing again.');}
}
export function checkedOwnerSettingsSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new OwnerSettingsGenerationError();
 return structuredClone(v);
}
export function ownerSettingsSource(metadata){
 if(!object(metadata))throw new OwnerSettingsGenerationError();
 const flag=object(metadata.features)?metadata.features.ownerSettingsRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new OwnerSettingsGenerationError();
 const source=checkedOwnerSettingsSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});
 if(source.restored&&!source.required)throw new OwnerSettingsGenerationError();
 return Object.freeze(source);
}
export const sameOwnerSettingsSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireOwnerSettingsSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new OwnerSettingsGenerationError();return;}
 if(!sameOwnerSettingsSource(checkedOwnerSettingsSource(original),checkedOwnerSettingsSource(fresh))||fresh.restored&&!fresh.required)throw new OwnerSettingsGenerationError();
}
