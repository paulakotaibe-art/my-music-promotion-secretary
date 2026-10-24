import {createHmac} from 'node:crypto';
export const FACEBOOK_PILOT_OWNER='d933f707-f948-410d-b107-9ba32b37274c';
export function requireFacebookOwner(user){if(user?.id!==FACEBOOK_PILOT_OWNER)throw Error('Facebook publishing is currently limited to the owner pilot.');}
export function facebookTestMetadata(draft,body){
 if(body.mode!=='unpublished' || body.confirmed!==true || body.rightsConfirmed!==true)throw Error('Confirm an unpublished test and your publishing rights.');
 if(!draft.title?.trim() || draft.title.length>100 || !draft.caption?.trim() || draft.caption.length>5000)throw Error('Use a title up to 100 characters and a caption up to 5,000 characters.');
 return {title:draft.title.trim(),description:draft.caption,published:'false'};
}
export function selectedFacebookPage(connection){
 const p=connection.pages?.find(p=>p.id===connection.selectedPage?.id);
 if(!p || !/^\d+$/.test(p.id) || !p.access_token)throw Error('Connect Facebook and select your Page first.');
 return p;
}
export function facebookCall(page,env=process.env,request=fetch,signal=AbortSignal.timeout(35000)){
 const version=env.FACEBOOK_API_VERSION,secret=env.FACEBOOK_APP_SECRET;
 if(!/^v\d+\.\d+$/.test(version||'') || !secret)throw Error('Facebook publishing is not configured.');
 const proof=createHmac('sha256',secret).update(page.access_token).digest('hex');
 return async(path,options={})=>{
  if(!/^\/\d+(?:\/videos)?$/.test(path))throw Error('Invalid Facebook destination.');
  const url=new URL('https://graph.facebook.com/'+version+path);
  for(const [k,v]of Object.entries(options.query||{}))url.searchParams.set(k,v);
  url.searchParams.set('appsecret_proof',proof);
  const r=await request(url.href,{method:options.body?'POST':'GET',headers:{Authorization:'Bearer '+page.access_token,...(options.body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(options.body?{body:new URLSearchParams(options.body)}:{}),cache:'no-store',redirect:'error',signal});
  const d=await r.json().catch(()=>null);
  if(!r.ok || !d || d.error){const e=Error('Facebook could not confirm this request. Refresh status or reconnect if access expired.');e.providerCode=Number.isInteger(d?.error?.code)?d.error.code:undefined;throw e;}
  return d;
 };
}
export async function uploadFacebookTest(call,pageId,mediaUrl,metadata){
 // One submission only: never automatically retry an uncertain provider write.
 if(metadata.published!=='false')throw Error('Only unpublished tests are enabled.');
 const d=await call('/'+pageId+'/videos',{body:{...metadata,file_url:mediaUrl}});
 if(!/^\d+$/.test(d.id||''))throw Error('Facebook did not return a video identifier. Check Business Suite before retrying.');
 return d.id;
}
export function describeFacebookVideo(video,pageId){
 if(!/^\d+$/.test(video?.id||'') || video.from?.id!==pageId)throw Error('The video Page could not be verified.');
 const status=video.status?.video_status,failed=status==='error';
 return {videoId:video.id,url:'https://www.facebook.com/watch/?v='+video.id,processingStatus:['ready','processing','error'].includes(status)?status:'unknown',processed:status==='ready',failed,published:typeof video.published==='boolean'?video.published:null,verified:video.published===false&&!failed};
}
