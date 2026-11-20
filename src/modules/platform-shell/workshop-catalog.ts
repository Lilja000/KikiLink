import {compareWorkshop,type WorkshopSort} from '../../../cloud/shared/workshop-order.mjs';
import {checkedWorkshopPage,type WorkshopSummary} from './workshop-model';
export interface WorkshopCatalogPage {items:WorkshopSummary[];nextCursor:string|null;sort:WorkshopSort;scope:'browse'|'mine';collection?:'all'|'featured';}
export function checkedWorkshopCatalog(page:WorkshopCatalogPage,sort:WorkshopSort,scope:'browse'|'mine',owner:number,previous='',collection:'all'|'featured'='all'):WorkshopCatalogPage {
 if(!page||(page.collection??'all')!==collection||page.sort!==sort||page.scope!==scope||page.nextCursor!==null&&(typeof page.nextCursor!=='string'||!page.nextCursor.length||page.nextCursor.length>4096||!/^[A-Za-z0-9_-]+$/.test(page.nextCursor)||page.nextCursor===previous))throw new Error('Invalid Workshop catalogue page');
 const receivedCount=page.items?.length;checkedWorkshopPage({items:page.items,nextCursor:null},0,20,scope==='mine'?owner:undefined,scope==='browse');
 if(collection==='featured'&&page.items.some(i=>!i.discovery?.featured)||sort==='recommended'&&page.items.some(i=>typeof i.discovery?.recommended!=='boolean')||sort==='installs'&&page.items.some(i=>!i.discovery))throw new Error('Invalid Workshop discovery page');
 if(page.nextCursor&&!receivedCount||page.items.some((item,index)=>index>0&&compareWorkshop(page.items[index-1]!,item,sort)>0))throw new Error('Invalid Workshop catalogue order');
 return page;
}
