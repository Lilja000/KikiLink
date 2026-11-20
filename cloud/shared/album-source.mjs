const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=v=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class AlbumGenerationError extends Error {
 constructor(){super('Cloud changed after recovery. Your album draft and original request are kept. Review the current collection before choosing again.');}
}
export function checkedAlbumSource(v){
 if(!object(v)||Object.keys(v).some(k=>!['required','generation','restored'].includes(k))||typeof v.required!=='boolean'||v.generation!==undefined&&!generation(v.generation)||v.restored!==undefined&&typeof v.restored!=='boolean'||v.required&&(!generation(v.generation)||typeof v.restored!=='boolean'))throw new AlbumGenerationError();
 return structuredClone(v);
}
export function albumSource(metadata){
 if(!object(metadata))throw new AlbumGenerationError();
 const flag=object(metadata.features)?metadata.features.albumRecoveryGeneration:undefined,r=metadata.directRecovery;
 if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new AlbumGenerationError();
 const source=checkedAlbumSource({required:flag===true,...object(r)?{generation:r.generation,restored:r.restored}:{}});
 if(source.restored&&!source.required)throw new AlbumGenerationError();
 return Object.freeze(source);
}
export const sameAlbumSource=(a,b)=>!!a&&!!b&&a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;
export function requireAlbumSource(original,fresh){
 if(!original){if(fresh.required||fresh.restored)throw new AlbumGenerationError();return;}
 if(!sameAlbumSource(checkedAlbumSource(original),checkedAlbumSource(fresh))||fresh.restored&&!fresh.required)throw new AlbumGenerationError();
}
