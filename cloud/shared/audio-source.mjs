const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class AudioGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. This audio action still belongs to the original library or conversation. Refresh and review current audio before choosing again.');}
}
export function checkedAudioSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new AudioGenerationError();
 return structuredClone(v);
}
export function audioSource(metadata){
 if(!object(metadata))throw new AudioGenerationError();
 const flag=object(metadata.features)?metadata.features.audioRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new AudioGenerationError();
 const source=checkedAudioSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});
 if(source.restored&&!source.required)throw new AudioGenerationError();
 return Object.freeze(source);
}
export const sameAudioSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireAudioSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new AudioGenerationError();return;}
 if(!sameAudioSource(checkedAudioSource(original),checkedAudioSource(fresh))||fresh.restored&&!fresh.required)throw new AudioGenerationError();
}
