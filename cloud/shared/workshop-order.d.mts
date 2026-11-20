export type WorkshopSort='newest'|'rating'|'title'|'recommended'|'installs';
export interface WorkshopOrderKey {discovery?:{installs:number;featured:boolean;featuredUntil:number|null;recommended?:boolean};id:string;title:string;createdAt:number;publishedAt:number|null;rating?:{count:number;average:number|null};}
export function compareWorkshop(a:WorkshopOrderKey,b:WorkshopOrderKey,sort:WorkshopSort):number;
