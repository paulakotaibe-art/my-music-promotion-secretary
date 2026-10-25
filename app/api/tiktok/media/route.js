import {readMediaTicket} from '../../../../lib/tiktok-media.mjs';
import {MAX_MEDIA_BYTES} from '../../../../lib/media.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
async function serve(request){
 let source;try{source=readMediaTicket(new URL(request.url).searchParams.get('ticket'));}catch{return new Response('Media access expired.',{status:403,headers:{'Cache-Control':'no-store'}});}
 const range=request.headers.get('range');if(range&&!/^bytes=\d+-\d*$/.test(range))return new Response(null,{status:416});
 try{const r=await fetch(source,{method:request.method==='HEAD'?'HEAD':'GET',headers:range?{Range:range}:{},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(50000)}),length=Number(r.headers.get('content-length'));
  if(![200,206].includes(r.status)||!length||length>MAX_MEDIA_BYTES||!r.headers.get('content-type')?.startsWith('video/mp4'))return new Response(null,{status:502});
  const headers={'Content-Type':'video/mp4','Content-Length':String(length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Referrer-Policy':'no-referrer'};if(r.headers.get('content-range'))headers['Content-Range']=r.headers.get('content-range');return new Response(request.method==='HEAD'?null:r.body,{status:r.status,headers});
 }catch{return new Response(null,{status:502,headers:{'Cache-Control':'no-store'}});}
}
export const GET=serve;export const HEAD=serve;
