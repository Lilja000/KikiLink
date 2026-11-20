// Locale-independent order, shared by catalogue verification and local bookmarks.
const textOrder=(a,b)=>a<b?-1:a>b?1:0;
export function compareWorkshop(a,b,sort){
 const discovery=sort==='recommended'?Number(b.discovery?.recommended??false)-Number(a.discovery?.recommended??false)||(b.discovery?.installs??0)-(a.discovery?.installs??0):sort==='installs'?(b.discovery?.installs??0)-(a.discovery?.installs??0):0;
 const primary=sort==='title'?textOrder(a.title.toLowerCase(),b.title.toLowerCase()):sort==='rating'?(b.rating?.average??0)-(a.rating?.average??0)||(b.rating?.count??0)-(a.rating?.count??0):0;
 return discovery||primary||(b.publishedAt??b.createdAt)-(a.publishedAt??a.createdAt)||textOrder(a.id,b.id);
}
