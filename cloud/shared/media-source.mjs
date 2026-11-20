const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class MediaGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. This image still belongs to its original draft or conversation. Its selected file is kept. Review the current conversation before choosing again.');}
}
export function checkedMediaSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new MediaGenerationError();
 return structuredClone(v);
}
export function mediaSource(metadata){
 if(!object(metadata))throw new MediaGenerationError();
 const flag=object(metadata.features)?metadata.features.mediaRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new MediaGenerationError();
 const source=checkedMediaSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});

 return Object.freeze(source);
}
export const sameMediaSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireMediaSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new MediaGenerationError();return;}
 if(!sameMediaSource(checkedMediaSource(original),checkedMediaSource(fresh)))throw new MediaGenerationError();
}
