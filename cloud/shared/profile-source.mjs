const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class ProfileGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. Your profile draft and original request are kept. Review the current profile before choosing again.');}
}
export function checkedProfileSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new ProfileGenerationError();
 return structuredClone(v);
}
export function profileSource(metadata){
 if(!object(metadata))throw new ProfileGenerationError();
 const flag=object(metadata.features)?metadata.features.profileRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new ProfileGenerationError();
 const source=checkedProfileSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});
 if(source.restored&&!source.required)throw new ProfileGenerationError();
 return Object.freeze(source);
}
export const sameProfileSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireProfileSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new ProfileGenerationError();return;}
 if(!sameProfileSource(checkedProfileSource(original),checkedProfileSource(fresh))||fresh.restored&&!fresh.required)throw new ProfileGenerationError();
}
