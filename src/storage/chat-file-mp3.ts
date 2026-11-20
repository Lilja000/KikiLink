/** Browser equivalent of Cloud's MP3 frame validation; preserves the original bytes. */
export function inspectChatMp3(input:Uint8Array):number {
 const need=(ok:unknown)=>{if(!ok)throw new Error('The saved audio is not a complete supported MP3.');};
 const text=(offset:number)=>String.fromCharCode(...input.subarray(offset,offset+3));
 let start=0,end=input.length;
 if(text(0)==='ID3'){
  need(input.length>=10&&[2,3,4].includes(input[3]!)&&input[4]!==255);const version=input[3]!,flags=input[5]!;
  need((flags&(version===2?0x3f:version===3?0x1f:0x0f))===0);let length=0;
  for(const byte of input.subarray(6,10)){need(byte<128);length=length*128+byte;}start=10+length;
  if(version===4&&(flags&0x10)){need(text(start)==='3DI');start+=10;}need(start<=end);
 }
 if(end-start>=128&&text(end-128)==='TAG')end-=128;
 const high=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],low=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
 let offset=start,frames=0,duration=0,format='';
 while(offset<end){
  need(offset+4<=end);const a=input[offset]!,b=input[offset+1]!,c=input[offset+2]!,d=input[offset+3]!;
  const version=(b>>3)&3,layer=(b>>1)&3,rate=c>>4,sample=(c>>2)&3;
  need(a===255&&(b&0xe0)===0xe0&&version!==1&&layer===1&&rate>0&&rate<15&&sample<3&&(d&3)!==2);
  const hz=[44100,48000,32000][sample]!/(version===3?1:version===2?2:4),signature=`${version}:${hz}`;
  need(!format||format===signature);format=signature;
  const bytes=Math.floor((version===3?144000:72000)*(version===3?high:low)[rate]!/hz)+((c>>1)&1);
  need(bytes>=24&&offset+bytes<=end);offset+=bytes;frames++;duration+=(version===3?1152:576)/hz;
 }
 need(frames>=2&&offset===end);return Math.max(1,Math.round(duration*1000));
}
