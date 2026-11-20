const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class AccountControlGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. This account action was kept on its original source. Close it and review current account details before choosing again.');}
}
export function checkedAccountControlSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new AccountControlGenerationError();
 return structuredClone(v);
}
export function accountControlSource(metadata){
 if(!object(metadata))throw new AccountControlGenerationError();
 const flag=object(metadata.features)?metadata.features.accountControlRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new AccountControlGenerationError();
 const source=checkedAccountControlSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});
 if(source.restored&&!source.required)throw new AccountControlGenerationError();
 return Object.freeze(source);
}
export const sameAccountControlSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireAccountControlSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new AccountControlGenerationError();return;}
 if(!sameAccountControlSource(checkedAccountControlSource(original),checkedAccountControlSource(fresh))||fresh.restored&&!fresh.required)throw new AccountControlGenerationError();
}
